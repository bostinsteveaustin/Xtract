"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent, auditActions } from "@/lib/api/audit";
import {
  canOrgBindRig,
  isMajorBump,
  listBindableVersions,
  loadWorkspaceForOrg,
} from "@/lib/api/rig-binding";

/**
 * Server actions for E-08 §4.6 Rig binding + version upgrade on workspaces.
 *
 * These run under admin client (service role) so they bypass RLS — every
 * action therefore re-checks that the caller has an active org, and that the
 * target workspace belongs to that org. Binding-time gating (entitlement,
 * draft/deprecated checks) is additionally enforced at the DB trigger in
 * migration 024 as defence in depth.
 */

export interface BindRigInput {
  workflowId: string;
  rigId: string;
  rigVersion: string;
  /**
   * Required when upgrading across a major version bump (§4.6). The UI
   * presents an explicit confirmation step and then re-calls with this flag.
   */
  acknowledgeMajorBump?: boolean;
}

export type BindRigResult =
  | { ok: true }
  | { ok: false; error: string; code?: "MAJOR_BUMP_REQUIRES_ACK" };

/**
 * Bind a Rig version to a workspace, or change the pinned version.
 *
 * Rules:
 *   - Workspace must belong to the caller's active org.
 *   - Org must have an active entitlement for Published Rigs (or own the Rig
 *     for Organisation-tier).
 *   - Version must exist and not be draft or out-of-window deprecated.
 *   - Changing to a different Rig resets the pinned version; changing version
 *     across a major bump requires acknowledgeMajorBump.
 *   - Every change writes an audit row (workspace.rig_bound or .rig_upgraded).
 */
export async function bindWorkspaceRig(
  input: BindRigInput
): Promise<BindRigResult> {
  const auth = await requireAuth();
  if (auth.error) return { ok: false, error: "Unauthorized" };
  if (!auth.activeOrgId) {
    return { ok: false, error: "No active organisation" };
  }

  const admin = createAdminClient();

  const workspace = await loadWorkspaceForOrg(
    admin,
    input.workflowId,
    auth.activeOrgId
  );
  if (!workspace) {
    return { ok: false, error: "Workspace not found" };
  }

  const permission = await canOrgBindRig(admin, auth.activeOrgId, input.rigId);
  if (!permission.ok) {
    return { ok: false, error: permission.reason };
  }

  const bindable = await listBindableVersions(admin, input.rigId);
  const chosen = bindable.find((v) => v.version === input.rigVersion);
  if (!chosen) {
    return {
      ok: false,
      error: `Version ${input.rigVersion} is not bindable (draft, unknown, or past its deprecation window)`,
    };
  }

  // Major-bump guard only applies when the same Rig is being re-pinned. A
  // Rig swap (different rigId) is effectively a brand-new binding and
  // doesn't need the "cross-major" friction.
  const sameRig =
    workspace.boundRigId === input.rigId &&
    workspace.boundRigVersion != null;
  const major =
    sameRig &&
    workspace.boundRigVersion &&
    isMajorBump(workspace.boundRigVersion, input.rigVersion);

  if (major && !input.acknowledgeMajorBump) {
    return {
      ok: false,
      error:
        "Upgrading across a major version changes output characteristics. Confirm to continue.",
      code: "MAJOR_BUMP_REQUIRES_ACK",
    };
  }

  const { error: updateErr } = await admin
    .from("workflows")
    .update({
      bound_rig_id: input.rigId,
      bound_rig_version: input.rigVersion,
      bound_at: new Date().toISOString(),
      bound_by_user_id: auth.user.id,
    })
    .eq("id", workspace.workflowId);
  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  const isUpgrade = sameRig;
  await writeAuditEvent({
    action: isUpgrade
      ? auditActions.WORKSPACE_RIG_UPGRADED
      : auditActions.WORKSPACE_RIG_BOUND,
    resourceType: "workflow",
    resourceId: workspace.workflowId,
    targetOrganizationId: auth.activeOrgId,
    payload: {
      rig_id: input.rigId,
      rig_slug: permission.rig.slug,
      rig_tier: permission.rig.tier,
      previous_rig_id: workspace.boundRigId,
      previous_rig_version: workspace.boundRigVersion,
      new_rig_version: input.rigVersion,
      rig_version_state: chosen.state,
      major_bump: major === true,
    },
  });

  revalidatePath(`/workflows/${workspace.workflowId}`);
  return { ok: true };
}

/** Clear the Rig binding on a workspace. Rare; used when a Rig is retired. */
export async function unbindWorkspaceRig(
  workflowId: string
): Promise<BindRigResult> {
  const auth = await requireAuth();
  if (auth.error) return { ok: false, error: "Unauthorized" };
  if (!auth.activeOrgId) {
    return { ok: false, error: "No active organisation" };
  }

  const admin = createAdminClient();
  const workspace = await loadWorkspaceForOrg(
    admin,
    workflowId,
    auth.activeOrgId
  );
  if (!workspace) return { ok: false, error: "Workspace not found" };
  if (!workspace.boundRigId) return { ok: true }; // idempotent

  const { error } = await admin
    .from("workflows")
    .update({
      bound_rig_id: null,
      bound_rig_version: null,
      bound_at: null,
      bound_by_user_id: null,
    })
    .eq("id", workflowId);
  if (error) return { ok: false, error: error.message };

  await writeAuditEvent({
    action: auditActions.WORKSPACE_RIG_UNBOUND,
    resourceType: "workflow",
    resourceId: workflowId,
    targetOrganizationId: auth.activeOrgId,
    payload: {
      previous_rig_id: workspace.boundRigId,
      previous_rig_version: workspace.boundRigVersion,
    },
  });

  revalidatePath(`/workflows/${workflowId}`);
  return { ok: true };
}

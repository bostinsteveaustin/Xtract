"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent, auditActions } from "@/lib/api/audit";

/**
 * Server actions for platform-admin Rig authoring.
 *
 * RLS enforces write authority, but these actions run under the admin client
 * (service role) so we re-check requirePlatformAdmin() at the top of each.
 * Otherwise a maliciously-crafted form post from a support-tier user could
 * write via the admin client.
 */

const SLUG_RE = /^[a-z0-9-]+$/;
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const CATEGORIES = [
  "contract_intelligence",
  "controls_extraction",
  "ontology_building",
  "qa_review",
  "custom",
] as const;
const PIPELINE_PATTERNS = [
  "single_pass",
  "chunked",
  "verified",
  "reconciled",
  "composite",
] as const;

type Category = (typeof CATEGORIES)[number];
type PipelinePattern = (typeof PIPELINE_PATTERNS)[number];

/** Create a new Published Rig + initial 0.1.0 draft version. */
export async function createPublishedRig(formData: FormData): Promise<void> {
  const auth = await requirePlatformAdmin();
  if (auth.error) throw new Error("Unauthorized");

  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as Category;
  const pipelinePattern = String(
    formData.get("pipeline_pattern") ?? ""
  ) as PipelinePattern;
  const methodology = String(formData.get("methodology_statement") ?? "").trim();

  if (!slug || !SLUG_RE.test(slug)) {
    throw new Error("Slug must be lowercase letters, digits, and dashes.");
  }
  if (!name) throw new Error("Name is required.");
  if (!CATEGORIES.includes(category)) {
    throw new Error("Invalid category.");
  }
  if (!PIPELINE_PATTERNS.includes(pipelinePattern)) {
    throw new Error("Invalid pipeline pattern.");
  }

  const admin = createAdminClient();

  const { data: rig, error: rigErr } = await admin
    .from("rigs")
    .insert({
      tier: "published",
      organization_id: null,
      slug,
      name,
      category,
      current_state: "draft",
      current_version: "0.1.0",
      created_by_user_id: auth.user.id,
    })
    .select("id, slug")
    .single();
  if (rigErr || !rig) {
    throw new Error(rigErr?.message ?? "Failed to create rig");
  }

  const { error: versionErr } = await admin.from("rig_versions").insert({
    rig_id: rig.id,
    version: "0.1.0",
    state: "draft",
    pipeline_pattern: pipelinePattern,
    methodology_statement: methodology,
  });
  if (versionErr) {
    // Roll back the rig so we don't leave an orphaned row.
    await admin.from("rigs").delete().eq("id", rig.id);
    throw new Error(versionErr.message);
  }

  await writeAuditEvent({
    action: auditActions.RIG_CREATED,
    resourceType: "rig",
    resourceId: rig.id,
    targetOrganizationId: null,
    payload: { slug, name, category, tier: "published" },
  });
  await writeAuditEvent({
    action: auditActions.RIG_VERSION_CREATED,
    resourceType: "rig_version",
    resourceId: rig.id,
    targetOrganizationId: null,
    payload: { rig_id: rig.id, version: "0.1.0", state: "draft" },
  });

  revalidatePath("/admin/rigs");
  redirect(`/admin/rigs/${rig.slug}`);
}

/** Add a new draft version to an existing rig, bumping current_version. */
export async function createRigVersion(
  rigId: string,
  formData: FormData
): Promise<void> {
  const auth = await requirePlatformAdmin();
  if (auth.error) throw new Error("Unauthorized");

  const version = String(formData.get("version") ?? "").trim();
  const pipelinePattern = String(
    formData.get("pipeline_pattern") ?? ""
  ) as PipelinePattern;
  const methodology = String(formData.get("methodology_statement") ?? "").trim();

  if (!SEMVER_RE.test(version)) {
    throw new Error("Version must be semver (e.g. 1.2.0).");
  }
  if (!PIPELINE_PATTERNS.includes(pipelinePattern)) {
    throw new Error("Invalid pipeline pattern.");
  }

  const admin = createAdminClient();

  const { data: rig } = await admin
    .from("rigs")
    .select("id, slug, tier, organization_id")
    .eq("id", rigId)
    .single();
  if (!rig) throw new Error("Rig not found");

  const { error: vErr } = await admin.from("rig_versions").insert({
    rig_id: rig.id,
    version,
    state: "draft",
    pipeline_pattern: pipelinePattern,
    methodology_statement: methodology,
  });
  if (vErr) throw new Error(vErr.message);

  await writeAuditEvent({
    action: auditActions.RIG_VERSION_CREATED,
    resourceType: "rig_version",
    resourceId: rig.id,
    targetOrganizationId: rig.organization_id,
    payload: { rig_id: rig.id, version, state: "draft" },
  });

  revalidatePath(`/admin/rigs/${rig.slug}`);
}

/**
 * Promote a rig_version through the state machine. The DB trigger
 * rig_versions_state_machine enforces legality — we just supply the target
 * state and update the parent rig's current_state/current_version shortcut.
 */
export async function transitionRigVersionState(
  rigVersionId: string,
  target: "experimental" | "validated" | "deprecated"
): Promise<void> {
  const auth = await requirePlatformAdmin();
  if (auth.error) throw new Error("Unauthorized");

  const admin = createAdminClient();

  const { data: v } = await admin
    .from("rig_versions")
    .select("id, rig_id, version, state, released_at")
    .eq("id", rigVersionId)
    .single();
  if (!v) throw new Error("Version not found");

  // Build the update patch. Coherence constraints on the table require
  // released_at be set on any non-draft state, and deprecated_at/window
  // be set on 'deprecated'.
  const patch: Record<string, unknown> = { state: target };
  if (target === "experimental" || target === "validated") {
    if (!v.released_at) {
      patch.released_at = new Date().toISOString();
      patch.released_by_user_id = auth.user.id;
    }
  }
  if (target === "deprecated") {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 90 * 24 * 60 * 60_000); // 90-day deprecation window
    patch.deprecated_at = now.toISOString();
    patch.deprecation_window_ends_at = windowEnd.toISOString();
    if (!v.released_at) {
      patch.released_at = now.toISOString();
      patch.released_by_user_id = auth.user.id;
    }
  }

  const { error: vErr } = await admin
    .from("rig_versions")
    .update(patch)
    .eq("id", v.id);
  if (vErr) throw new Error(vErr.message);

  // Update the parent rig's denormalised shortcut.
  const { data: rig } = await admin
    .from("rigs")
    .select("id, slug, organization_id, current_version")
    .eq("id", v.rig_id)
    .single();
  if (rig) {
    const rigPatch: Record<string, unknown> = { current_state: target };
    if (target === "experimental" || target === "validated") {
      rigPatch.current_version = v.version;
    }
    await admin.from("rigs").update(rigPatch).eq("id", rig.id);
  }

  const actionMap = {
    experimental: auditActions.RIG_VERSION_RELEASED,
    validated: auditActions.RIG_VERSION_VALIDATED,
    deprecated: auditActions.RIG_VERSION_DEPRECATED,
  } as const;
  await writeAuditEvent({
    action: actionMap[target],
    resourceType: "rig_version",
    resourceId: v.id,
    targetOrganizationId: rig?.organization_id ?? null,
    payload: { rig_id: v.rig_id, version: v.version, state: target },
  });

  if (rig) revalidatePath(`/admin/rigs/${rig.slug}`);
}

/** Attach a calibration evidence artefact to a version. */
export async function attachCalibrationEvidence(
  rigVersionId: string,
  evidenceType:
    | "noise_floor"
    | "repeatability"
    | "factorial_design"
    | "domain_test",
  payload: Record<string, unknown>
): Promise<void> {
  const auth = await requirePlatformAdmin();
  if (auth.error) throw new Error("Unauthorized");

  const admin = createAdminClient();

  const { data: v } = await admin
    .from("rig_versions")
    .select("id, rig_id")
    .eq("id", rigVersionId)
    .single();
  if (!v) throw new Error("Version not found");

  const { data: ev, error } = await admin
    .from("calibration_evidence")
    .insert({
      rig_version_id: v.id,
      evidence_type: evidenceType,
      payload: payload as never,
      attached_by_user_id: auth.user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Point the version at the most recently attached evidence row.
  if (ev) {
    await admin
      .from("rig_versions")
      .update({ calibration_evidence_id: ev.id })
      .eq("id", v.id);
  }

  const { data: rig } = await admin
    .from("rigs")
    .select("slug, organization_id")
    .eq("id", v.rig_id)
    .single();

  await writeAuditEvent({
    action: auditActions.CALIBRATION_EVIDENCE_ATTACHED,
    resourceType: "calibration_evidence",
    resourceId: ev?.id ?? null,
    targetOrganizationId: rig?.organization_id ?? null,
    payload: { rig_version_id: v.id, evidence_type: evidenceType },
  });

  if (rig) revalidatePath(`/admin/rigs/${rig.slug}`);
}

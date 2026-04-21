/**
 * Shared helpers for E-08 §4.6 Rig binding on workspaces.
 *
 * The DB `workflows` table is Xtract's E-08 workspace (the engagement
 * container — the DB `workspaces` table is a pre-E-08 placeholder). Every
 * helper here operates on a `workflows.id`.
 *
 * Binding gating is enforced in two places:
 *   1. Migration 024 trigger — defence in depth against a direct SQL write
 *      ever producing a bind to a draft / out-of-window / non-entitled Rig.
 *   2. These helpers — surface friendly errors early and apply the
 *      "cross-major upgrades require explicit confirmation" rule from §4.6.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorkspaceBinding {
  workflowId: string;
  organizationId: string;
  boundRigId: string | null;
  boundRigVersion: string | null;
}

export interface RigSummary {
  id: string;
  slug: string;
  name: string;
  tier: "published" | "organisation";
  organizationId: string | null;
}

export interface RigVersionSummary {
  id: string;
  rigId: string;
  version: string;
  state: "draft" | "experimental" | "validated" | "deprecated";
  deprecationWindowEndsAt: string | null;
}

export function parseSemver(v: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function isMajorBump(from: string, to: string): boolean {
  const f = parseSemver(from);
  const t = parseSemver(to);
  if (!f || !t) return false;
  return t[0] > f[0];
}

/**
 * Sort semver strings ascending. Stable and total for valid semver inputs.
 * Invalid strings sort after valid ones so UI code can display them last
 * rather than throwing.
 */
export function compareSemver(a: string, b: string): number {
  const x = parseSemver(a);
  const y = parseSemver(b);
  if (!x && !y) return a.localeCompare(b);
  if (!x) return 1;
  if (!y) return -1;
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] - y[i];
  }
  return 0;
}

/**
 * Fetch an org's bindable version list for a Rig — excludes draft, includes
 * deprecated only when still within its window. Uses admin-client so RLS
 * doesn't filter out rows for legitimate callers; caller is expected to have
 * already authorised the action.
 */
export async function listBindableVersions(
  admin: SupabaseClient,
  rigId: string,
  now: Date = new Date()
): Promise<RigVersionSummary[]> {
  const { data } = await admin
    .from("rig_versions")
    .select("id, rig_id, version, state, deprecation_window_ends_at")
    .eq("rig_id", rigId)
    .neq("state", "draft");

  const rows = (data ?? []) as Array<{
    id: string;
    rig_id: string;
    version: string;
    state: RigVersionSummary["state"];
    deprecation_window_ends_at: string | null;
  }>;

  return rows
    .filter((r) => {
      if (r.state !== "deprecated") return true;
      if (!r.deprecation_window_ends_at) return false;
      return new Date(r.deprecation_window_ends_at) >= now;
    })
    .map((r) => ({
      id: r.id,
      rigId: r.rig_id,
      version: r.version,
      state: r.state,
      deprecationWindowEndsAt: r.deprecation_window_ends_at,
    }))
    .sort((a, b) => compareSemver(b.version, a.version));
}

/**
 * Resolve the Rig pin on a workspace at Run time. Read-only; returns null
 * if the workspace has no binding yet (legacy workspaces pre-E-08).
 *
 * Callers should include `{ rig_id, rig_version }` on every Run insert so the
 * DB trigger in migration 025 can validate and auto-stamp is_experimental.
 */
export async function resolveWorkspaceRigPin(
  admin: SupabaseClient,
  workflowId: string
): Promise<{ rigId: string; rigVersion: string } | null> {
  const { data } = await admin
    .from("workflows")
    .select("bound_rig_id, bound_rig_version")
    .eq("id", workflowId)
    .maybeSingle();
  if (!data?.bound_rig_id || !data?.bound_rig_version) return null;
  return {
    rigId: data.bound_rig_id,
    rigVersion: data.bound_rig_version,
  };
}

/**
 * Resolve the workspace + check the caller's active org matches. Returns null
 * when the workflow does not belong to the active org (callers should 404).
 */
export async function loadWorkspaceForOrg(
  admin: SupabaseClient,
  workflowId: string,
  activeOrgId: string
): Promise<WorkspaceBinding | null> {
  const { data } = await admin
    .from("workflows")
    .select("id, organization_id, bound_rig_id, bound_rig_version")
    .eq("id", workflowId)
    .maybeSingle();
  if (!data) return null;
  if (data.organization_id !== activeOrgId) return null;
  return {
    workflowId: data.id,
    organizationId: data.organization_id,
    boundRigId: data.bound_rig_id,
    boundRigVersion: data.bound_rig_version,
  };
}

/**
 * Confirm that the caller's org is allowed to bind this Rig:
 *   - Organisation Rig: must be owned by the caller's org.
 *   - Published Rig:    org must hold an active entitlement.
 */
export async function canOrgBindRig(
  admin: SupabaseClient,
  orgId: string,
  rigId: string
): Promise<{ ok: true; rig: RigSummary } | { ok: false; reason: string }> {
  const { data: rig } = await admin
    .from("rigs")
    .select("id, slug, name, tier, organization_id")
    .eq("id", rigId)
    .maybeSingle();
  if (!rig) return { ok: false, reason: "Rig not found" };

  const summary: RigSummary = {
    id: rig.id,
    slug: rig.slug,
    name: rig.name,
    tier: rig.tier,
    organizationId: rig.organization_id,
  };

  if (rig.tier === "organisation") {
    if (rig.organization_id !== orgId) {
      return { ok: false, reason: "Organisation Rig is not owned by your organisation" };
    }
    return { ok: true, rig: summary };
  }

  // Published tier
  const { data: entitlement } = await admin
    .from("rig_entitlements")
    .select("id")
    .eq("organization_id", orgId)
    .eq("rig_id", rigId)
    .is("revoked_at", null)
    .maybeSingle();
  if (!entitlement) {
    return {
      ok: false,
      reason: "Organisation has no active entitlement for this Published Rig",
    };
  }
  return { ok: true, rig: summary };
}

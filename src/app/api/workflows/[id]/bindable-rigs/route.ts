/**
 * GET /api/workflows/[id]/bindable-rigs
 *
 * Returns every Rig the active organisation can bind to this workspace:
 *   - Published Rigs for which the org holds an active rig_entitlement
 *   - Organisation-tier Rigs owned by the active org
 *
 * For each Rig, it also returns the list of bindable versions (excludes
 * draft; excludes deprecated past its window). Used by the workspace
 * binding UI.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/auth";
import {
  compareSemver,
  listBindableVersions,
} from "@/lib/api/rig-binding";

interface BindableRigVersion {
  id: string;
  version: string;
  state: "experimental" | "validated" | "deprecated";
  deprecation_window_ends_at: string | null;
}

interface BindableRig {
  id: string;
  slug: string;
  name: string;
  tier: "published" | "organisation";
  category: string;
  current_state: string;
  current_version: string;
  versions: BindableRigVersion[];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!auth.activeOrgId) {
    return NextResponse.json(
      { error: "No active organisation" },
      { status: 400 }
    );
  }

  const { id: workflowId } = await params;

  const admin = createAdminClient();

  // Confirm the workspace belongs to the caller's active org.
  const { data: wf } = await admin
    .from("workflows")
    .select("id, organization_id")
    .eq("id", workflowId)
    .maybeSingle();
  if (!wf || wf.organization_id !== auth.activeOrgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Entitled Published Rigs.
  const { data: entitlements } = await admin
    .from("rig_entitlements")
    .select("rig_id")
    .eq("organization_id", auth.activeOrgId)
    .is("revoked_at", null);
  const publishedIds = (entitlements ?? []).map(
    (e: { rig_id: string }) => e.rig_id
  );

  // Organisation-owned Rigs (all tiers — but only org tier are expected here).
  const { data: orgOwnedRigs } = await admin
    .from("rigs")
    .select("id, slug, name, tier, category, current_state, current_version")
    .eq("organization_id", auth.activeOrgId)
    .eq("tier", "organisation");

  const { data: publishedRigs } = publishedIds.length
    ? await admin
        .from("rigs")
        .select(
          "id, slug, name, tier, category, current_state, current_version"
        )
        .in("id", publishedIds)
        .eq("tier", "published")
    : { data: [] as BindableRig[] };

  const allRigs = [
    ...(publishedRigs ?? []),
    ...(orgOwnedRigs ?? []),
  ] as BindableRig[];

  const enriched: BindableRig[] = [];
  for (const rig of allRigs) {
    const versions = await listBindableVersions(admin, rig.id);
    // Skip rigs with no bindable version — nothing the user can do with them.
    if (versions.length === 0) continue;
    enriched.push({
      ...rig,
      versions: versions
        .map((v) => ({
          id: v.id,
          version: v.version,
          state: v.state as BindableRigVersion["state"],
          deprecation_window_ends_at: v.deprecationWindowEndsAt,
        }))
        // Newest first.
        .sort((a, b) => compareSemver(b.version, a.version)),
    });
  }

  enriched.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier === "published" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ rigs: enriched });
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrgRigAuthor } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent, auditActions } from "@/lib/api/audit";

/**
 * Server actions for Organisation-tier Rig authoring and forking (E-08 §4.4).
 *
 * These run under the admin client (service role) so they bypass RLS — every
 * action therefore re-asserts requireOrgRigAuthor() AND verifies the target
 * rig belongs to the caller's active organisation before mutating.
 *
 * The auth ceremony here mirrors /admin/rigs/actions.ts but narrows the scope
 * to a single tenant. Platform-admin cross-tenant work still lives under
 * /admin/rigs; this file is for org-tier authoring only.
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

/** Create a new bespoke Organisation Rig + initial 0.1.0 draft version. */
export async function createBespokeOrgRig(formData: FormData): Promise<void> {
  const auth = await requireOrgRigAuthor();
  if (auth.error) throw new Error("Unauthorized");
  if (!auth.activeOrgId) throw new Error("No active organisation");

  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as Category;
  const pipelinePattern = String(
    formData.get("pipeline_pattern") ?? ""
  ) as PipelinePattern;
  const methodology = String(
    formData.get("methodology_statement") ?? ""
  ).trim();

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
      tier: "organisation",
      organization_id: auth.activeOrgId,
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
    await admin.from("rigs").delete().eq("id", rig.id);
    throw new Error(versionErr.message);
  }

  await writeAuditEvent({
    action: auditActions.RIG_CREATED,
    resourceType: "rig",
    resourceId: rig.id,
    targetOrganizationId: auth.activeOrgId,
    payload: { slug, name, category, tier: "organisation" },
  });
  await writeAuditEvent({
    action: auditActions.RIG_VERSION_CREATED,
    resourceType: "rig_version",
    resourceId: rig.id,
    targetOrganizationId: auth.activeOrgId,
    payload: { rig_id: rig.id, version: "0.1.0", state: "draft" },
  });

  revalidatePath("/org-admin/rigs");
  redirect(`/org-admin/rigs/${rig.slug}`);
}

/**
 * Fork a Published Rig into the active organisation (E-08 §4.4).
 *
 * The fork:
 *   - inherits the source Rig's pipeline_pattern and methodology text at the
 *     source's current released version, giving the tenant a sensible starting
 *     point;
 *   - does NOT copy calibration evidence — per §4.4 "a fork is a new Rig and
 *     requires its own validation";
 *   - records lineage via forked_from_rig_id / forked_from_version so audits
 *     and UI can surface the provenance;
 *   - starts at state='draft' and version='0.1.0' regardless of source state.
 */
export async function forkPublishedRig(formData: FormData): Promise<void> {
  const auth = await requireOrgRigAuthor();
  if (auth.error) throw new Error("Unauthorized");
  if (!auth.activeOrgId) throw new Error("No active organisation");

  const sourceRigId = String(formData.get("source_rig_id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!sourceRigId) throw new Error("Source rig is required.");
  if (!slug || !SLUG_RE.test(slug)) {
    throw new Error("Slug must be lowercase letters, digits, and dashes.");
  }
  if (!name) throw new Error("Name is required.");

  const admin = createAdminClient();

  const { data: source } = await admin
    .from("rigs")
    .select("id, slug, name, category, tier, current_version")
    .eq("id", sourceRigId)
    .eq("tier", "published")
    .single();
  if (!source) {
    throw new Error("Source Published Rig not found.");
  }

  // Find the source version that matches the source rig's current_version so
  // we can inherit its composition fields. If no matching version exists
  // (seeded draft with a synthetic 0.1.0 version row), fall back to the most
  // recent version row.
  const { data: sourceVersion } = await admin
    .from("rig_versions")
    .select("pipeline_pattern, methodology_statement, version")
    .eq("rig_id", source.id)
    .eq("version", source.current_version)
    .maybeSingle();

  const { data: fallbackVersion } = sourceVersion
    ? { data: null }
    : await admin
        .from("rig_versions")
        .select("pipeline_pattern, methodology_statement, version")
        .eq("rig_id", source.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  const inherited = sourceVersion ?? fallbackVersion;
  if (!inherited) {
    throw new Error("Source Rig has no version to fork from.");
  }

  const { data: fork, error: forkErr } = await admin
    .from("rigs")
    .insert({
      tier: "organisation",
      organization_id: auth.activeOrgId,
      slug,
      name,
      category: source.category,
      forked_from_rig_id: source.id,
      forked_from_version: inherited.version,
      current_state: "draft",
      current_version: "0.1.0",
      created_by_user_id: auth.user.id,
    })
    .select("id, slug")
    .single();
  if (forkErr || !fork) {
    throw new Error(forkErr?.message ?? "Failed to create fork");
  }

  const { error: versionErr } = await admin.from("rig_versions").insert({
    rig_id: fork.id,
    version: "0.1.0",
    state: "draft",
    pipeline_pattern: inherited.pipeline_pattern,
    methodology_statement: inherited.methodology_statement,
    // Explicitly do NOT copy calibration_evidence_id — forks start un-validated.
  });
  if (versionErr) {
    await admin.from("rigs").delete().eq("id", fork.id);
    throw new Error(versionErr.message);
  }

  await writeAuditEvent({
    action: auditActions.RIG_FORKED,
    resourceType: "rig",
    resourceId: fork.id,
    targetOrganizationId: auth.activeOrgId,
    payload: {
      source_rig_id: source.id,
      source_slug: source.slug,
      source_version: inherited.version,
      fork_slug: slug,
      fork_name: name,
    },
  });
  await writeAuditEvent({
    action: auditActions.RIG_VERSION_CREATED,
    resourceType: "rig_version",
    resourceId: fork.id,
    targetOrganizationId: auth.activeOrgId,
    payload: { rig_id: fork.id, version: "0.1.0", state: "draft" },
  });

  revalidatePath("/org-admin/rigs");
  redirect(`/org-admin/rigs/${fork.slug}`);
}

/** Add a new draft version to an existing Organisation Rig. */
export async function createOrgRigVersion(
  rigId: string,
  formData: FormData
): Promise<void> {
  const auth = await requireOrgRigAuthor();
  if (auth.error) throw new Error("Unauthorized");
  if (!auth.activeOrgId) throw new Error("No active organisation");

  const version = String(formData.get("version") ?? "").trim();
  const pipelinePattern = String(
    formData.get("pipeline_pattern") ?? ""
  ) as PipelinePattern;
  const methodology = String(
    formData.get("methodology_statement") ?? ""
  ).trim();

  if (!SEMVER_RE.test(version)) {
    throw new Error("Version must be semver (e.g. 1.2.0).");
  }
  if (!PIPELINE_PATTERNS.includes(pipelinePattern)) {
    throw new Error("Invalid pipeline pattern.");
  }

  const admin = createAdminClient();

  const rig = await loadOrgRig(admin, rigId, auth.activeOrgId);

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
    targetOrganizationId: auth.activeOrgId,
    payload: { rig_id: rig.id, version, state: "draft" },
  });

  revalidatePath(`/org-admin/rigs/${rig.slug}`);
}

/** Promote an Organisation Rig version through the state machine. */
export async function transitionOrgRigVersionState(
  rigVersionId: string,
  target: "experimental" | "validated" | "deprecated"
): Promise<void> {
  const auth = await requireOrgRigAuthor();
  if (auth.error) throw new Error("Unauthorized");
  if (!auth.activeOrgId) throw new Error("No active organisation");

  const admin = createAdminClient();

  const { data: v } = await admin
    .from("rig_versions")
    .select("id, rig_id, version, state, released_at")
    .eq("id", rigVersionId)
    .single();
  if (!v) throw new Error("Version not found");

  // Confirm the version's rig belongs to the caller's active org.
  const rig = await loadOrgRig(admin, v.rig_id, auth.activeOrgId);

  const patch: Record<string, unknown> = { state: target };
  if (target === "experimental" || target === "validated") {
    if (!v.released_at) {
      patch.released_at = new Date().toISOString();
      patch.released_by_user_id = auth.user.id;
    }
  }
  if (target === "deprecated") {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 90 * 24 * 60 * 60_000);
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

  const rigPatch: Record<string, unknown> = { current_state: target };
  if (target === "experimental" || target === "validated") {
    rigPatch.current_version = v.version;
  }
  await admin.from("rigs").update(rigPatch).eq("id", rig.id);

  const actionMap = {
    experimental: auditActions.RIG_VERSION_RELEASED,
    validated: auditActions.RIG_VERSION_VALIDATED,
    deprecated: auditActions.RIG_VERSION_DEPRECATED,
  } as const;
  await writeAuditEvent({
    action: actionMap[target],
    resourceType: "rig_version",
    resourceId: v.id,
    targetOrganizationId: auth.activeOrgId,
    payload: { rig_id: v.rig_id, version: v.version, state: target },
  });

  revalidatePath(`/org-admin/rigs/${rig.slug}`);
}

/** Attach calibration evidence to an Organisation Rig version. */
export async function attachOrgCalibrationEvidence(
  rigVersionId: string,
  evidenceType:
    | "noise_floor"
    | "repeatability"
    | "factorial_design"
    | "domain_test",
  payload: Record<string, unknown>
): Promise<void> {
  const auth = await requireOrgRigAuthor();
  if (auth.error) throw new Error("Unauthorized");
  if (!auth.activeOrgId) throw new Error("No active organisation");

  const admin = createAdminClient();

  const { data: v } = await admin
    .from("rig_versions")
    .select("id, rig_id")
    .eq("id", rigVersionId)
    .single();
  if (!v) throw new Error("Version not found");

  const rig = await loadOrgRig(admin, v.rig_id, auth.activeOrgId);

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

  if (ev) {
    await admin
      .from("rig_versions")
      .update({ calibration_evidence_id: ev.id })
      .eq("id", v.id);
  }

  await writeAuditEvent({
    action: auditActions.CALIBRATION_EVIDENCE_ATTACHED,
    resourceType: "calibration_evidence",
    resourceId: ev?.id ?? null,
    targetOrganizationId: auth.activeOrgId,
    payload: { rig_version_id: v.id, evidence_type: evidenceType },
  });

  revalidatePath(`/org-admin/rigs/${rig.slug}`);
}

/**
 * Load an Organisation-tier Rig owned by the given org, or throw. Used by
 * every org-scoped action as a cross-tenant guard — even with a valid session,
 * the caller cannot touch another org's Rig through these actions.
 */
async function loadOrgRig(
  admin: ReturnType<typeof createAdminClient>,
  rigId: string,
  activeOrgId: string
): Promise<{ id: string; slug: string }> {
  const { data: rig } = await admin
    .from("rigs")
    .select("id, slug, tier, organization_id")
    .eq("id", rigId)
    .single();
  if (!rig) throw new Error("Rig not found");
  if (rig.tier !== "organisation" || rig.organization_id !== activeOrgId) {
    throw new Error("Rig does not belong to the active organisation");
  }
  return { id: rig.id, slug: rig.slug };
}

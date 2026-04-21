"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent, auditActions } from "@/lib/api/audit";

/**
 * Server actions for Rig entitlements. Only platform_admin writes — RLS
 * enforces this at the DB layer too, but re-checking here is the faster
 * rejection path for malicious form posts.
 */

export async function grantEntitlement(formData: FormData): Promise<void> {
  const auth = await requirePlatformAdmin();
  if (auth.error) throw new Error("Unauthorized");

  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const rigId = String(formData.get("rig_id") ?? "").trim();

  if (!organizationId || !rigId) {
    throw new Error("Organisation and rig are required.");
  }

  const admin = createAdminClient();

  // Verify the rig is Published — guarded by DB trigger too, but we want a
  // clean error message in the UI before hitting the trigger.
  const { data: rig } = await admin
    .from("rigs")
    .select("id, slug, name, tier")
    .eq("id", rigId)
    .single();
  if (!rig) throw new Error("Rig not found");
  if (rig.tier !== "published") {
    throw new Error("Only Published Rigs can be entitled.");
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("id", organizationId)
    .single();
  if (!org) throw new Error("Organisation not found");

  const { data: ent, error } = await admin
    .from("rig_entitlements")
    .insert({
      organization_id: organizationId,
      rig_id: rigId,
      granted_by_user_id: auth.user.id,
    })
    .select("id")
    .single();
  if (error) {
    // Partial unique index collision → already entitled.
    if (error.code === "23505") {
      throw new Error(
        `${org.name} is already entitled to ${rig.name}. Revoke the existing grant first.`
      );
    }
    throw new Error(error.message);
  }

  await writeAuditEvent({
    action: auditActions.RIG_ENTITLEMENT_GRANTED,
    resourceType: "rig_entitlement",
    resourceId: ent?.id ?? null,
    targetOrganizationId: organizationId,
    payload: {
      organization_slug: org.slug,
      rig_slug: rig.slug,
      rig_id: rig.id,
    },
  });

  revalidatePath("/admin/entitlements");
}

export async function revokeEntitlement(entitlementId: string): Promise<void> {
  const auth = await requirePlatformAdmin();
  if (auth.error) throw new Error("Unauthorized");

  const admin = createAdminClient();

  const { data: ent } = await admin
    .from("rig_entitlements")
    .select("id, organization_id, rig_id, revoked_at")
    .eq("id", entitlementId)
    .single();
  if (!ent) throw new Error("Entitlement not found");
  if (ent.revoked_at) throw new Error("Entitlement already revoked");

  const { error } = await admin
    .from("rig_entitlements")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by_user_id: auth.user.id,
    })
    .eq("id", ent.id);
  if (error) throw new Error(error.message);

  await writeAuditEvent({
    action: auditActions.RIG_ENTITLEMENT_REVOKED,
    resourceType: "rig_entitlement",
    resourceId: ent.id,
    targetOrganizationId: ent.organization_id,
    payload: { rig_id: ent.rig_id },
  });

  revalidatePath("/admin/entitlements");
}

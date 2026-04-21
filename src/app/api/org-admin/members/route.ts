/**
 * Organisation-scoped member role management (E-08 §7.2 Table 13).
 *
 * PATCH /api/org-admin/members
 *   body: { userId: string, role: 'org_admin' | 'rig_manager' | 'member' }
 *
 * org_admin only — rig_manager cannot promote others. Changing the last
 * org_admin's role is refused so the org is never left without an admin.
 */

import { NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent, auditActions } from "@/lib/api/audit";

const ROLES = ["org_admin", "rig_manager", "member"] as const;
type Role = (typeof ROLES)[number];

export async function PATCH(request: Request) {
  const auth = await requireOrgAdmin();
  if (auth.error) return auth.error;
  if (!auth.activeOrgId) {
    return NextResponse.json(
      { error: "No active organisation" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const userId = (body as { userId?: string }).userId;
  const roleRaw = (body as { role?: string }).role;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!(ROLES as readonly string[]).includes(roleRaw ?? "")) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  const role = roleRaw as Role;

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("memberships")
    .select("id, role, status")
    .eq("organization_id", auth.activeOrgId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!target) {
    return NextResponse.json(
      { error: "Active member not found" },
      { status: 404 }
    );
  }

  if (target.role === role) {
    return NextResponse.json({ success: true, membership: target });
  }

  // Don't strand the org without an admin.
  if (target.role === "org_admin" && role !== "org_admin") {
    const { count } = await admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", auth.activeOrgId)
      .eq("role", "org_admin")
      .eq("status", "active");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        {
          error:
            "Cannot demote the last org admin. Promote another member first.",
        },
        { status: 409 }
      );
    }
  }

  const { error } = await admin
    .from("memberships")
    .update({ role })
    .eq("id", target.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    action: auditActions.MEMBERSHIP_ROLE_CHANGED,
    resourceType: "membership",
    resourceId: target.id,
    targetOrganizationId: auth.activeOrgId,
    payload: { user_id: userId, from_role: target.role, to_role: role },
  });

  return NextResponse.json({ success: true });
}

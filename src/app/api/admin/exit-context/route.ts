import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requirePlatformRole, ACTIVE_ORG_COOKIE, ADMIN_CONTEXT_COOKIE, type AdminContextState } from "@/lib/api/auth";
import { writeAuditEvent, auditActions } from "@/lib/api/audit";

/**
 * POST /api/admin/exit-context
 *
 * Drops the admin-context cookies and writes an 'admin.context_exited' audit
 * entry. Active-org cookie is cleared so the user reverts to their primary
 * org on next requireAuth call.
 */
export async function POST() {
  const auth = await requirePlatformRole();
  if (auth.error) return auth.error;

  const cookieStore = await cookies();
  const adminContextRaw = cookieStore.get(ADMIN_CONTEXT_COOKIE)?.value;

  let state: AdminContextState | null = null;
  if (adminContextRaw) {
    try {
      state = JSON.parse(adminContextRaw) as AdminContextState;
    } catch {
      // malformed — still proceed to clear
    }
  }

  cookieStore.delete(ADMIN_CONTEXT_COOKIE);
  cookieStore.delete(ACTIVE_ORG_COOKIE);

  await writeAuditEvent({
    action: auditActions.ADMIN_CONTEXT_EXITED,
    resourceType: "organization",
    resourceId: state?.targetOrganizationId ?? null,
    targetOrganizationId: state?.targetOrganizationId ?? null,
    payload: state
      ? {
          entered_at: state.enteredAt,
          expires_at: state.expiresAt,
          exited_at: new Date().toISOString(),
        }
      : { note: "no admin context cookie found" },
  });

  return NextResponse.json({ ok: true });
}

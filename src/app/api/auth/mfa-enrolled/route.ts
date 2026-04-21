import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { writeAuditEvent, auditActions } from "@/lib/api/audit";

/**
 * POST /api/auth/mfa-enrolled
 * Best-effort audit trigger fired by the MFA setup UI after a successful
 * supabase.auth.mfa.verify call. Idempotent.
 */
export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await writeAuditEvent({
    action: auditActions.USER_MFA_ENROLLED,
    resourceType: "user",
    resourceId: auth.user.id,
  });
  return NextResponse.json({ ok: true });
}

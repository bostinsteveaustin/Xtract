/**
 * POST /api/org-admin/billing/adjustments
 *
 * Platform-admin-only manual credit adjustment (E-08 §4.7). Writes a single
 * ledger entry at entry_type='adjustment' — amount is signed so the same
 * endpoint handles grants and clawbacks.
 *
 * Scoped to platform_admin because pilot-phase billing is commercially
 * sensitive: org_admins of the target org shouldn't be able to grant
 * themselves credits. Once Stripe is enabled (Phase 6), this endpoint stays
 * available for non-Stripe flows (e.g. invoice credit notes).
 */

import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent, auditActions } from "@/lib/api/audit";

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const organizationId = (body as { organizationId?: string }).organizationId;
  const amount = (body as { amount?: number }).amount;
  const reference = (body as { reference?: string }).reference;

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ error: "amount must be a non-zero number" }, { status: 400 });
  }
  if (!reference || !reference.trim()) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Confirm the target org exists — write_credit_ledger would also fail via
  // the FK, but a 404 here gives a cleaner error than a 23503.
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();
  if (!org) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  const { data: ledgerId, error } = await admin.rpc("write_credit_ledger", {
    p_org_id: organizationId,
    p_entry_type: "adjustment",
    p_amount: amount,
    p_run_id: null,
    p_reference: reference.trim(),
    p_created_by_user_id: auth.user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    action: auditActions.BILLING_ADJUSTMENT_WRITTEN,
    resourceType: "credit_ledger",
    resourceId: ledgerId as string,
    targetOrganizationId: organizationId,
    payload: { amount, reference: reference.trim() },
  });

  return NextResponse.json({ success: true, ledgerEntryId: ledgerId });
}

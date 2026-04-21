/**
 * Organisation-scoped invitations (E-08 §6.7).
 *
 * GET    /api/org-admin/invitations         — list pending invites for active org
 * POST   /api/org-admin/invitations         — create invite
 * DELETE /api/org-admin/invitations         — revoke (by invitationId in body)
 *
 * Supersedes /api/workspaces/invitations under Supabase-stays. Uses the
 * invite_tokens table; the legacy workspace_invitations is deprecated.
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireOrgAdmin } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent, auditActions } from "@/lib/api/audit";

export async function GET() {
  const auth = await requireOrgAdmin();
  if (auth.error) return auth.error;
  if (!auth.activeOrgId) {
    return NextResponse.json(
      { error: "No active organisation" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: invitations, error } = await admin
    .from("invite_tokens")
    .select(
      "id, email, role, token, status, expires_at, created_at, invited_by_user_id"
    )
    .eq("organization_id", auth.activeOrgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invitations: invitations ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireOrgAdmin();
  if (auth.error) return auth.error;
  if (!auth.activeOrgId) {
    return NextResponse.json(
      { error: "No active organisation" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const emailRaw = (body as { email?: string }).email;
  const roleRaw = (body as { role?: string }).role;

  if (!emailRaw?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const email = emailRaw.trim().toLowerCase();
  const allowedRoles = ["org_admin", "rig_manager", "member"] as const;
  const role = (allowedRoles as readonly string[]).includes(roleRaw ?? "")
    ? (roleRaw as (typeof allowedRoles)[number])
    : "member";

  const admin = createAdminClient();

  // Already a member of this org?
  const { data: existingMembership } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  if (existingMembership?.id) {
    const { data: membership } = await admin
      .from("memberships")
      .select("id")
      .eq("user_id", existingMembership.id)
      .eq("organization_id", auth.activeOrgId)
      .eq("status", "active")
      .maybeSingle();
    if (membership) {
      return NextResponse.json(
        { error: "This user is already a member of this organisation" },
        { status: 409 }
      );
    }
  }

  // Already a pending invite for this email + org?
  const { data: existingInvite } = await admin
    .from("invite_tokens")
    .select("id")
    .eq("organization_id", auth.activeOrgId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();
  if (existingInvite) {
    return NextResponse.json(
      { error: "A pending invitation already exists for this email" },
      { status: 409 }
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const { data: invitation, error: insertError } = await admin
    .from("invite_tokens")
    .insert({
      organization_id: auth.activeOrgId,
      email,
      token,
      invited_by_user_id: auth.user.id,
      role,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await writeAuditEvent({
    action: auditActions.INVITE_TOKEN_CREATED,
    resourceType: "invite_token",
    resourceId: invitation.id,
    targetOrganizationId: auth.activeOrgId,
    payload: { email, role },
  });

  const inviteUrl = `/invite/${token}`;
  return NextResponse.json({ invitation, inviteUrl });
}

export async function DELETE(request: Request) {
  const auth = await requireOrgAdmin();
  if (auth.error) return auth.error;
  if (!auth.activeOrgId) {
    return NextResponse.json(
      { error: "No active organisation" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const invitationId = (body as { invitationId?: string }).invitationId;
  if (!invitationId) {
    return NextResponse.json(
      { error: "invitationId is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("invite_tokens")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("organization_id", auth.activeOrgId)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    action: auditActions.INVITE_TOKEN_REVOKED,
    resourceType: "invite_token",
    resourceId: invitationId,
    targetOrganizationId: auth.activeOrgId,
  });

  return NextResponse.json({ success: true });
}

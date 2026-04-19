// GET /api/workspaces/invitations — List pending invitations
// POST /api/workspaces/invitations — Create a new invitation (owner/admin only)

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/auth";
import crypto from "crypto";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const admin = createAdminClient();

    const { data: invitations, error } = await admin
      .from("workspace_invitations")
      .select("id, email, role, status, expires_at, created_at, invited_by")
      .eq("workspace_id", auth.workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invitations: invitations ?? [] });
  } catch (error) {
    console.error("GET /api/workspaces/invitations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const admin = createAdminClient();

    // Verify caller is owner or admin
    const { data: membership } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", auth.workspaceId)
      .eq("user_id", auth.user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can invite members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body as { email?: string; role?: string };

    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const inviteRole = role === "admin" ? "admin" : "member";

    // Check if email is already a member
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, workspace_id")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (existingProfile?.workspace_id === auth.workspaceId) {
      return NextResponse.json(
        { error: "This user is already a member of this workspace" },
        { status: 409 }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await admin
      .from("workspace_invitations")
      .select("id")
      .eq("workspace_id", auth.workspaceId)
      .eq("email", email.trim().toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email" },
        { status: 409 }
      );
    }

    // Generate invite token
    const token = crypto.randomBytes(32).toString("hex");

    const { data: invitation, error: insertError } = await admin
      .from("workspace_invitations")
      .insert({
        workspace_id: auth.workspaceId,
        email: email.trim().toLowerCase(),
        token,
        invited_by: auth.user.id,
        role: inviteRole,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // Build invite URL (relative — frontend will show it for manual sharing)
    const inviteUrl = `/invite/${token}`;

    return NextResponse.json({ invitation, inviteUrl });
  } catch (error) {
    console.error("POST /api/workspaces/invitations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/invitations/[token] — Accept an invitation
// GET  /api/workspaces/invitations/[token] — Check invitation validity

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const admin = createAdminClient();

    const { data: invitation } = await admin
      .from("workspace_invitations")
      .select("id, email, role, status, expires_at, workspace_id")
      .eq("token", token)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation has already been used or revoked" },
        { status: 410 }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Get workspace name for display
    const { data: workspace } = await admin
      .from("workspaces")
      .select("name")
      .eq("id", invitation.workspace_id)
      .single();

    return NextResponse.json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      workspaceName: workspace?.name ?? "Unknown workspace",
    });
  } catch (error) {
    console.error("GET /api/workspaces/invitations/[token] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // User must be logged in to accept
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;
    const admin = createAdminClient();

    const { data: invitation } = await admin
      .from("workspace_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await admin
        .from("workspace_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Verify email matches (case-insensitive)
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: `This invitation was sent to ${invitation.email}. Please log in with that email address.`,
        },
        { status: 403 }
      );
    }

    // Add user to workspace
    const { error: memberError } = await admin
      .from("workspace_members")
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (memberError && !memberError.message.includes("duplicate")) {
      return NextResponse.json(
        { error: memberError.message },
        { status: 500 }
      );
    }

    // Update user's active workspace
    await admin
      .from("profiles")
      .update({ workspace_id: invitation.workspace_id })
      .eq("id", user.id);

    // Mark invitation as accepted
    await admin
      .from("workspace_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/workspaces/invitations/[token] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

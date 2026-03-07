// GET /api/me — Bootstrap: get current user + workspace + profile
// PATCH /api/me — Update profile (displayName, avatarUrl, workspaceName)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Load workspace name
    let workspaceName: string | null = null;
    if (profile.workspace_id) {
      const admin = createAdminClient();
      const { data: workspace } = await admin
        .from("workspaces")
        .select("name")
        .eq("id", profile.workspace_id)
        .single();
      workspaceName = workspace?.name ?? null;
    }

    return NextResponse.json({
      userId: user.id,
      email: profile.email,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      workspaceId: profile.workspace_id,
      workspaceName,
    });
  } catch (error) {
    console.error("GET /api/me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, avatarUrl, workspaceName } = body as {
      displayName?: string;
      avatarUrl?: string | null;
      workspaceName?: string;
    };

    const admin = createAdminClient();

    // Update profile fields
    const profileUpdates: Record<string, unknown> = {};
    if (displayName !== undefined) profileUpdates.display_name = displayName;
    if (avatarUrl !== undefined) profileUpdates.avatar_url = avatarUrl;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await admin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
        return NextResponse.json(
          { error: "Failed to update profile" },
          { status: 500 }
        );
      }
    }

    // Update workspace name
    if (workspaceName !== undefined) {
      const { data: profile } = await admin
        .from("profiles")
        .select("workspace_id")
        .eq("id", user.id)
        .single();

      if (profile?.workspace_id) {
        const { error: wsError } = await admin
          .from("workspaces")
          .update({ name: workspaceName })
          .eq("id", profile.workspace_id);

        if (wsError) {
          console.error("Workspace update error:", wsError);
          return NextResponse.json(
            { error: "Failed to update workspace" },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

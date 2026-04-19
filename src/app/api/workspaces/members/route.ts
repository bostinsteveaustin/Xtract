// GET /api/workspaces/members — List members of the current workspace

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const admin = createAdminClient();

    const { data: members, error } = await admin
      .from("workspace_members")
      .select("id, user_id, role, joined_at")
      .eq("workspace_id", auth.workspaceId)
      .order("joined_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch profile info for each member
    const userIds = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email, display_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p])
    );

    const enriched = (members ?? []).map((m) => ({
      ...m,
      profile: profileMap.get(m.user_id) ?? null,
    }));

    return NextResponse.json({ members: enriched });
  } catch (error) {
    console.error("GET /api/workspaces/members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

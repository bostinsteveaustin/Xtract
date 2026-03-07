// GET /api/ctx — List CTX configurations, auto-seed if empty

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VENDOR_MANAGEMENT_CTX } from "@/lib/ctx/prebuilt/vendor-management-contracts";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    if (!profile?.workspace_id) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 404 }
      );
    }

    const workspaceId = profile.workspace_id;

    // Check for existing configs
    let { data: configs } = await supabase
      .from("ctx_configurations")
      .select("*")
      .eq("workspace_id", workspaceId);

    // Auto-seed if empty
    if (!configs || configs.length === 0) {
      const { data: seeded, error: seedError } = await supabase
        .from("ctx_configurations")
        .insert({
          workspace_id: workspaceId,
          name: VENDOR_MANAGEMENT_CTX.frontMatter.title,
          version: VENDOR_MANAGEMENT_CTX.frontMatter.version,
          content: JSON.parse(JSON.stringify(VENDOR_MANAGEMENT_CTX)),
          status: "active",
        })
        .select()
        .single();

      if (seedError) {
        console.error("CTX seed error:", seedError);
        return NextResponse.json(
          { error: "Failed to seed CTX" },
          { status: 500 }
        );
      }

      configs = seeded ? [seeded] : [];
    }

    return NextResponse.json({ configs });
  } catch (error) {
    console.error("GET /api/ctx error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

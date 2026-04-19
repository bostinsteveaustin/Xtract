// GET /api/ctx  — List CTX configurations, auto-seed if empty
// POST /api/ctx — Create a new CTX configuration from uploaded content

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VENDOR_MANAGEMENT_CTX } from "@/lib/ctx/prebuilt/vendor-management-contracts";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    if (!profile?.workspace_id) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const workspaceId = profile.workspace_id;
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
        return NextResponse.json({ error: "Failed to seed CTX" }, { status: 500 });
      }
      configs = seeded ? [seeded] : [];
    }

    return NextResponse.json({ configs });
  } catch (error) {
    console.error("GET /api/ctx error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    if (!profile?.workspace_id) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const body = await request.json() as {
      name: string;
      rawContent: string;   // file text (JSON, MD, or plain text)
      fileName?: string;    // original filename, used to detect format
    };

    if (!body.name || !body.rawContent) {
      return NextResponse.json({ error: "name and rawContent required" }, { status: 400 });
    }

    // Try to parse as JSON CTX; otherwise wrap raw text in a minimal CTX envelope
    let content: unknown;
    try {
      content = JSON.parse(body.rawContent);
    } catch {
      // Plain text or Markdown — wrap in a minimal CTX envelope so the pipeline
      // can receive it as ctxContent string at run time.
      content = {
        frontMatter: {
          title: body.name,
          version: "1.0",
          format: body.fileName?.endsWith(".md") ? "markdown" : "text",
        },
        rawContent: body.rawContent,
      };
    }

    const admin = createAdminClient();
    const { data: config, error } = await admin
      .from("ctx_configurations")
      .insert({
        workspace_id: profile.workspace_id,
        name: body.name,
        version: "1.0",
        content: JSON.parse(JSON.stringify(content)),
        status: "active",
      })
      .select("id, name")
      .single();

    if (error || !config) {
      console.error("POST /api/ctx error:", error);
      return NextResponse.json({ error: "Failed to create CTX" }, { status: 500 });
    }

    return NextResponse.json({ id: config.id, name: config.name });
  } catch (error) {
    console.error("POST /api/ctx error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

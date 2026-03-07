// GET /api/workflows — List all workflows for workspace
// POST /api/workflows — Create a new workflow

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplateById, getDefaultTemplate } from "@/lib/workflow/templates";

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
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data: workflows } = await admin
      .from("workflows")
      .select("id, name, status, template_id, created_at, updated_at")
      .eq("workspace_id", profile.workspace_id)
      .order("updated_at", { ascending: false });

    return NextResponse.json({ workflows: workflows ?? [] });
  } catch (error) {
    console.error("GET /api/workflows error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }

    const body = await request.json();
    const { name, templateId } = body as { name?: string; templateId?: string };

    const template = templateId
      ? getTemplateById(templateId) ?? getDefaultTemplate()
      : getDefaultTemplate();

    const admin = createAdminClient();
    const { data: workflow, error: createError } = await admin
      .from("workflows")
      .insert({
        workspace_id: profile.workspace_id,
        name: name ?? "Untitled Pipeline",
        template_id: template.templateId,
        node_graph: JSON.parse(JSON.stringify(template)),
      })
      .select()
      .single();

    if (createError) {
      console.error("Create workflow error:", createError);
      return NextResponse.json(
        { error: "Failed to create workflow" },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("POST /api/workflows error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

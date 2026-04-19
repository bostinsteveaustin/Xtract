// PATCH /api/workflows/[id] — Rename workflow
// DELETE /api/workflows/[id] — Delete workflow

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, verifyWorkflowOwnership } from "@/lib/api/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    if (!(await verifyWorkflowOwnership(id, auth.workspaceId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, workspace_ctx_id } = body as {
      name?: string;
      description?: string;
      workspace_ctx_id?: string | null;
    };

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    // Build update object from supplied fields only
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (workspace_ctx_id !== undefined) updates.workspace_ctx_id = workspace_ctx_id;

    const supabase = createAdminClient();
    const { data: workflow, error } = await supabase
      .from("workflows")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("PATCH /api/workflows/[id] DB error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("PATCH /api/workflows/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    if (!(await verifyWorkflowOwnership(id, auth.workspaceId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("workflows")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE /api/workflows/[id] DB error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/workflows/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

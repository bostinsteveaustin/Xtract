// DELETE /api/workflows/[id]/documents/[docId] — remove a source document

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, verifyWorkflowOwnership } from "@/lib/api/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id: workflowId, docId } = await params;

    if (!(await verifyWorkflowOwnership(workflowId, auth.workspaceId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const admin = createAdminClient();

    // Fetch storage path before deleting
    const { data: doc } = await admin
      .from("workflow_source_documents")
      .select("storage_path")
      .eq("id", docId)
      .eq("workflow_id", workflowId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Remove from storage (best-effort)
    if (doc.storage_path) {
      await admin.storage.from("documents").remove([doc.storage_path]);
    }

    // Delete the record
    const { error } = await admin
      .from("workflow_source_documents")
      .delete()
      .eq("id", docId)
      .eq("workflow_id", workflowId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/workflows/[id]/documents/[docId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

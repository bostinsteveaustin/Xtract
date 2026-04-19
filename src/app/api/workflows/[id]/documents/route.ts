// GET  /api/workflows/[id]/documents  — list workspace source documents
// POST /api/workflows/[id]/documents  — upload a source document

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, verifyWorkflowOwnership } from "@/lib/api/auth";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
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

    const admin = createAdminClient();
    const { data: documents, error } = await admin
      .from("workflow_source_documents")
      .select("id, filename, storage_path, mime_type, file_size, uploaded_by, uploaded_at, metadata")
      .eq("workflow_id", id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: documents ?? [] });
  } catch (error) {
    console.error("GET /api/workflows/[id]/documents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id: workflowId } = await params;

    if (!(await verifyWorkflowOwnership(workflowId, auth.workspaceId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const admin = createAdminClient();
    const uploaded: Array<{ id: string; filename: string; file_size: number | null }> = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const storagePath = `${auth.workspaceId}/${workflowId}/source/${Date.now()}_${file.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await admin.storage
        .from("documents")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        // Continue — still record the metadata without a verified storage path
      }

      // Insert into workflow_source_documents
      const { data: doc, error: insertError } = await admin
        .from("workflow_source_documents")
        .insert({
          workflow_id: workflowId,
          filename: file.name,
          storage_path: storagePath,
          mime_type: file.type || null,
          file_size: file.size,
          uploaded_by: auth.user.id,
          metadata: {},
        })
        .select("id, filename, file_size")
        .single();

      if (insertError) {
        console.error("Document insert error:", insertError);
        continue;
      }

      if (doc) uploaded.push(doc);
    }

    return NextResponse.json({ documents: uploaded });
  } catch (error) {
    console.error("POST /api/workflows/[id]/documents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

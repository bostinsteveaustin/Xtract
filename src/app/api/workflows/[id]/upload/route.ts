// POST /api/workflows/[id]/upload — Upload and process documents

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processDocument, chunkText } from "@/lib/documents";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    // Auth check
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

    const workspaceId = profile.workspace_id;

    // Verify workflow belongs to workspace
    const { data: workflow } = await supabase
      .from("workflows")
      .select("id")
      .eq("id", workflowId)
      .eq("workspace_id", workspaceId)
      .single();

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Create document set
    const { data: docSet, error: setError } = await admin
      .from("document_sets")
      .insert({
        workspace_id: workspaceId,
        name: `Upload ${new Date().toISOString().slice(0, 16)}`,
      })
      .select()
      .single();

    if (setError || !docSet) {
      console.error("Document set creation error:", setError);
      return NextResponse.json(
        { error: "Failed to create document set" },
        { status: 500 }
      );
    }

    const processedFiles: Array<{
      id: string;
      filename: string;
      fileType: string;
      fileSize: number;
      chunkCount: number;
    }> = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name;
      const fileSize = file.size;

      // Detect file type
      const ext = fileName.split(".").pop()?.toLowerCase() ?? "txt";

      // Upload to Supabase Storage
      const storagePath = `${workspaceId}/${docSet.id}/${fileName}`;
      const { error: uploadError } = await admin.storage
        .from("documents")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        // Continue with other files but store without storage path
      }

      // Process document text
      let textContent = "";
      let chunkCount = 0;
      try {
        const processed = await processDocument(buffer, fileName);
        textContent = processed.text;
        const chunks = chunkText(textContent);
        chunkCount = chunks.length;
      } catch (err) {
        console.error(`Processing error for ${fileName}:`, err);
        textContent = "";
        chunkCount = 0;
      }

      // Insert document record
      const { data: doc, error: docError } = await admin
        .from("documents")
        .insert({
          document_set_id: docSet.id,
          filename: fileName,
          storage_path: storagePath,
          file_type: ext,
          file_size: fileSize,
          text_content: textContent,
          chunk_count: chunkCount,
          status: textContent ? "ready" : "error",
        })
        .select()
        .single();

      if (docError) {
        console.error("Document insert error:", docError);
        continue;
      }

      if (doc) {
        processedFiles.push({
          id: doc.id,
          filename: doc.filename,
          fileType: doc.file_type,
          fileSize: doc.file_size,
          chunkCount: doc.chunk_count ?? 0,
        });
      }
    }

    return NextResponse.json({
      documentSetId: docSet.id,
      files: processedFiles,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload documents" },
      { status: 500 }
    );
  }
}

// POST /api/workflows/[id]/export — Export extraction results as iCML, XLSX, or graph

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializeToICML } from "@/lib/export/icml-serializer";
import { generateXLSX } from "@/lib/export/xlsx-serializer";
import { serializeToGraph } from "@/lib/export/graph-serializer";
import type { CTXFile } from "@/types/ctx";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const body = await request.json();
    const { format, workflowRunId } = body as {
      format: "xlsx" | "icml" | "graph";
      workflowRunId: string;
    };

    if (!format || !workflowRunId) {
      return NextResponse.json(
        { error: "format and workflowRunId required" },
        { status: 400 }
      );
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Load workflow run
    const { data: run } = await admin
      .from("workflow_runs")
      .select("*")
      .eq("id", workflowRunId)
      .eq("workflow_id", workflowId)
      .single();

    if (!run) {
      return NextResponse.json(
        { error: "Workflow run not found" },
        { status: 404 }
      );
    }

    // Load extracted objects
    const { data: objects } = await admin
      .from("extracted_objects")
      .select("*")
      .eq("workflow_run_id", workflowRunId);

    // Load relationships
    const { data: relationships } = await admin
      .from("object_relationships")
      .select("*")
      .eq("workflow_run_id", workflowRunId);

    // Load CTX configuration
    const { data: ctxConfig } = await admin
      .from("ctx_configurations")
      .select("*")
      .eq("id", run.ctx_configuration_id ?? "")
      .single();

    // Load source documents
    const { data: documents } = await admin
      .from("documents")
      .select("*")
      .eq("document_set_id", run.document_set_id ?? "");

    const domainObjects = objects ?? [];
    const relationshipRecords = relationships ?? [];
    const sourceDocs = documents ?? [];

    if (format === "icml") {
      const icmlOutput = serializeToICML(
        workflowRunId,
        sourceDocs,
        domainObjects,
        ctxConfig!,
        relationshipRecords
      );

      return new Response(JSON.stringify(icmlOutput, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="extraction-${workflowRunId.slice(0, 8)}.icml.json"`,
        },
      });
    }

    if (format === "xlsx") {
      const ctxFile = ctxConfig?.content as unknown as CTXFile;
      const objectSpec = ctxFile?.sections?.objects?.objectTypes?.[0];

      if (!objectSpec) {
        return NextResponse.json(
          { error: "CTX has no object specification" },
          { status: 400 }
        );
      }

      const buffer = await generateXLSX(
        domainObjects,
        objectSpec,
        {
          extractionId: workflowRunId,
          ctxName: ctxConfig?.name ?? "Unknown",
          sourceFileName: sourceDocs[0]?.filename ?? "Unknown",
        },
        relationshipRecords
      );

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="extraction-${workflowRunId.slice(0, 8)}.xlsx"`,
        },
      });
    }

    if (format === "graph") {
      const graphOutput = serializeToGraph(
        workflowRunId,
        domainObjects,
        relationshipRecords
      );

      return new Response(JSON.stringify(graphOutput, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="extraction-${workflowRunId.slice(0, 8)}.graph.json"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid format. Use 'xlsx', 'icml', or 'graph'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Export failed",
      },
      { status: 500 }
    );
  }
}

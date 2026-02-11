// POST /api/extract/ingest — Trigger the ingest pipeline stage
// Returns SSE stream with progress events

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractions, sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runPipeline } from "@/lib/pipeline";
import { ingestStage } from "@/lib/pipeline/stages/ingest";
import { createPipelineSSEStream, createSSEResponse } from "@/lib/pipeline/sse";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { extractionId } = (await request.json()) as {
      extractionId: string;
    };

    if (!extractionId) {
      return NextResponse.json(
        { error: "extractionId is required" },
        { status: 400 }
      );
    }

    // Load extraction
    const [extraction] = await db
      .select()
      .from(extractions)
      .where(eq(extractions.id, extractionId))
      .limit(1);

    if (!extraction) {
      return NextResponse.json(
        { error: "Extraction not found" },
        { status: 404 }
      );
    }

    // Load sources
    const sourceDocs = await db
      .select()
      .from(sources)
      .where(eq(sources.extractionId, extractionId));

    const { stream, onProgress, close } = createPipelineSSEStream();

    // Run ingest stage asynchronously
    const pipelinePromise = runPipeline(
      {
        extractionId,
        mode: extraction.mode,
        sources: sourceDocs,
        ctxFileId: extraction.ctxFileId ?? undefined,
        onProgress,
      },
      [ingestStage]
    ).finally(close);

    // Don't await — let it run while streaming
    pipelinePromise.catch((err) => console.error("Ingest pipeline error:", err));

    return createSSEResponse(stream);
  } catch (error) {
    console.error("Ingest trigger error:", error);
    return NextResponse.json(
      { error: "Failed to start ingest" },
      { status: 500 }
    );
  }
}

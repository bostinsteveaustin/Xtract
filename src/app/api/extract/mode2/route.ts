// POST /api/extract/mode2 — Trigger Mode 2 extraction pipeline stage
// Returns SSE stream with progress events (5-pass extraction)

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractions, sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runPipeline } from "@/lib/pipeline";
import { mode2ExtractStage } from "@/lib/pipeline/stages/mode2-extract";
import { createPipelineSSEStream, createSSEResponse } from "@/lib/pipeline/sse";

export const maxDuration = 300;

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

    if (!extraction.ctxFileId) {
      return NextResponse.json(
        { error: "No CTX file associated with this extraction" },
        { status: 400 }
      );
    }

    const sourceDocs = await db
      .select()
      .from(sources)
      .where(eq(sources.extractionId, extractionId));

    const { stream, onProgress, close } = createPipelineSSEStream();

    const pipelinePromise = runPipeline(
      {
        extractionId,
        mode: extraction.mode,
        sources: sourceDocs,
        ctxFileId: extraction.ctxFileId,
        onProgress,
      },
      [mode2ExtractStage]
    ).finally(close);

    pipelinePromise.catch((err) =>
      console.error("Mode 2 pipeline error:", err)
    );

    return createSSEResponse(stream);
  } catch (error) {
    console.error("Mode 2 trigger error:", error);
    return NextResponse.json(
      { error: "Failed to start Mode 2 extraction" },
      { status: 500 }
    );
  }
}

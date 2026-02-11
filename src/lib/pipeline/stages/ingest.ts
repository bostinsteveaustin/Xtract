// Stage 1: Ingest — Upload, classify, chunk, index source materials

import type { PipelineContext, PipelineStageHandler, StageResult } from "../types";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { processDocument, chunkText } from "@/lib/documents";

export const ingestStage: PipelineStageHandler = {
  name: "ingest",

  async execute(ctx: PipelineContext): Promise<StageResult> {
    let totalChunks = 0;

    for (let i = 0; i < ctx.sources.length; i++) {
      const source = ctx.sources[i];

      ctx.onProgress({
        stage: "ingest",
        status: "running",
        message: `Processing ${source.fileName} (${i + 1}/${ctx.sources.length})`,
        data: {
          type: "ingest" as const,
          totalFiles: ctx.sources.length,
          processedFiles: i,
          currentFile: source.fileName,
        },
        timestamp: Date.now(),
      });

      try {
        // Fetch the file from blob storage
        const response = await fetch(source.blobUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Process the document (extract text + metadata)
        const processed = await processDocument(
          buffer,
          source.fileName,
          source.fileType as "pdf" | "docx" | "txt" | "md"
        );

        // Chunk the text
        const chunks = chunkText(processed.text, {
          chunkSize: 8000,
          overlap: 500,
          respectSections: true,
        });

        totalChunks += chunks.length;

        // Update source record with extracted text and metadata
        await db
          .update(sources)
          .set({
            textContent: processed.text,
            chunkCount: chunks.length,
            metadata: {
              ...source.metadata,
              ...processed.metadata,
            },
          })
          .where(eq(sources.id, source.id));
      } catch (error) {
        return {
          success: false,
          tokensUsed: 0,
          durationMs: 0,
          error: `Failed to process ${source.fileName}: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }

    return {
      success: true,
      tokensUsed: 0,
      durationMs: 0,
      data: {
        filesProcessed: ctx.sources.length,
        totalChunks,
      },
    };
  },
};

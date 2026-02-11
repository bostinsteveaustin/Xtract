// Pipeline orchestrator
// Coordinates extraction stages and emits progress events

import type { PipelineContext, PipelineStageHandler, StageResult } from "./types";
import type { PipelineEvent } from "@/types/pipeline";
import { db } from "@/lib/db";
import { extractions, pipelineRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Run the full extraction pipeline for a given context */
export async function runPipeline(
  ctx: PipelineContext,
  stages: PipelineStageHandler[]
): Promise<void> {
  for (const stage of stages) {
    // Emit stage started
    ctx.onProgress({
      stage: stage.name,
      status: "running",
      message: `Starting ${stage.name} stage...`,
      timestamp: Date.now(),
    });

    // Update extraction status
    await db
      .update(extractions)
      .set({
        status:
          stage.name === "ingest"
            ? "ingesting"
            : stage.name === "extract"
              ? "extracting"
              : stage.name === "synthesise"
                ? "synthesising"
                : "validating",
        updatedAt: new Date(),
      })
      .where(eq(extractions.id, ctx.extractionId));

    // Create pipeline run record
    const [run] = await db
      .insert(pipelineRuns)
      .values({
        extractionId: ctx.extractionId,
        stage: stage.name,
        status: "running",
        startedAt: new Date(),
      })
      .returning();

    try {
      const startTime = Date.now();
      const result: StageResult = await stage.execute(ctx);
      const durationMs = Date.now() - startTime;

      // Update pipeline run with results
      await db
        .update(pipelineRuns)
        .set({
          status: result.success ? "completed" : "failed",
          completedAt: new Date(),
          durationMs,
          tokensUsed: result.tokensUsed,
          errorMessage: result.error,
          metadata: { stageData: result.data },
        })
        .where(eq(pipelineRuns.id, run.id));

      if (!result.success) {
        // Emit failure and stop pipeline
        ctx.onProgress({
          stage: stage.name,
          status: "failed",
          message: result.error ?? `${stage.name} stage failed`,
          timestamp: Date.now(),
        });

        await db
          .update(extractions)
          .set({ status: "failed", errorMessage: result.error, updatedAt: new Date() })
          .where(eq(extractions.id, ctx.extractionId));

        return;
      }

      // Emit stage completed
      ctx.onProgress({
        stage: stage.name,
        status: "completed",
        message: `${stage.name} stage completed`,
        data: result.data as PipelineEvent["data"],
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Update pipeline run
      await db
        .update(pipelineRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorMessage,
        })
        .where(eq(pipelineRuns.id, run.id));

      // Emit failure
      ctx.onProgress({
        stage: stage.name,
        status: "failed",
        message: errorMessage,
        timestamp: Date.now(),
      });

      // Update extraction
      await db
        .update(extractions)
        .set({
          status: "failed",
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(extractions.id, ctx.extractionId));

      return;
    }
  }

  // All stages completed — set status to review
  await db
    .update(extractions)
    .set({ status: "review", updatedAt: new Date() })
    .where(eq(extractions.id, ctx.extractionId));
}

// Stage 4: Validate — Structural validation, acid test, quality scoring

import type { PipelineContext, PipelineStageHandler, StageResult } from "../types";
import { db } from "@/lib/db";
import { ctxFiles, ctxSections, extractions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateSectionContent } from "@/lib/ctx/validator";
import { computeXQSK } from "../scoring/xqs-k";

export const validateStage: PipelineStageHandler = {
  name: "validate",

  async execute(ctx: PipelineContext): Promise<StageResult> {
    ctx.onProgress({
      stage: "validate",
      status: "running",
      message: "Running structural validation...",
      data: {
        type: "validate" as const,
        checksCompleted: 0,
        totalChecks: 3,
        currentCheck: "structural",
      },
      timestamp: Date.now(),
    });

    // Get the CTX file and its sections
    const ctxFileRecords = await db
      .select()
      .from(ctxFiles)
      .where(eq(ctxFiles.extractionId, ctx.extractionId));

    if (ctxFileRecords.length === 0) {
      return {
        success: false,
        tokensUsed: 0,
        durationMs: 0,
        error: "No CTX file found for this extraction",
      };
    }

    const ctxFile = ctxFileRecords[0];
    const sections = await db
      .select()
      .from(ctxSections)
      .where(eq(ctxSections.ctxFileId, ctxFile.id));

    // 1. Structural validation — check each section against Zod schema
    let validSections = 0;
    let totalSections = 0;

    for (const section of sections) {
      if (section.content) {
        totalSections++;
        const result = validateSectionContent(
          section.sectionKey,
          section.content
        );
        if (result.valid) {
          validSections++;
        } else {
          // Flag sections that fail validation
          await db
            .update(ctxSections)
            .set({ status: "flagged", reviewNotes: result.errors.join("; ") })
            .where(eq(ctxSections.id, section.id));
        }
      }
    }

    ctx.onProgress({
      stage: "validate",
      status: "running",
      message: `Structural validation: ${validSections}/${totalSections} sections valid`,
      data: {
        type: "validate" as const,
        checksCompleted: 1,
        totalChecks: 3,
        currentCheck: "quality_scoring",
      },
      timestamp: Date.now(),
    });

    // 2. Compute XQS-K score
    const extractedSections = sections.filter((s) => s.content !== null);
    const xqsK = computeXQSK(extractedSections);

    // Update CTX file with score
    await db
      .update(ctxFiles)
      .set({ xqsKScore: xqsK })
      .where(eq(ctxFiles.id, ctxFile.id));

    // Update extraction with score
    await db
      .update(extractions)
      .set({ xqsScore: xqsK, updatedAt: new Date() })
      .where(eq(extractions.id, ctx.extractionId));

    ctx.onProgress({
      stage: "validate",
      status: "running",
      message: `Quality score: XQS-K = ${xqsK}/100`,
      data: {
        type: "validate" as const,
        checksCompleted: 2,
        totalChecks: 3,
        currentCheck: "acid_test",
        preliminaryScore: xqsK,
      },
      timestamp: Date.now(),
    });

    // 3. Acid test (placeholder — will be implemented with Claude call)
    // TODO: Deploy CTX to fresh Claude instance, test with novel scenario

    return {
      success: true,
      tokensUsed: 0,
      durationMs: 0,
      data: {
        validSections,
        totalSections,
        xqsKScore: xqsK,
      },
    };
  },
};

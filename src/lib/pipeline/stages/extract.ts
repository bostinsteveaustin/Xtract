// Stage 2: Extract — Section-aware extraction for Mode 1
// Loops through target sections, calling Claude per section

import type { PipelineContext, PipelineStageHandler, StageResult } from "../types";
import { db } from "@/lib/db";
import { sources, ctxFiles, ctxSections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CTX_SECTIONS } from "@/lib/ctx/sections";
import { SECTION_SCHEMAS, type SectionKey } from "@/lib/ctx/schema";
import { generateSectionExtraction } from "@/lib/ai/streaming";
import { buildSystemPrompt, buildSectionExtractionPrompt } from "../prompts/section-prompts";

export const extractStage: PipelineStageHandler = {
  name: "extract",

  async execute(ctx: PipelineContext): Promise<StageResult> {
    let totalTokensUsed = 0;

    // Get source texts
    const sourceDocs = await db
      .select()
      .from(sources)
      .where(eq(sources.extractionId, ctx.extractionId));

    const combinedSourceText = sourceDocs
      .map((s) => `--- Source: ${s.fileName} ---\n${s.textContent ?? ""}`)
      .join("\n\n");

    if (!combinedSourceText.trim()) {
      return {
        success: false,
        tokensUsed: 0,
        durationMs: 0,
        error: "No text content found in source documents",
      };
    }

    // Create CTX file record
    const [ctxFile] = await db
      .insert(ctxFiles)
      .values({
        extractionId: ctx.extractionId,
        name: `CTX from extraction ${ctx.extractionId}`,
        status: "draft",
      })
      .returning();

    // Determine which sections to extract
    const targetSections = CTX_SECTIONS.filter((s) => s.recommended || s.key === "objects");
    const systemPrompt = buildSystemPrompt();

    for (let i = 0; i < targetSections.length; i++) {
      const section = targetSections[i];

      ctx.onProgress({
        stage: "extract",
        status: "running",
        message: `Extracting Section ${section.number}: ${section.title}`,
        data: {
          type: "extract" as const,
          totalSections: targetSections.length,
          completedSections: i,
          currentSection: section.title,
          tokensUsed: totalTokensUsed,
        },
        timestamp: Date.now(),
      });

      try {
        const sectionKey = section.key as SectionKey;
        if (!(sectionKey in SECTION_SCHEMAS)) continue;

        const extractionPrompt = buildSectionExtractionPrompt(
          sectionKey,
          combinedSourceText,
          section
        );

        const result = await generateSectionExtraction(
          sectionKey,
          combinedSourceText,
          systemPrompt,
          extractionPrompt
        );

        totalTokensUsed += result.usage?.totalTokens ?? 0;

        // Save extracted section
        await db.insert(ctxSections).values({
          ctxFileId: ctxFile.id,
          sectionKey: section.key,
          sectionNumber: section.number,
          title: section.title,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: result.object as any,
          status: "extracted",
        });
      } catch (error) {
        // Log error but continue with other sections
        console.error(
          `Failed to extract section ${section.key}:`,
          error
        );

        await db.insert(ctxSections).values({
          ctxFileId: ctxFile.id,
          sectionKey: section.key,
          sectionNumber: section.number,
          title: section.title,
          status: "pending",
        });
      }
    }

    return {
      success: true,
      tokensUsed: totalTokensUsed,
      durationMs: 0,
      data: {
        ctxFileId: ctxFile.id,
        sectionsExtracted: targetSections.length,
      },
    };
  },
};

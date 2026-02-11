// Streaming utilities for pipeline extraction with Vercel AI SDK

import { streamObject, generateObject } from "ai";
import { extractionModel } from "./client";
import { SECTION_SCHEMAS, type SectionKey } from "@/lib/ctx/schema";
import type { z } from "zod";

/** Stream extraction of a single CTX section */
export async function streamSectionExtraction(
  sectionKey: SectionKey,
  sourceText: string,
  systemPrompt: string,
  extractionPrompt: string
) {
  const schema = SECTION_SCHEMAS[sectionKey];

  const result = streamObject({
    model: extractionModel,
    schema,
    system: systemPrompt,
    prompt: extractionPrompt,
  });

  return result;
}

/** Generate (non-streaming) extraction of a single CTX section */
export async function generateSectionExtraction(
  sectionKey: SectionKey,
  sourceText: string,
  systemPrompt: string,
  extractionPrompt: string
) {
  const schema = SECTION_SCHEMAS[sectionKey];

  const result = await generateObject({
    model: extractionModel,
    schema,
    system: systemPrompt,
    prompt: extractionPrompt,
  });

  return result;
}

/** Stream extraction of domain objects (Mode 2) with dynamic schema */
export async function streamDomainObjectExtraction(
  sourceText: string,
  objectSchema: z.ZodType,
  systemPrompt: string,
  extractionPrompt: string
) {
  const result = streamObject({
    model: extractionModel,
    schema: objectSchema,
    system: systemPrompt,
    prompt: extractionPrompt,
  });

  return result;
}

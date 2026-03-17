import { generateText } from "ai";
import { extractionModel } from "@/lib/ai/client";
import type { LogEntry } from "@/types/pipeline";

interface CTXProductionInput {
  candidates: unknown;
  transcript: string;
}

interface CTXEnrichmentInput {
  ctxContent: string;
  enrichment: string;
}

interface CTXResult {
  ctxContent: string;
  metrics: {
    definitions: number;
    tacitKnowledge: number;
    references: number;
  };
  logEntries: LogEntry[];
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

interface CTXEnrichmentResult {
  ctxContent: string;
  response: string;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

export async function produceCTX(input: CTXProductionInput): Promise<CTXResult> {
  const log: LogEntry[] = [];

  log.push({ timestamp: ts(), level: "info", message: "Starting CTX production from transcript...", icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: `Transcript length: ${input.transcript.length} characters`, icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: `Candidate classes: ${JSON.stringify(input.candidates).length > 100 ? "loaded" : "minimal"}`, icon: "check" });

  const systemPrompt = `You are a Cortx CTX file producer. Your job is to extract tacit knowledge from an SME transcript and merge it with structured candidate data to produce a .ctx file.

The .ctx file format has these sections:
- @definitions: Key domain terms with their precise meanings
- @tacit_knowledge: Expert insights not found in formal documentation
- @reference_data: Standard reference values and categories
- @objects: Domain entity specifications with attributes and relationships
- @ai-guidance: Instructions for downstream AI processing

Output ONLY the .ctx file content, no explanations.`;

  const userPrompt = `Given these candidate ontology entities:
${JSON.stringify(input.candidates, null, 2).slice(0, 8000)}

And this SME transcript:
${input.transcript.slice(0, 12000)}

Produce a complete .ctx file that merges the structured candidates with tacit knowledge extracted from the transcript. Include:
1. @definitions for key domain terms mentioned by the SME
2. @tacit_knowledge for expert insights (things only a practitioner would know)
3. @reference_data for any standard values or categories mentioned
4. @objects for the main domain entities with their attributes
5. @ai-guidance blocks to help downstream ontology generation`;

  log.push({ timestamp: ts(), level: "info", message: "Calling Claude API for CTX extraction...", icon: "check" });

  try {
    const result = await generateText({
      model: extractionModel,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 8000,
    });

    const ctxContent = result.text;
    const inTok = result.usage?.inputTokens ?? 0;
    const outTok = result.usage?.outputTokens ?? 0;
    const tokenUsage = { promptTokens: inTok, completionTokens: outTok, totalTokens: inTok + outTok };

    // Count sections
    const definitions = (ctxContent.match(/@definition/g) ?? []).length;
    const tacitKnowledge = (ctxContent.match(/@tacit_knowledge/g) ?? []).length;
    const references = (ctxContent.match(/@reference_data/g) ?? []).length;

    log.push({ timestamp: ts(), level: "info", message: `CTX produced: ${definitions} definitions, ${tacitKnowledge} tacit knowledge entries`, icon: "check" });
    log.push({ timestamp: ts(), level: "info", message: `Tokens: ${tokenUsage.promptTokens.toLocaleString()} in / ${tokenUsage.completionTokens.toLocaleString()} out`, icon: "check" });
    log.push({ timestamp: ts(), level: "info", message: "CTX file ready for review", icon: "check" });

    return {
      ctxContent,
      metrics: { definitions, tacitKnowledge, references },
      logEntries: log,
      tokenUsage,
    };
  } catch (e) {
    log.push({ timestamp: ts(), level: "error", message: `Claude API error: ${String(e)}`, icon: "cross" });
    throw e;
  }
}

export async function enrichCTX(input: CTXEnrichmentInput): Promise<CTXEnrichmentResult> {
  const result = await generateText({
    model: extractionModel,
    system: `You are a Cortx CTX file editor. The user wants to add additional context to an existing .ctx file. Update the file with the new information and respond with a short confirmation of what was added.

Output format:
---CTX---
[updated .ctx file content]
---RESPONSE---
[short confirmation message]`,
    prompt: `Current CTX file:
${input.ctxContent.slice(0, 10000)}

User addition:
${input.enrichment}

Update the CTX file to incorporate this new information.`,
    maxOutputTokens: 8000,
  });

  const text = result.text;
  const inTok = result.usage?.inputTokens ?? 0;
  const outTok = result.usage?.outputTokens ?? 0;
  const tokenUsage = { promptTokens: inTok, completionTokens: outTok, totalTokens: inTok + outTok };
  const ctxMatch = text.match(/---CTX---\n?([\s\S]*?)---RESPONSE---/);
  const responseMatch = text.match(/---RESPONSE---\n?([\s\S]*?)$/);

  return {
    ctxContent: ctxMatch?.[1]?.trim() ?? input.ctxContent,
    response: responseMatch?.[1]?.trim() ?? "Context updated.",
    tokenUsage,
  };
}

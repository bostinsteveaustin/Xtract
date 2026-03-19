// POST /api/contract/ingest
// Stage 2: Parse document, chunk by clause, classify parties + document type

import { NextResponse } from "next/server";
import { parseDocument } from "@/lib/contract/document-parser";
import { generateText } from "ai";
import { extractionModel } from "@/lib/ai/client";
import type { LogEntry } from "@/types/pipeline";

export const maxDuration = 300;

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

interface ClassifyResult {
  documentType: string;
  partiesFound: { name: string; role: string }[];
  summary: string;
}

async function classifyDocument(
  documentText: string,
  log: LogEntry[]
): Promise<ClassifyResult> {
  log.push({ timestamp: ts(), level: "info", message: "Classifying document type and identifying parties...", icon: "check" });

  const result = await generateText({
    model: extractionModel,
    system: `You are a contract classification specialist. Analyse the opening sections of a contract and return JSON only.`,
    prompt: `Analyse this contract document and return a JSON object with:
- documentType: one of "msa" | "sow" | "amendment" | "side_letter" | "schedule" | "licence" | "nda" | "services_agreement" | "supply_agreement" | "other"
- partiesFound: array of { name: string, role: "service_provider"|"client"|"guarantor"|"other" }
- summary: one sentence describing what this agreement is about

Contract (first 6000 characters):
${documentText.slice(0, 6000)}

Return ONLY valid JSON. No markdown.`,
    maxOutputTokens: 500,
  });

  let raw = result.text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(raw) as ClassifyResult;
  } catch {
    return {
      documentType: "other",
      partiesFound: [],
      summary: "Unable to classify document",
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      fileContent: string;    // base64
      fileName: string;
      mimeType: string;
      engagementRef?: string;
      clientName?: string;
    };

    const { fileContent, fileName, mimeType } = body;

    if (!fileContent || !fileName) {
      return NextResponse.json({ error: "Missing fileContent or fileName" }, { status: 400 });
    }

    const log: LogEntry[] = [];

    // 1. Parse document
    const parsed = await parseDocument(fileContent, fileName, mimeType ?? "text/plain");
    log.push(...(parsed.logEntries as LogEntry[]));

    // 2. Classify document
    const classification = await classifyDocument(parsed.text, log);

    log.push({
      timestamp: ts(),
      level: "info",
      message: `Document type: ${classification.documentType}`,
      icon: "check",
    });
    log.push({
      timestamp: ts(),
      level: "info",
      message: `Parties identified: ${classification.partiesFound.map((p) => p.name).join(", ") || "none detected"}`,
      icon: "check",
    });
    log.push({
      timestamp: ts(),
      level: "info",
      message: "Ready for extraction",
      icon: "check",
    });

    return NextResponse.json({
      documentText: parsed.text,
      wordCount: parsed.wordCount,
      charCount: parsed.charCount,
      chunks: parsed.sections.length,
      partiesFound: classification.partiesFound.length,
      documentType: classification.documentType,
      documentSummary: classification.summary,
      partiesDetail: classification.partiesFound,
      logEntries: log,
      metrics: {
        wordCount: parsed.wordCount,
        chunks: parsed.sections.length,
        partiesFound: classification.partiesFound.length,
        documentType: classification.documentType,
      },
    });
  } catch (error) {
    console.error("POST /api/contract/ingest error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Ingest failed: ${msg.slice(0, 200)}` }, { status: 500 });
  }
}

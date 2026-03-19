// POST /api/contract/extract
// Stage 3: AI extraction of all 8 contract object types

import { NextResponse } from "next/server";
import { extractContract } from "@/lib/contract/extractor";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      documentText: string;
      engagementRef?: string;
      ctxContent?: string;
    };

    const { documentText, engagementRef, ctxContent } = body;

    if (!documentText) {
      return NextResponse.json({ error: "Missing documentText" }, { status: 400 });
    }

    const output = await extractContract(documentText, engagementRef ?? "ENG", ctxContent);

    return NextResponse.json({
      result: output.result,
      metrics: output.metrics,
      logEntries: output.logEntries,
      tokenUsage: output.tokenUsage,
    });
  } catch (error) {
    console.error("POST /api/contract/extract error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Extraction failed: ${msg.slice(0, 200)}` }, { status: 500 });
  }
}

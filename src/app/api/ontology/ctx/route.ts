import { NextResponse } from "next/server";
import { produceCTX, enrichCTX } from "@/lib/ontology/ctx-producer";
import { requireAuth } from "@/lib/api/auth";

export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, candidates, transcript, ctxContent, enrichment } = body as {
      action?: "produce" | "enrich";
      candidates?: unknown;
      transcript?: string;
      ctxContent?: string;
      enrichment?: string;
    };

    if (action === "enrich") {
      if (!ctxContent || !enrichment) {
        return NextResponse.json(
          { error: "Missing ctxContent or enrichment for enrich action" },
          { status: 400 }
        );
      }

      const result = await enrichCTX({ ctxContent, enrichment });
      return NextResponse.json(result);
    }

    // Default: produce
    if (!candidates || !transcript) {
      return NextResponse.json(
        { error: "Missing candidates or transcript" },
        { status: 400 }
      );
    }

    const result = await produceCTX({ candidates, transcript });
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/ontology/ctx error:", error);
    return NextResponse.json(
      { error: "CTX production failed" },
      { status: 500 }
    );
  }
}

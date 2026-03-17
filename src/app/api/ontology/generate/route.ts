import { NextResponse } from "next/server";
import { generateMapping, generateTurtle } from "@/lib/ontology/ontology-generator";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { step, ctxContent, candidates, config, mappingText } = body as {
      step?: 1 | 2;
      ctxContent: string;
      candidates: unknown;
      config: {
        upperOntology: string;
        namespace: string;
        ontologyTitle: string;
      };
      mappingText?: string;
    };

    if (!ctxContent || !candidates || !config) {
      return NextResponse.json(
        { error: "Missing ctxContent, candidates, or config" },
        { status: 400 }
      );
    }

    // Step 1: Upper ontology mapping (single Claude call, fits in 60s)
    if (step === 1) {
      const result = await generateMapping({ ctxContent, candidates, config });
      return NextResponse.json(result);
    }

    // Step 2: Turtle generation (single Claude call, fits in 60s)
    if (step === 2) {
      if (!mappingText) {
        return NextResponse.json(
          { error: "Missing mappingText for step 2" },
          { status: 400 }
        );
      }
      const result = await generateTurtle({ ctxContent, candidates, config, mappingText });
      return NextResponse.json(result);
    }

    // No step specified — return error (old single-call path removed to prevent timeouts)
    return NextResponse.json(
      { error: "Missing step parameter (1 or 2)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/ontology/generate error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Generation failed: ${msg.slice(0, 200)}` },
      { status: 500 }
    );
  }
}

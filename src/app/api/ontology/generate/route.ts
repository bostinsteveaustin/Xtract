import { NextResponse } from "next/server";
import { generateOntology } from "@/lib/ontology/ontology-generator";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ctxContent, candidates, config } = body as {
      ctxContent: string;
      candidates: unknown;
      config: {
        upperOntology: string;
        namespace: string;
        ontologyTitle: string;
      };
    };

    if (!ctxContent || !candidates || !config) {
      return NextResponse.json(
        { error: "Missing ctxContent, candidates, or config" },
        { status: 400 }
      );
    }

    const result = await generateOntology({ ctxContent, candidates, config });
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/ontology/generate error:", error);
    return NextResponse.json(
      { error: "Ontology generation failed" },
      { status: 500 }
    );
  }
}

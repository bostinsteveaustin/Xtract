import { NextResponse } from "next/server";
import { parseOpenAPI } from "@/lib/ontology/openapi-parser";
import { requireAuth } from "@/lib/api/auth";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { content } = body as { content: string };

    if (!content) {
      return NextResponse.json(
        { error: "Missing content field" },
        { status: 400 }
      );
    }

    const result = parseOpenAPI(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/ontology/parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse OpenAPI content" },
      { status: 500 }
    );
  }
}

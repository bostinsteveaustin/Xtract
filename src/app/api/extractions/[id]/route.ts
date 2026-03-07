// GET /api/extractions/[id] — Get extraction detail with sources, pipeline runs, domain objects

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  extractions,
  sources,
  pipelineRuns,
  domainObjects,
  objectRelationships,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [extraction] = await db
      .select()
      .from(extractions)
      .where(eq(extractions.id, id))
      .limit(1);

    if (!extraction) {
      return NextResponse.json(
        { error: "Extraction not found" },
        { status: 404 }
      );
    }

    const [sourceDocs, runs, objects, relationships] = await Promise.all([
      db.select().from(sources).where(eq(sources.extractionId, id)),
      db
        .select()
        .from(pipelineRuns)
        .where(eq(pipelineRuns.extractionId, id))
        .orderBy(desc(pipelineRuns.startedAt)),
      db
        .select()
        .from(domainObjects)
        .where(eq(domainObjects.extractionId, id)),
      db
        .select()
        .from(objectRelationships)
        .where(eq(objectRelationships.extractionId, id)),
    ]);

    // Filter out metadata objects for the summary
    const realObjects = objects.filter((o) => !o.objectType.startsWith("_"));
    const entityMeta = objects.find((o) => o.objectType === "_entities");

    const summary = {
      totalObjects: realObjects.length,
      averageScore:
        realObjects.length > 0
          ? Math.round(
              realObjects.reduce((s, o) => s + (o.rubricScore ?? 0), 0) /
                realObjects.filter((o) => o.rubricScore != null).length || 0
            )
          : 0,
      averageConfidence:
        realObjects.length > 0
          ? Math.round(
              realObjects.reduce((s, o) => s + (o.confidence ?? 0), 0) /
                realObjects.length
            )
          : 0,
      entitiesFound:
        (entityMeta?.objectData as { entities?: unknown[] })?.entities?.length ?? 0,
    };

    return NextResponse.json({
      extraction,
      sources: sourceDocs,
      pipelineRuns: runs,
      domainObjects: realObjects,
      entities: entityMeta?.objectData ?? null,
      relationships,
      summary,
    });
  } catch (error) {
    console.error("Get extraction error:", error);
    return NextResponse.json(
      { error: "Failed to get extraction" },
      { status: 500 }
    );
  }
}

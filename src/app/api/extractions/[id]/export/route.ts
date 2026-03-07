// GET /api/extractions/[id]/export?format=json|xlsx — Export extraction results

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  extractions,
  sources,
  ctxFiles,
  ctxSections,
  domainObjects,
  objectRelationships,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { serializeToICML } from "@/lib/export/icml-serializer";
import { generateXLSX } from "@/lib/export/xlsx-serializer";
import { serializeToGraph } from "@/lib/export/graph-serializer";
import type { ObjectTypeSpec, ObjectsSection } from "@/types/ctx";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";

    // Load extraction
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

    // Load related data
    const [sourceDocs, objects, relationships] = await Promise.all([
      db.select().from(sources).where(eq(sources.extractionId, id)),
      db
        .select()
        .from(domainObjects)
        .where(eq(domainObjects.extractionId, id)),
      db
        .select()
        .from(objectRelationships)
        .where(eq(objectRelationships.extractionId, id)),
    ]);

    // Load CTX file
    let ctxFile = null;
    if (extraction.ctxFileId) {
      const [result] = await db
        .select()
        .from(ctxFiles)
        .where(eq(ctxFiles.id, extraction.ctxFileId))
        .limit(1);
      ctxFile = result;
    }

    if (!ctxFile) {
      return NextResponse.json(
        { error: "No CTX file associated with this extraction" },
        { status: 400 }
      );
    }

    if (format === "xlsx") {
      // Load the object spec from Section 11
      const sections = await db
        .select()
        .from(ctxSections)
        .where(eq(ctxSections.ctxFileId, ctxFile.id));

      const objectsSection = sections.find(
        (s) => s.sectionKey === "objects"
      );
      const objectsSectionContent =
        objectsSection?.content as unknown as ObjectsSection;
      const objectSpec: ObjectTypeSpec | undefined =
        objectsSectionContent?.objectTypes?.[0];

      if (!objectSpec) {
        return NextResponse.json(
          { error: "No object specification found in CTX" },
          { status: 400 }
        );
      }

      const buffer = await generateXLSX(
        objects,
        objectSpec,
        {
          extractionId: id,
          ctxName: ctxFile.name,
          sourceFileName: sourceDocs[0]?.fileName ?? "Unknown",
        },
        relationships
      );

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="extraction-${id}.xlsx"`,
        },
      });
    }

    // Graph export (Neo4j-compatible nodes + edges)
    if (format === "graph") {
      const graphOutput = serializeToGraph(id, objects, relationships);
      return new Response(JSON.stringify(graphOutput, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="extraction-${id}.graph.json"`,
        },
      });
    }

    // Default: JSON (iCML format)
    const icmlOutput = serializeToICML(
      id,
      sourceDocs,
      objects,
      ctxFile,
      relationships
    );

    return new Response(JSON.stringify(icmlOutput, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="extraction-${id}.icml.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export extraction" },
      { status: 500 }
    );
  }
}

// GET /api/extractions — List all extractions
// POST /api/extractions — Create a new extraction

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractions, sources } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const results = await db
      .select({
        id: extractions.id,
        name: extractions.name,
        description: extractions.description,
        mode: extractions.mode,
        status: extractions.status,
        ctxFileId: extractions.ctxFileId,
        xqsScore: extractions.xqsScore,
        createdAt: extractions.createdAt,
        updatedAt: extractions.updatedAt,
        sourceCount: sql<number>`count(${sources.id})`.as("source_count"),
      })
      .from(extractions)
      .leftJoin(sources, eq(sources.extractionId, extractions.id))
      .groupBy(extractions.id)
      .orderBy(desc(extractions.createdAt));

    return NextResponse.json({ extractions: results });
  } catch (error) {
    console.error("List extractions error:", error);
    return NextResponse.json(
      { error: "Failed to list extractions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, mode = "mode2", ctxFileId, files } = body as {
      name: string;
      mode?: string;
      ctxFileId?: string;
      files?: Array<{
        fileName: string;
        fileType: string;
        fileSize: number;
        blobUrl: string;
      }>;
    };

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (mode === "mode2" && !ctxFileId) {
      return NextResponse.json(
        { error: "CTX file ID is required for Mode 2 extraction" },
        { status: 400 }
      );
    }

    // Create the extraction record
    const [extraction] = await db
      .insert(extractions)
      .values({
        name,
        mode: mode as "mode1" | "mode2",
        status: "created",
        ctxFileId: ctxFileId ?? null,
      })
      .returning();

    // Create source records for uploaded files
    if (files && files.length > 0) {
      for (const file of files) {
        await db.insert(sources).values({
          extractionId: extraction.id,
          fileName: file.fileName,
          fileType: file.fileType as "pdf" | "docx" | "txt" | "md",
          fileSize: file.fileSize,
          blobUrl: file.blobUrl,
        });
      }
    }

    return NextResponse.json({ extraction }, { status: 201 });
  } catch (error) {
    console.error("Create extraction error:", error);
    return NextResponse.json(
      { error: "Failed to create extraction" },
      { status: 500 }
    );
  }
}

// GET /api/ctx — List all CTX files (auto-seeds pre-built CTX on first access)

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ctxFiles, ctxSections } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { seedPrebuiltCTX } from "@/lib/ctx/prebuilt/seed";

export async function GET() {
  try {
    // Auto-seed pre-built CTX files on first access
    await seedPrebuiltCTX();

    const results = await db
      .select({
        id: ctxFiles.id,
        name: ctxFiles.name,
        domain: ctxFiles.domain,
        contextType: ctxFiles.contextType,
        contextId: ctxFiles.contextId,
        version: ctxFiles.version,
        status: ctxFiles.status,
        classification: ctxFiles.classification,
        xqsKScore: ctxFiles.xqsKScore,
        createdAt: ctxFiles.createdAt,
        sectionCount: sql<number>`count(${ctxSections.id})`.as("section_count"),
      })
      .from(ctxFiles)
      .leftJoin(ctxSections, eq(ctxSections.ctxFileId, ctxFiles.id))
      .groupBy(ctxFiles.id)
      .orderBy(desc(ctxFiles.createdAt));

    return NextResponse.json({ ctxFiles: results });
  } catch (error) {
    console.error("List CTX files error:", error);
    return NextResponse.json(
      { error: "Failed to list CTX files" },
      { status: 500 }
    );
  }
}

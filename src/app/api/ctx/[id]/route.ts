// GET /api/ctx/[id] — Get CTX file detail with all sections

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ctxFiles, ctxSections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [ctxFile] = await db
      .select()
      .from(ctxFiles)
      .where(eq(ctxFiles.id, id))
      .limit(1);

    if (!ctxFile) {
      return NextResponse.json(
        { error: "CTX file not found" },
        { status: 404 }
      );
    }

    const sections = await db
      .select()
      .from(ctxSections)
      .where(eq(ctxSections.ctxFileId, id));

    return NextResponse.json({
      ctxFile,
      sections: sections.sort((a, b) => a.sectionNumber - b.sectionNumber),
    });
  } catch (error) {
    console.error("Get CTX file error:", error);
    return NextResponse.json(
      { error: "Failed to get CTX file" },
      { status: 500 }
    );
  }
}

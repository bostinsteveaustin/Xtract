// Seed pre-built CTX files into the database
// Called automatically from GET /api/ctx on first access

import { db } from "@/lib/db";
import { ctxFiles, ctxSections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { VENDOR_MANAGEMENT_CTX } from "./vendor-management-contracts";
import { CTX_SECTIONS } from "@/lib/ctx/sections";
import type { SectionContent } from "@/types/ctx";

/** Seed the pre-built vendor management contracts CTX if it doesn't exist */
export async function seedPrebuiltCTX(): Promise<{
  seeded: boolean;
  ctxFileId: string;
}> {
  // Check if already seeded
  const existing = await db
    .select({ id: ctxFiles.id })
    .from(ctxFiles)
    .where(eq(ctxFiles.contextId, "vendor-management-contracts"))
    .limit(1);

  if (existing.length > 0) {
    return { seeded: false, ctxFileId: existing[0].id };
  }

  const ctx = VENDOR_MANAGEMENT_CTX;

  // Insert the CTX file record
  const [ctxFile] = await db
    .insert(ctxFiles)
    .values({
      name: ctx.frontMatter.title,
      domain: ctx.organisationalMetadata.domain,
      contextType: ctx.frontMatter.context_type,
      contextId: ctx.frontMatter.context_id,
      status: "approved",
      classification: ctx.organisationalMetadata.classification,
      dataSensitivity: ctx.organisationalMetadata.data_sensitivity,
      version: 1,
      xqsKScore: 85,
      visibility: ctx.organisationalMetadata.visibility,
      contentSections: ctx.organisationalMetadata.content_sections,
    })
    .returning();

  // Insert sections that have content
  const sectionEntries = Object.entries(ctx.sections) as [
    string,
    SectionContent | undefined,
  ][];

  for (const [key, content] of sectionEntries) {
    if (!content) continue;

    const sectionMeta = CTX_SECTIONS.find((s) => s.key === key);
    if (!sectionMeta) continue;

    await db.insert(ctxSections).values({
      ctxFileId: ctxFile.id,
      sectionKey: key,
      sectionNumber: sectionMeta.number,
      title: sectionMeta.title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: content as any,
      status: "approved",
    });
  }

  return { seeded: true, ctxFileId: ctxFile.id };
}

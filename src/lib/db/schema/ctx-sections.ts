import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { generateId } from "@/lib/utils/id";
import { ctxFiles } from "./ctx-files";
import type { SectionContent } from "@/types/ctx";

export const sectionStatusEnum = pgEnum("section_status", [
  "pending",
  "extracted",
  "reviewed",
  "approved",
  "flagged",
]);

export const ctxSections = pgTable("ctx_sections", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  ctxFileId: text("ctx_file_id")
    .references(() => ctxFiles.id, { onDelete: "cascade" })
    .notNull(),
  /** Section key (e.g. "definitions", "methodology", "objects") */
  sectionKey: text("section_key").notNull(),
  /** Section number 1-11 */
  sectionNumber: integer("section_number").notNull(),
  /** Human-readable section title */
  title: text("title").notNull(),
  /** Structured section content (validated by Zod at app layer) */
  content: jsonb("content").$type<SectionContent>(),
  /** Raw markdown/text version of the section */
  rawContent: text("raw_content"),
  /** Per-section quality score */
  qualityScore: integer("quality_score"),
  /** Reviewer notes */
  reviewNotes: text("review_notes"),
  /** Section review status */
  status: sectionStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CTXSectionRecord = typeof ctxSections.$inferSelect;
export type NewCTXSection = typeof ctxSections.$inferInsert;

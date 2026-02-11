import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { generateId } from "@/lib/utils/id";
import { extractions } from "./extractions";
import type { SourceMetadata } from "@/types/extraction";

export const sourceTypeEnum = pgEnum("source_type", [
  "pdf",
  "docx",
  "txt",
  "md",
]);

export const sources = pgTable("sources", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  extractionId: text("extraction_id")
    .references(() => extractions.id, { onDelete: "cascade" })
    .notNull(),
  fileName: text("file_name").notNull(),
  fileType: sourceTypeEnum("file_type").notNull(),
  /** File size in bytes */
  fileSize: integer("file_size").notNull(),
  /** Vercel Blob URL for the uploaded file */
  blobUrl: text("blob_url").notNull(),
  /** Extracted raw text content */
  textContent: text("text_content"),
  /** Number of chunks after processing */
  chunkCount: integer("chunk_count"),
  /** Document metadata (page count, language, word count, etc.) */
  metadata: jsonb("metadata").$type<SourceMetadata>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { generateId } from "@/lib/utils/id";
import type { ExtractionConfig } from "@/types/extraction";

export const extractionModeEnum = pgEnum("extraction_mode", [
  "mode1",
  "mode2",
]);

export const extractionStatusEnum = pgEnum("extraction_status", [
  "created",
  "ingesting",
  "extracting",
  "synthesising",
  "validating",
  "review",
  "approved",
  "failed",
]);

export const extractions = pgTable("extractions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text("name").notNull(),
  description: text("description"),
  mode: extractionModeEnum("mode").notNull().default("mode1"),
  status: extractionStatusEnum("status").notNull().default("created"),
  /** For Mode 2: the CTX file used as extraction lens */
  ctxFileId: text("ctx_file_id"),
  /** Extraction configuration parameters */
  config: jsonb("config").$type<ExtractionConfig>(),
  /** Final quality score (XQS-K for Mode 1, XQS-D for Mode 2) */
  xqsScore: integer("xqs_score"),
  /** Error message if extraction failed */
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Extraction = typeof extractions.$inferSelect;
export type NewExtraction = typeof extractions.$inferInsert;

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
import type {
  ContextType,
  CTXStatus,
  Classification,
  DataSensitivity,
} from "@/types/ctx";

export const ctxStatusEnum = pgEnum("ctx_status", [
  "draft",
  "in_review",
  "approved",
]);

export const ctxFiles = pgTable("ctx_files", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  /** The extraction that produced this CTX file (null for pre-built CTXs) */
  extractionId: text("extraction_id")
    .references(() => extractions.id, { onDelete: "cascade" }),
  /** Human-readable name */
  name: text("name").notNull(),
  /** Primary domain (e.g. "Technology procurement") */
  domain: text("domain"),
  /** CTX context type (methodology, reference, playbook, framework) */
  contextType: text("context_type").$type<ContextType>(),
  /** Unique context ID (lowercase alphanumeric with hyphens) */
  contextId: text("context_id"),
  /** Semver version */
  version: integer("version").notNull().default(1),
  /** Review/approval status */
  status: ctxStatusEnum("status").notNull().default("draft"),
  /** Classification level */
  classification: text("classification")
    .$type<Classification>()
    .default("internal"),
  /** Data sensitivity */
  dataSensitivity: text("data_sensitivity")
    .$type<DataSensitivity>()
    .default("none"),
  /** XQS-K quality score */
  xqsKScore: integer("xqs_k_score"),
  /** Per-section visibility settings */
  visibility: jsonb("visibility").$type<Record<string, string>>(),
  /** Per-section completeness inventory */
  contentSections: jsonb("content_sections").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CTXFileRecord = typeof ctxFiles.$inferSelect;
export type NewCTXFile = typeof ctxFiles.$inferInsert;

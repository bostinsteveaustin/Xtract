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
import { ctxFiles } from "./ctx-files";
import type { ExtractionProvenance, ConfidenceLevel } from "@/types/icml";

export const domainObjectStatusEnum = pgEnum("domain_object_status", [
  "pending",
  "valid",
  "flagged",
  "rejected",
  "approved",
]);

export const domainObjects = pgTable("domain_objects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  extractionId: text("extraction_id")
    .references(() => extractions.id, { onDelete: "cascade" })
    .notNull(),
  ctxFileId: text("ctx_file_id")
    .references(() => ctxFiles.id)
    .notNull(),
  /** iCML-style object ID (e.g. "icml:OBJ-CC-001") */
  objectIcmlId: text("object_icml_id"),
  /** Object type from CTX Section 11 (e.g. "ComplianceControl") */
  objectType: text("object_type").notNull(),
  /** The extracted object data conforming to the Section 11 schema */
  objectData: jsonb("object_data")
    .$type<Record<string, unknown>>()
    .notNull(),
  /** Source document reference */
  sourceRef: text("source_ref"),
  /** Overall confidence 0-100 */
  confidence: integer("confidence"),
  /** Per-attribute confidence */
  attributeConfidence: jsonb("attribute_confidence").$type<
    Record<string, ConfidenceLevel>
  >(),
  /** Full provenance metadata */
  provenance: jsonb("provenance").$type<ExtractionProvenance>(),
  /** Rubric score (from Section 3 assessment) */
  rubricScore: integer("rubric_score"),
  /** Rubric level name (e.g. "Good", "Adequate") */
  rubricLevel: text("rubric_level"),
  /** Scoring rationale */
  scoringRationale: text("scoring_rationale"),
  /** Validation/review status */
  validationStatus: domainObjectStatusEnum("validation_status")
    .notNull()
    .default("pending"),
  /** Reviewer notes */
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DomainObject = typeof domainObjects.$inferSelect;
export type NewDomainObject = typeof domainObjects.$inferInsert;

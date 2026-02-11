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
import type { PipelineRunMetadata } from "@/types/pipeline";

export const pipelineStageEnum = pgEnum("pipeline_stage", [
  "ingest",
  "extract",
  "synthesise",
  "validate",
]);

export const pipelineStageStatusEnum = pgEnum("pipeline_stage_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);

export const pipelineRuns = pgTable("pipeline_runs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  extractionId: text("extraction_id")
    .references(() => extractions.id, { onDelete: "cascade" })
    .notNull(),
  /** Which pipeline stage */
  stage: pipelineStageEnum("stage").notNull(),
  /** Current status of this stage */
  status: pipelineStageStatusEnum("stage_status")
    .notNull()
    .default("pending"),
  /** When the stage started */
  startedAt: timestamp("started_at"),
  /** When the stage completed */
  completedAt: timestamp("completed_at"),
  /** Duration in milliseconds */
  durationMs: integer("duration_ms"),
  /** Total tokens used by LLM calls in this stage */
  tokensUsed: integer("tokens_used"),
  /** Error message if stage failed */
  errorMessage: text("error_message"),
  /** Stage-specific metadata */
  metadata: jsonb("metadata").$type<PipelineRunMetadata>(),
});

export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type NewPipelineRun = typeof pipelineRuns.$inferInsert;

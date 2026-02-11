// Pipeline types and interfaces

import type {
  PipelineStage,
  PipelineStageStatus,
  PipelineEvent,
} from "@/types/pipeline";
import type { ExtractionMode } from "@/types/extraction";
import type { Source } from "@/lib/db/schema";

export interface PipelineContext {
  /** The extraction ID being processed */
  extractionId: string;
  /** Mode 1 (knowledge extraction) or Mode 2 (domain object extraction) */
  mode: ExtractionMode;
  /** Source documents for this extraction */
  sources: Source[];
  /** CTX file ID (required for Mode 2) */
  ctxFileId?: string;
  /** Callback for progress events */
  onProgress: (event: PipelineEvent) => void;
}

export interface StageResult {
  /** Whether the stage succeeded */
  success: boolean;
  /** Tokens consumed by LLM calls */
  tokensUsed: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if failed */
  error?: string;
  /** Stage-specific output data */
  data?: Record<string, unknown>;
}

export interface PipelineStageHandler {
  /** Stage identifier */
  name: PipelineStage;
  /** Execute this pipeline stage */
  execute(ctx: PipelineContext): Promise<StageResult>;
}

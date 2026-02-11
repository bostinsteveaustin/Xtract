// Pipeline status, stage, and event types

export type PipelineStage = "ingest" | "extract" | "synthesise" | "validate";

export type PipelineStageStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface PipelineEvent {
  /** Which pipeline stage this event relates to */
  stage: PipelineStage;
  /** Current status of the stage */
  status: PipelineStageStatus;
  /** Human-readable progress message */
  message: string;
  /** Stage-specific progress data */
  data?: PipelineEventData;
  /** Event timestamp */
  timestamp: number;
}

export type PipelineEventData =
  | IngestProgressData
  | ExtractProgressData
  | Mode2ProgressData
  | SynthesiseProgressData
  | ValidateProgressData;

export interface IngestProgressData {
  type: "ingest";
  /** Total source files */
  totalFiles: number;
  /** Files processed so far */
  processedFiles: number;
  /** Current file being processed */
  currentFile?: string;
}

export interface ExtractProgressData {
  type: "extract";
  /** Total sections to extract */
  totalSections: number;
  /** Sections completed */
  completedSections: number;
  /** Current section being extracted */
  currentSection?: string;
  /** Tokens used so far */
  tokensUsed?: number;
}

export interface Mode2ProgressData {
  type: "mode2";
  /** Current pass number (1-5) */
  pass: number;
  /** Total passes */
  totalPasses: number;
  /** Additional pass-specific data */
  [key: string]: unknown;
}

export interface SynthesiseProgressData {
  type: "synthesise";
  /** Synthesis phase description */
  phase: string;
}

export interface ValidateProgressData {
  type: "validate";
  /** Validation checks completed */
  checksCompleted: number;
  /** Total validation checks */
  totalChecks: number;
  /** Current check being run */
  currentCheck?: string;
  /** Preliminary XQS score */
  preliminaryScore?: number;
}

export interface PipelineRunMetadata {
  /** Stage-specific metadata */
  stageData?: Record<string, unknown>;
  /** Model used for this stage */
  model?: string;
  /** Number of API calls made */
  apiCalls?: number;
}

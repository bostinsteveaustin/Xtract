// ─── Step status state machine ────────────────────────────────────
// locked → active → running → complete
//                  └→ error → active (retry)

export type StepStatus = "locked" | "active" | "running" | "complete" | "error";

export type InteractionType =
  | "file-drop-zone"
  | "pipeline-log"
  | "context-chat"
  | "flag-review"
  | "pipeline-config"
  | "metric-cards"
  | "download-grid"
  | "validation-table";

// ─── Step & Template Definitions ──────────────────────────────────

export interface StepDefinition {
  stepId: string;
  stepNumber: number;
  label: string;
  title: string;
  description: string;
  interactionTypes: InteractionType[];
  executionEndpoint?: string;
  config: Record<string, unknown>;
}

export interface PipelineTemplate {
  templateId: string;
  name: string;
  version: string;
  description: string;
  steps: StepDefinition[];
  defaultMode: "guided" | "auto";
}

// ─── Runtime State ────────────────────────────────────────────────

export type LogIcon = "check" | "flag" | "cross";
export type LogLevel = "info" | "warning" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  icon?: LogIcon;
}

export type FlagType =
  | "missing_taxonomy"
  | "contested_classification"
  | "absent_field"
  | "inferred_class"
  | "data_quality";

export type FlagResolution = "pending" | "accepted" | "overridden";

export interface PipelineFlag {
  id: string;
  type: FlagType;
  entity: string;
  description: string;
  source: string;
  suggestedResolution: string;
  resolution: FlagResolution;
  requiresHumanInput: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface StepState {
  stepId: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  data: Record<string, unknown>;
  error?: { code: string; message: string };
  flags: PipelineFlag[];
  logEntries: LogEntry[];
}

export interface PipelineExecutionState {
  runId: string;
  workflowId: string;
  templateId: string;
  mode: "guided" | "auto";
  currentStepIndex: number;
  stepStates: Record<string, StepState>;
  metadata: {
    startedAt: string;
    completedAt?: string;
    initiatedBy: string;
  };
}

// ─── Interaction component props contracts ────────────────────────

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "select" | "file";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "system";
  content: string;
  timestamp: string;
}

export interface MetricItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface DownloadFile {
  name: string;
  size: string;
  format: string;
  url?: string;
  blob?: Blob;
}

export interface BenchmarkQuery {
  name: string;
  description?: string;
  expected: string[];
  actual: string[];
  passed: boolean;
}

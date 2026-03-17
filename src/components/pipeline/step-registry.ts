import type { ComponentType } from "react";
import type { StepState, LogEntry, PipelineFlag, FlagResolution, TokenUsage } from "@/types/pipeline";

export interface StepBodyProps {
  workflowId: string;
  stepId: string;
  stepState: StepState;
  allStepStates: Record<string, StepState>;
  onUpdateData: (data: Record<string, unknown>) => void;
  onStart: () => void;
  onComplete: (data?: Record<string, unknown>) => void;
  onError: (error: { code: string; message: string }) => void;
  onLogEntry: (entry: LogEntry) => void;
  onUpdateFlags: (flags: PipelineFlag[]) => void;
  onResolveFlag: (flagId: string, resolution: FlagResolution) => void;
  onUpdateTokenUsage: (tokenUsage: TokenUsage) => void;
}

export type StepBodyComponent = ComponentType<StepBodyProps>;

// Registry: templateId → stepId → lazy component
const registry: Record<string, Record<string, () => Promise<{ default: StepBodyComponent }>>> = {
  "ontology-v1": {
    configuration: () => import("./steps/ontology/config-step"),
    "ingest-parse": () => import("./steps/ontology/ingest-step"),
    "ctx-production": () => import("./steps/ontology/ctx-step"),
    "ontology-generation": () => import("./steps/ontology/generation-step"),
    "export-validate": () => import("./steps/ontology/export-step"),
  },
};

export function getStepBodyLoader(
  templateId: string,
  stepId: string
): (() => Promise<{ default: StepBodyComponent }>) | null {
  return registry[templateId]?.[stepId] ?? null;
}

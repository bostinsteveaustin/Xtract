"use client";

import { useState, useCallback, useMemo } from "react";
import { nanoid } from "nanoid";
import type {
  PipelineTemplate,
  PipelineExecutionState,
  StepState,
  StepStatus,
  LogEntry,
  PipelineFlag,
  FlagResolution,
  TokenUsage,
} from "@/types/pipeline";

function initStepStates(template: PipelineTemplate): Record<string, StepState> {
  const states: Record<string, StepState> = {};
  template.steps.forEach((step, i) => {
    states[step.stepId] = {
      stepId: step.stepId,
      status: i === 0 ? "active" : "locked",
      data: {},
      flags: [],
      logEntries: [],
    };
  });
  return states;
}

export function usePipelineExecution(
  workflowId: string,
  template: PipelineTemplate
) {
  const [state, setState] = useState<PipelineExecutionState>(() => ({
    runId: nanoid(12),
    workflowId,
    templateId: template.templateId,
    mode: template.defaultMode,
    currentStepIndex: 0,
    stepStates: initStepStates(template),
    metadata: {
      startedAt: new Date().toISOString(),
      initiatedBy: "user",
    },
  }));

  const currentStep = template.steps[state.currentStepIndex];

  const getStepState = useCallback(
    (stepId: string): StepState =>
      state.stepStates[stepId] ?? {
        stepId,
        status: "locked" as StepStatus,
        data: {},
        flags: [],
        logEntries: [],
      },
    [state.stepStates]
  );

  const updateStep = useCallback(
    (stepId: string, updates: Partial<StepState>) => {
      setState((prev) => ({
        ...prev,
        stepStates: {
          ...prev.stepStates,
          [stepId]: { ...prev.stepStates[stepId], ...updates },
        },
      }));
    },
    []
  );

  const updateStepData = useCallback(
    (stepId: string, data: Record<string, unknown>) => {
      setState((prev) => ({
        ...prev,
        stepStates: {
          ...prev.stepStates,
          [stepId]: {
            ...prev.stepStates[stepId],
            data: { ...prev.stepStates[stepId].data, ...data },
          },
        },
      }));
    },
    []
  );

  const startStep = useCallback(
    (stepId: string) => {
      updateStep(stepId, {
        status: "running",
        startedAt: new Date().toISOString(),
      });
    },
    [updateStep]
  );

  const completeStep = useCallback(
    (stepId: string, data?: Record<string, unknown>) => {
      setState((prev) => {
        const newStates = { ...prev.stepStates };
        newStates[stepId] = {
          ...newStates[stepId],
          status: "complete",
          completedAt: new Date().toISOString(),
          ...(data ? { data: { ...newStates[stepId].data, ...data } } : {}),
        };

        // Unlock next step
        const nextIndex = prev.currentStepIndex + 1;
        if (nextIndex < template.steps.length) {
          const nextStepId = template.steps[nextIndex].stepId;
          newStates[nextStepId] = {
            ...newStates[nextStepId],
            status: "active",
          };
        }

        return {
          ...prev,
          currentStepIndex: Math.min(nextIndex, template.steps.length - 1),
          stepStates: newStates,
          metadata: {
            ...prev.metadata,
            ...(nextIndex >= template.steps.length
              ? { completedAt: new Date().toISOString() }
              : {}),
          },
        };
      });
    },
    [template.steps]
  );

  const failStep = useCallback(
    (stepId: string, error: { code: string; message: string }) => {
      updateStep(stepId, { status: "error", error });
    },
    [updateStep]
  );

  const retryStep = useCallback(
    (stepId: string) => {
      updateStep(stepId, { status: "active", error: undefined });
    },
    [updateStep]
  );

  const addLogEntry = useCallback(
    (stepId: string, entry: LogEntry) => {
      setState((prev) => ({
        ...prev,
        stepStates: {
          ...prev.stepStates,
          [stepId]: {
            ...prev.stepStates[stepId],
            logEntries: [...prev.stepStates[stepId].logEntries, entry],
          },
        },
      }));
    },
    []
  );

  const updateFlags = useCallback(
    (stepId: string, flags: PipelineFlag[]) => {
      updateStep(stepId, { flags });
    },
    [updateStep]
  );

  const resolveFlag = useCallback(
    (stepId: string, flagId: string, resolution: FlagResolution) => {
      setState((prev) => {
        const stepState = prev.stepStates[stepId];
        const updatedFlags = stepState.flags.map((f) =>
          f.id === flagId
            ? { ...f, resolution, resolvedAt: new Date().toISOString() }
            : f
        );
        return {
          ...prev,
          stepStates: {
            ...prev.stepStates,
            [stepId]: { ...stepState, flags: updatedFlags },
          },
        };
      });
    },
    []
  );

  const updateTokenUsage = useCallback(
    (stepId: string, tokenUsage: TokenUsage) => {
      setState((prev) => {
        const existing = prev.stepStates[stepId]?.tokenUsage;
        const merged: TokenUsage = existing
          ? {
              promptTokens: existing.promptTokens + tokenUsage.promptTokens,
              completionTokens: existing.completionTokens + tokenUsage.completionTokens,
              totalTokens: existing.totalTokens + tokenUsage.totalTokens,
            }
          : tokenUsage;
        return {
          ...prev,
          stepStates: {
            ...prev.stepStates,
            [stepId]: { ...prev.stepStates[stepId], tokenUsage: merged },
          },
        };
      });
    },
    []
  );

  const setMode = useCallback((mode: "guided" | "auto") => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const totalTokenUsage = useMemo((): TokenUsage => {
    let promptTokens = 0;
    let completionTokens = 0;
    for (const ss of Object.values(state.stepStates)) {
      if (ss.tokenUsage) {
        promptTokens += ss.tokenUsage.promptTokens;
        completionTokens += ss.tokenUsage.completionTokens;
      }
    }
    return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
  }, [state.stepStates]);

  const pendingFlagCount = useMemo(() => {
    if (!currentStep) return 0;
    const stepState = state.stepStates[currentStep.stepId];
    return stepState?.flags.filter((f) => f.resolution === "pending").length ?? 0;
  }, [currentStep, state.stepStates]);

  return {
    state,
    currentStep,
    getStepState,
    updateStepData,
    startStep,
    completeStep,
    failStep,
    retryStep,
    addLogEntry,
    updateFlags,
    resolveFlag,
    updateTokenUsage,
    setMode,
    totalTokenUsage,
    pendingFlagCount,
  };
}

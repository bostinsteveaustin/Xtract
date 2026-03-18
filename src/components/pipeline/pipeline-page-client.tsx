"use client";

import { lazy, Suspense, useMemo, useEffect, useRef } from "react";
import { PipelineBody } from "./pipeline-body";
import { StepCard } from "./step-card";
import { StepConnector } from "./step-connector";
import { RunHistoryPanel } from "./run-history-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { usePipelineExecution } from "@/hooks/use-pipeline-execution";
import { getStepBodyLoader, type StepBodyProps } from "./step-registry";
import type { PipelineTemplate } from "@/types/pipeline";

interface PipelinePageClientProps {
  workflowId: string;
  workflowName: string;
  template: PipelineTemplate;
}

function StepSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export function PipelinePageClient({
  workflowId,
  workflowName,
  template,
}: PipelinePageClientProps) {
  const {
    state,
    getStepState,
    updateStepData,
    startStep,
    completeStep,
    failStep,
    addLogEntry,
    updateFlags,
    resolveFlag,
    updateTokenUsage,
    setMode,
    totalTokenUsage,
  } = usePipelineExecution(workflowId, template);

  // Save run to DB when pipeline completes
  const savedRef = useRef(false);
  const isComplete = state.metadata.completedAt != null;
  useEffect(() => {
    if (!isComplete || savedRef.current) return;
    savedRef.current = true;

    const stepTokenLog = template.steps
      .map((step) => {
        const ss = state.stepStates[step.stepId];
        if (!ss?.tokenUsage || ss.tokenUsage.totalTokens === 0) return null;
        return {
          stepId: step.stepId,
          stepLabel: step.title,
          promptTokens: ss.tokenUsage.promptTokens,
          completionTokens: ss.tokenUsage.completionTokens,
          totalTokens: ss.tokenUsage.totalTokens,
        };
      })
      .filter(Boolean);

    fetch(`/api/workflows/${workflowId}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: state.runId,
        status: "completed",
        promptTokens: totalTokenUsage.promptTokens,
        completionTokens: totalTokenUsage.completionTokens,
        stepTokenLog,
      }),
    }).catch(() => {
      // Silent fail — run history is non-critical
    });
  }, [isComplete, state, template, workflowId, totalTokenUsage]);

  // Lazy-load step body components
  const StepComponents = useMemo(() => {
    const map: Record<string, React.LazyExoticComponent<React.ComponentType<StepBodyProps>>> = {};
    for (const step of template.steps) {
      const loader = getStepBodyLoader(template.templateId, step.stepId);
      if (loader) {
        map[step.stepId] = lazy(loader);
      }
    }
    return map;
  }, [template]);

  return (
    <PipelineBody
      workflowId={workflowId}
      workflowName={workflowName}
      metadata={{
        templateName: template.name,
        runId: state.runId,
      }}
      mode={state.mode}
      onModeChange={setMode}
      totalTokenUsage={totalTokenUsage}
    >
      {template.steps.map((step, i) => {
        const stepState = getStepState(step.stepId);
        const StepBody = StepComponents[step.stepId];
        const flagCount = stepState.flags.filter(
          (f) => f.resolution === "pending"
        ).length;

        return (
          <div key={step.stepId}>
            {i > 0 && (
              <StepConnector
                prevStatus={getStepState(template.steps[i - 1].stepId).status}
              />
            )}
            <StepCard
              stepNumber={step.stepNumber}
              label={step.label}
              title={step.title}
              status={stepState.status}
              flagCount={flagCount > 0 ? flagCount : undefined}
              tokenUsage={stepState.tokenUsage}
            >
              {StepBody ? (
                <Suspense fallback={<StepSkeleton />}>
                  <StepBody
                    workflowId={workflowId}
                    stepId={step.stepId}
                    stepState={stepState}
                    allStepStates={state.stepStates}
                    onUpdateData={(data) => updateStepData(step.stepId, data)}
                    onStart={() => startStep(step.stepId)}
                    onComplete={(data) => completeStep(step.stepId, data)}
                    onError={(error) => failStep(step.stepId, error)}
                    onLogEntry={(entry) => addLogEntry(step.stepId, entry)}
                    onUpdateFlags={(flags) => updateFlags(step.stepId, flags)}
                    onResolveFlag={(flagId, resolution) =>
                      resolveFlag(step.stepId, flagId, resolution)
                    }
                    onUpdateTokenUsage={(usage) =>
                      updateTokenUsage(step.stepId, usage)
                    }
                  />
                </Suspense>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              )}
            </StepCard>
          </div>
        );
      })}

      {/* Run history */}
      <div className="mt-8">
        <RunHistoryPanel workflowId={workflowId} />
      </div>
    </PipelineBody>
  );
}

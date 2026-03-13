"use client";

import { lazy, Suspense, useMemo } from "react";
import { PipelineBody } from "./pipeline-body";
import { StepCard } from "./step-card";
import { StepConnector } from "./step-connector";
import { Skeleton } from "@/components/ui/skeleton";
import { usePipelineExecution } from "@/hooks/use-pipeline-execution";
import { getStepBodyLoader, type StepBodyProps } from "./step-registry";
import type { PipelineTemplate } from "@/types/pipeline";

interface PipelinePageClientProps {
  workflowId: string;
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
    setMode,
  } = usePipelineExecution(workflowId, template);

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
      metadata={{
        templateName: template.name,
        runId: state.runId,
      }}
      mode={state.mode}
      onModeChange={setMode}
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
    </PipelineBody>
  );
}

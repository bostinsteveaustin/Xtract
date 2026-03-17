"use client";

import { useEffect, useRef, useState } from "react";
import { PipelineLog } from "../../interactions/pipeline-log";
import { FlagReview } from "../../interactions/flag-review";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";
import type { LogEntry, PipelineFlag } from "@/types/pipeline";

export default function GenerationStep({
  stepState,
  allStepStates,
  onStart,
  onComplete,
  onError,
  onLogEntry,
  onUpdateFlags,
  onResolveFlag,
  onUpdateData,
  onUpdateTokenUsage,
}: StepBodyProps) {
  const [running, setRunning] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (
      stepState.status === "active" &&
      !hasRun.current &&
      allStepStates["ctx-production"]?.status === "complete"
    ) {
      hasRun.current = true;
      runGeneration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepState.status]);

  const runGeneration = async () => {
    setRunning(true);
    onStart();

    const configData = allStepStates.configuration?.data;
    const config = configData?.config as Record<string, string> | undefined;
    const ctxContent = allStepStates["ctx-production"]?.data?.ctxContent as string | undefined;
    const candidates = allStepStates["ingest-parse"]?.data?.candidates;

    if (!ctxContent || !candidates) {
      onError({ code: "NO_INPUT", message: "Missing CTX content or candidates" });
      setRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/ontology/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ctxContent,
          candidates,
          config: {
            upperOntology: config?.upperOntology ?? "gist-core",
            namespace: config?.namespace ?? "",
            ontologyTitle: config?.ontologyTitle ?? "",
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        onError({ code: "GEN_ERROR", message: err.error ?? "Generation failed" });
        setRunning(false);
        return;
      }

      const data = await res.json();

      // Stream log entries
      const entries = data.logEntries as LogEntry[] ?? [];
      for (const entry of entries) {
        onLogEntry(entry);
        await new Promise((r) => setTimeout(r, 50));
      }

      // Set flags
      if (data.flags) {
        onUpdateFlags(data.flags as PipelineFlag[]);
      }

      // Store turtle content
      onUpdateData({
        turtle: data.turtle,
        metrics: data.metrics,
      });

      if (data.tokenUsage) onUpdateTokenUsage(data.tokenUsage);
      setRunning(false);
    } catch (e) {
      onError({ code: "NETWORK", message: String(e) });
      setRunning(false);
    }
  };

  const pendingFlags = stepState.flags.filter((f) => f.resolution === "pending");
  const canCommit = !running && stepState.data.turtle && pendingFlags.length === 0;

  const handleCommit = () => {
    onComplete({
      turtle: stepState.data.turtle,
      metrics: stepState.data.metrics,
      resolvedFlags: stepState.flags,
    });
  };

  return (
    <div className="space-y-4">
      <PipelineLog entries={stepState.logEntries} streaming={running} />

      {running && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating ontology (this may take up to 60s)...
        </div>
      )}

      {stepState.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">{stepState.error.message}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              hasRun.current = false;
              runGeneration();
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            Retry generation
          </Button>
        </div>
      )}

      {stepState.flags.length > 0 && (
        <FlagReview
          flags={stepState.flags}
          onAccept={(id) => onResolveFlag(id, "accepted")}
          onOverride={(id) => onResolveFlag(id, "overridden")}
        />
      )}

      {stepState.data.turtle != null && (
        <Button
          onClick={handleCommit}
          disabled={!canCommit}
          className="bg-[var(--pipeline-navy)] hover:bg-[var(--pipeline-navy)]/90"
        >
          {pendingFlags.length > 0
            ? `Resolve ${pendingFlags.length} flag${pendingFlags.length !== 1 ? "s" : ""} to continue`
            : "Commit ontology & continue"}
        </Button>
      )}
    </div>
  );
}

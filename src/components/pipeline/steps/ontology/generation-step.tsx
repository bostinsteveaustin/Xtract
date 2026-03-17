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
  const [phase, setPhase] = useState<"idle" | "mapping" | "turtle">("idle");
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
    setPhase("mapping");
    onStart();

    const configData = allStepStates.configuration?.data;
    const config = configData?.config as Record<string, string> | undefined;
    const ctxContent = allStepStates["ctx-production"]?.data?.ctxContent as string | undefined;
    const candidates = allStepStates["ingest-parse"]?.data?.candidates;

    if (!ctxContent || !candidates) {
      onError({ code: "NO_INPUT", message: "Missing CTX content or candidates" });
      setRunning(false);
      setPhase("idle");
      return;
    }

    const genConfig = {
      upperOntology: config?.upperOntology ?? "gist-core",
      namespace: config?.namespace ?? "",
      ontologyTitle: config?.ontologyTitle ?? "",
    };

    try {
      // ── Call 1: Upper ontology mapping (fits in 60s) ──
      const res1 = await fetch("/api/ontology/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 1,
          ctxContent,
          candidates,
          config: genConfig,
        }),
      });

      if (!res1.ok) {
        const err = await res1.json().catch(() => ({ error: "Mapping failed" }));
        onError({ code: "MAP_ERROR", message: err.error ?? "Mapping failed" });
        setRunning(false);
        setPhase("idle");
        return;
      }

      const mapData = await res1.json();

      // Stream mapping log entries
      const mapEntries = mapData.logEntries as LogEntry[] ?? [];
      for (const entry of mapEntries) {
        onLogEntry(entry);
        await new Promise((r) => setTimeout(r, 50));
      }

      // Report mapping token usage
      if (mapData.tokenUsage) onUpdateTokenUsage(mapData.tokenUsage);

      // ── Call 2: Turtle generation (fits in 60s) ──
      setPhase("turtle");

      const res2 = await fetch("/api/ontology/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 2,
          ctxContent,
          candidates,
          config: genConfig,
          mappingText: mapData.mappingText,
        }),
      });

      if (!res2.ok) {
        const err = await res2.json().catch(() => ({ error: "Turtle generation failed" }));
        onError({ code: "GEN_ERROR", message: err.error ?? "Turtle generation failed" });
        setRunning(false);
        setPhase("idle");
        return;
      }

      const turtleData = await res2.json();

      // Stream turtle log entries
      const turtleEntries = turtleData.logEntries as LogEntry[] ?? [];
      for (const entry of turtleEntries) {
        onLogEntry(entry);
        await new Promise((r) => setTimeout(r, 50));
      }

      // Set flags
      if (turtleData.flags) {
        onUpdateFlags(turtleData.flags as PipelineFlag[]);
      }

      // Store turtle content
      onUpdateData({
        turtle: turtleData.turtle,
        metrics: turtleData.metrics,
      });

      // Report turtle token usage
      if (turtleData.tokenUsage) onUpdateTokenUsage(turtleData.tokenUsage);

      setRunning(false);
      setPhase("idle");
    } catch (e) {
      onError({ code: "NETWORK", message: String(e) });
      setRunning(false);
      setPhase("idle");
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
          {phase === "mapping"
            ? "Step 1/2: Mapping candidates to upper ontology..."
            : "Step 2/2: Generating Turtle ontology..."}
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

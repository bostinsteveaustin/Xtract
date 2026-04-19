"use client";

import { useEffect, useRef, useState } from "react";
import { MetricCards } from "../../interactions/metric-cards";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";
import type { LogEntry, MetricItem } from "@/types/pipeline";

export default function IngestStep({
  stepState,
  allStepStates,
  onStart,
  onComplete,
  onError,
  onLogEntry,
}: StepBodyProps) {
  const [metrics, setMetrics] = useState<MetricItem[]>([]);
  const [running, setRunning] = useState(false);
  const hasRun = useRef(false);

  // Auto-run when step becomes active
  useEffect(() => {
    if (
      stepState.status === "active" &&
      !hasRun.current &&
      allStepStates.configuration?.status === "complete"
    ) {
      hasRun.current = true;
      runParse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepState.status]);

  const runParse = async () => {
    setRunning(true);
    onStart();

    const configData = allStepStates.configuration?.data;
    const structuredContent = configData?.structuredContent as string | undefined;

    if (!structuredContent) {
      onError({ code: "NO_INPUT", message: "No structured input found from configuration step" });
      setRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/ontology/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: structuredContent }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Parse failed" }));
        onError({ code: "PARSE_ERROR", message: err.error ?? "Parse failed" });
        setRunning(false);
        return;
      }

      const data = await res.json();

      // Stream log entries with delay
      const entries = data.logEntries as LogEntry[] ?? [];
      for (const entry of entries) {
        onLogEntry(entry);
        await new Promise((r) => setTimeout(r, 50));
      }

      setMetrics([
        { label: "Classes", value: data.metrics?.classes ?? 0 },
        { label: "Object Properties", value: data.metrics?.objectProperties ?? 0 },
        { label: "Data Properties", value: data.metrics?.dataProperties ?? 0 },
        { label: "Inferred", value: data.metrics?.inferred ?? 0, highlight: true },
      ]);

      setRunning(false);
      onComplete({
        candidates: data.candidates,
        metrics: data.metrics,
      });
    } catch (e) {
      onError({ code: "NETWORK", message: String(e) });
      setRunning(false);
    }
  };

  const isComplete = stepState.status === "complete";

  return (
    <div className="space-y-4">
      {metrics.length > 0 && <MetricCards metrics={metrics} />}

      {running && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Parsing structured input...
        </div>
      )}

      {isComplete && !running && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            /* TODO: open candidate list modal */
          }}
        >
          Review candidate list
        </Button>
      )}
    </div>
  );
}

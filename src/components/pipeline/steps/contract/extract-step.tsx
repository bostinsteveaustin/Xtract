"use client";

import { useEffect, useRef, useState } from "react";
import { PipelineLog } from "../../interactions/pipeline-log";
import { MetricCards } from "../../interactions/metric-cards";
import { Loader2 } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";
import type { LogEntry, MetricItem, TokenUsage } from "@/types/pipeline";
import type { ContractExtractionMetrics } from "@/types/contract";

export default function ContractExtractStep({
  stepState,
  allStepStates,
  onStart,
  onComplete,
  onError,
  onLogEntry,
  onUpdateTokenUsage,
}: StepBodyProps) {
  const [metrics, setMetrics] = useState<MetricItem[]>([]);
  const [running, setRunning] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (
      stepState.status === "active" &&
      !hasRun.current &&
      allStepStates["ingest-classify"]?.status === "complete"
    ) {
      hasRun.current = true;
      runExtract();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepState.status]);

  const runExtract = async () => {
    setRunning(true);
    onStart();

    const ingestData = allStepStates["ingest-classify"]?.data;
    const configData = allStepStates.configuration?.data;

    const documentText = ingestData?.documentText as string | undefined;
    const engagementRef = configData?.engagementRef as string | undefined;

    if (!documentText) {
      onError({ code: "NO_INPUT", message: "No document text found from ingest step" });
      setRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/contract/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText, engagementRef }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Extraction failed" }));
        onError({ code: "EXTRACT_ERROR", message: err.error ?? "Extraction failed" });
        setRunning(false);
        return;
      }

      const data = await res.json();

      // Stream log entries
      const entries = (data.logEntries as LogEntry[]) ?? [];
      for (const entry of entries) {
        onLogEntry(entry);
        await new Promise((r) => setTimeout(r, 50));
      }

      const m = data.metrics as ContractExtractionMetrics;
      setMetrics([
        { label: "Obligations", value: m.obligations },
        { label: "Financial Terms", value: m.financialTerms },
        { label: "SLAs", value: m.serviceLevels },
        { label: "High Risk Items", value: m.highRisk, highlight: true },
      ]);

      if (data.tokenUsage) {
        onUpdateTokenUsage(data.tokenUsage as TokenUsage);
      }

      setRunning(false);
      onComplete({
        extractionResult: data.result,
        metrics: data.metrics,
      });
    } catch (e) {
      onError({ code: "NETWORK", message: String(e) });
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <PipelineLog entries={stepState.logEntries} streaming={running} />

      {metrics.length > 0 && <MetricCards metrics={metrics} />}

      {running && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Claude is extracting contract intelligence...
        </div>
      )}
    </div>
  );
}

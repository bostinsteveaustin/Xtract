"use client";

import { useEffect, useRef, useState } from "react";
import { PipelineLog } from "../../interactions/pipeline-log";
import { MetricCards } from "../../interactions/metric-cards";
import { Loader2 } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";
import type { LogEntry, MetricItem } from "@/types/pipeline";

export default function ContractIngestStep({
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

  useEffect(() => {
    if (
      stepState.status === "active" &&
      !hasRun.current &&
      allStepStates.configuration?.status === "complete"
    ) {
      hasRun.current = true;
      runIngest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepState.status]);

  const runIngest = async () => {
    setRunning(true);
    onStart();

    const configData = allStepStates.configuration?.data;
    const fileContent = configData?.fileContent as string | undefined;
    const fileName = configData?.fileName as string | undefined;
    const mimeType = configData?.mimeType as string | undefined;
    const engagementRef = configData?.engagementRef as string | undefined;
    const clientName = configData?.clientName as string | undefined;

    if (!fileContent || !fileName) {
      onError({ code: "NO_INPUT", message: "No contract document found from configuration step" });
      setRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/contract/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileContent, fileName, mimeType, engagementRef, clientName }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ingest failed" }));
        onError({ code: "INGEST_ERROR", message: err.error ?? "Ingest failed" });
        setRunning(false);
        return;
      }

      const data = await res.json();

      // Stream log entries
      const entries = (data.logEntries as LogEntry[]) ?? [];
      for (const entry of entries) {
        onLogEntry(entry);
        await new Promise((r) => setTimeout(r, 40));
      }

      setMetrics([
        { label: "Words", value: (data.wordCount as number ?? 0).toLocaleString() },
        { label: "Sections", value: data.chunks as number ?? 0 },
        { label: "Parties Identified", value: data.partiesFound as number ?? 0, highlight: true },
        { label: "Document Type", value: (data.documentType as string ?? "—").replace("_", " ").toUpperCase() },
      ]);

      setRunning(false);
      onComplete({
        documentText: data.documentText,
        wordCount: data.wordCount,
        chunks: data.chunks,
        documentType: data.documentType,
        documentSummary: data.documentSummary,
        partiesDetail: data.partiesDetail,
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
          Parsing and classifying contract...
        </div>
      )}
    </div>
  );
}

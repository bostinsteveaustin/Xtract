"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { MetricCards } from "../../interactions/metric-cards";
import { ValidationTable } from "../../interactions/validation-table";
import { DownloadGrid } from "../../interactions/download-grid";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";
import type { MetricItem, BenchmarkQuery, DownloadFile } from "@/types/pipeline";

interface FileData {
  name: string;
  size: string;
  format: string;
  content: string;
}

export default function ExportStep({
  stepState,
  allStepStates,
  onStart,
  onComplete,
  onError,
  onUpdateData,
}: StepBodyProps) {
  const [running, setRunning] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (
      stepState.status === "active" &&
      !hasRun.current &&
      allStepStates["ontology-generation"]?.status === "complete"
    ) {
      hasRun.current = true;
      runExport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepState.status]);

  const runExport = async () => {
    setRunning(true);
    onStart();

    const turtle = allStepStates["ontology-generation"]?.data?.turtle as string | undefined;
    const resolvedFlags = allStepStates["ontology-generation"]?.data?.resolvedFlags as unknown[] | undefined;
    const configData = allStepStates.configuration?.data;
    const config = configData?.config as Record<string, string> | undefined;
    const ctxContent = allStepStates["ctx-production"]?.data?.ctxContent as string | undefined;

    if (!turtle) {
      onError({ code: "NO_INPUT", message: "No ontology Turtle content found" });
      setRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/ontology/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turtle,
          config: {
            namespace: config?.namespace ?? "",
            ontologyTitle: config?.ontologyTitle ?? "",
          },
          flags: resolvedFlags ?? [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        onError({ code: "EXPORT_ERROR", message: err.error ?? "Export failed" });
        setRunning(false);
        return;
      }

      const data = await res.json();

      // Prepend CTX file so it appears first in the download grid
      const ctxFile: FileData | null = ctxContent
        ? {
            name: "context.ctx",
            size: `${(new TextEncoder().encode(ctxContent).length / 1024).toFixed(1)} KB`,
            format: "ctx",
            content: ctxContent,
          }
        : null;

      // Persist to step data so it survives collapse/expand
      onUpdateData({
        metrics: data.metrics,
        benchmarkResults: data.benchmarkResults,
        files: ctxFile ? [ctxFile, ...data.files] : data.files,
      });

      setRunning(false);
    } catch (e) {
      onError({ code: "NETWORK", message: String(e) });
      setRunning(false);
    }
  };

  // Derive display data from persisted stepState.data
  const metrics: MetricItem[] = useMemo(() => {
    const m = stepState.data.metrics as Record<string, number> | undefined;
    if (!m) return [];
    return [
      { label: "Classes", value: m.classes ?? 0 },
      { label: "Triples", value: m.triples ?? 0 },
      { label: "Flags Raised", value: m.flagsRaised ?? 0 },
      {
        label: "Queries Passing",
        value: `${m.queriesPassing ?? 0}/${m.totalQueries ?? 0}`,
        highlight: true,
      },
    ];
  }, [stepState.data.metrics]);

  const queries = (stepState.data.benchmarkResults as BenchmarkQuery[] | undefined) ?? [];

  const downloadFiles: DownloadFile[] = useMemo(() => {
    const raw = stepState.data.files as FileData[] | undefined;
    if (!raw) return [];
    return raw.map((f) => ({
      name: f.name,
      size: f.size,
      format: f.format,
      blob: new Blob([f.content], {
        type: f.format === "json" ? "application/json" : "text/plain",
      }),
    }));
  }, [stepState.data.files]);

  const handleDownload = (file: DownloadFile) => {
    if (!file.blob) return;
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    onComplete({
      metrics: stepState.data.metrics,
      benchmarkResults: stepState.data.benchmarkResults,
    });
  };

  const isReady = downloadFiles.length > 0;

  return (
    <div className="space-y-6">
      {running && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating exports and validating...
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
              runExport();
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            Retry export
          </Button>
        </div>
      )}

      {metrics.length > 0 && <MetricCards metrics={metrics} />}

      {queries.length > 0 && <ValidationTable queries={queries} />}

      {downloadFiles.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-2">
            Downloads
          </p>
          <DownloadGrid files={downloadFiles} onDownload={handleDownload} />
        </div>
      )}

      {isReady && stepState.status !== "complete" && (
        <Button
          onClick={handleComplete}
          className="bg-[var(--pipeline-navy)] hover:bg-[var(--pipeline-navy)]/90"
        >
          Finish pipeline run
        </Button>
      )}

      {stepState.status === "complete" && (
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Start new run
        </Button>
      )}
    </div>
  );
}

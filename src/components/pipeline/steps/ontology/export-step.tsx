"use client";

import { useEffect, useRef, useState } from "react";
import { MetricCards } from "../../interactions/metric-cards";
import { ValidationTable } from "../../interactions/validation-table";
import { DownloadGrid } from "../../interactions/download-grid";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";
import type { MetricItem, BenchmarkQuery, DownloadFile } from "@/types/pipeline";

export default function ExportStep({
  stepState,
  allStepStates,
  onStart,
  onComplete,
  onError,
}: StepBodyProps) {
  const [metrics, setMetrics] = useState<MetricItem[]>([]);
  const [queries, setQueries] = useState<BenchmarkQuery[]>([]);
  const [files, setFiles] = useState<DownloadFile[]>([]);
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
    const genMetrics = allStepStates["ontology-generation"]?.data?.metrics as Record<string, number> | undefined;
    const configData = allStepStates.configuration?.data;
    const config = configData?.config as Record<string, string> | undefined;

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
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        onError({ code: "EXPORT_ERROR", message: err.error ?? "Export failed" });
        setRunning(false);
        return;
      }

      const data = await res.json();

      // Set metrics
      setMetrics([
        { label: "Classes", value: data.metrics?.classes ?? genMetrics?.classes ?? 0 },
        { label: "Triples", value: data.metrics?.triples ?? 0 },
        { label: "Flags Raised", value: data.metrics?.flagsRaised ?? 0 },
        {
          label: "Queries Passing",
          value: `${data.metrics?.queriesPassing ?? 0}/${data.metrics?.totalQueries ?? 0}`,
          highlight: true,
        },
      ]);

      // Set benchmark queries
      if (data.benchmarkResults) {
        setQueries(data.benchmarkResults);
      }

      // Set download files
      if (data.files) {
        setFiles(
          (data.files as { name: string; size: string; format: string; content: string }[]).map(
            (f) => ({
              name: f.name,
              size: f.size,
              format: f.format,
              blob: new Blob([f.content], {
                type: f.format === "json" ? "application/json" : "text/plain",
              }),
            })
          )
        );
      }

      setRunning(false);
      onComplete({
        metrics: data.metrics,
        benchmarkResults: data.benchmarkResults,
      });
    } catch (e) {
      onError({ code: "NETWORK", message: String(e) });
      setRunning(false);
    }
  };

  const handleDownload = (file: DownloadFile) => {
    if (!file.blob) return;
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {running && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating exports and validating...
        </div>
      )}

      {metrics.length > 0 && <MetricCards metrics={metrics} />}

      {queries.length > 0 && <ValidationTable queries={queries} />}

      {files.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-2">
            Downloads
          </p>
          <DownloadGrid files={files} onDownload={handleDownload} />
        </div>
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

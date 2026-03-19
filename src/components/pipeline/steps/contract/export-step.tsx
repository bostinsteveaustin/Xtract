"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { MetricCards } from "../../interactions/metric-cards";
import { DownloadGrid } from "../../interactions/download-grid";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";
import type { MetricItem, DownloadFile } from "@/types/pipeline";
import type { ContractExtractionResult } from "@/types/contract";

interface FileData {
  key: string;
  name: string;
  format: string;
  content: string;
  size: string;
  encoding?: string;
}

export default function ContractExportStep({
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
      allStepStates.review?.status === "complete"
    ) {
      hasRun.current = true;
      runExport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepState.status]);

  const runExport = async () => {
    setRunning(true);
    onStart();

    const extractionResult = allStepStates.extract?.data?.extractionResult as ContractExtractionResult | undefined;

    if (!extractionResult) {
      onError({ code: "NO_INPUT", message: "No extraction result found" });
      setRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/contract/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: extractionResult }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        onError({ code: "EXPORT_ERROR", message: err.error ?? "Export failed" });
        setRunning(false);
        return;
      }

      const data = await res.json();

      onUpdateData({
        files: data.files,
        metrics: data.metrics,
      });

      setRunning(false);
    } catch (e) {
      onError({ code: "NETWORK", message: String(e) });
      setRunning(false);
    }
  };

  const metrics: MetricItem[] = useMemo(() => {
    const m = stepState.data.metrics as Record<string, number> | undefined;
    if (!m) return [];
    return [
      { label: "Total Objects", value: m.totalObjects ?? 0 },
      { label: "Obligations", value: m.obligations ?? 0 },
      { label: "Relationships", value: m.relationships ?? 0 },
      { label: "Approved", value: m.approved ?? 0, highlight: true },
    ];
  }, [stepState.data.metrics]);

  const downloadFiles: DownloadFile[] = useMemo(() => {
    const raw = stepState.data.files as FileData[] | undefined;
    if (!raw) return [];

    return raw.map((f) => {
      let blob: Blob;
      if (f.encoding === "base64") {
        // XLSX — decode base64 → binary
        const binary = atob(f.content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      } else {
        blob = new Blob([f.content], {
          type: f.format === "json" ? "application/json" : "text/plain",
        });
      }

      return {
        name: f.name,
        size: f.size,
        format: f.format,
        blob,
      };
    });
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
    onComplete({ metrics: stepState.data.metrics });
  };

  const isReady = downloadFiles.length > 0;

  return (
    <div className="space-y-6">
      {running && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating iCML JSON and XLSX workbook...
        </div>
      )}

      {stepState.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
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

      {isReady && (
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
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Start new run
        </Button>
      )}
    </div>
  );
}

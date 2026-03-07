"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Play, Loader2, AlertCircle } from "lucide-react";

interface ExtractionPanelProps {
  workflowId: string;
  documentSetId?: string;
  ctxConfigurationId?: string;
  onComplete: (workflowRunId: string) => void;
  onRunning: () => void;
  isCompleted: boolean;
}

const passNames = [
  "Segmentation",
  "Entity Extraction",
  "Object Extraction",
  "Relationship Resolution",
  "Rubric Scoring",
];

interface ExtractionResult {
  workflowRunId: string;
  objectCount: number;
  averageScore: number;
  passesCompleted: number;
}

export function ExtractionPanel({
  workflowId,
  documentSetId,
  ctxConfigurationId,
  onComplete,
  onRunning,
  isCompleted,
}: ExtractionPanelProps) {
  const [running, setRunning] = useState(false);
  const [currentPass, setCurrentPass] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  const isReady = !!documentSetId && !!ctxConfigurationId;

  const handleRun = async () => {
    if (!isReady) return;

    setRunning(true);
    setError(null);
    setCurrentPass(1);
    onRunning();

    // Simulate pass progress (the API runs all 5 passes in one call)
    const progressInterval = setInterval(() => {
      setCurrentPass((prev) => {
        if (prev >= 5) {
          clearInterval(progressInterval);
          return 5;
        }
        return prev + 1;
      });
    }, 8000); // ~8s per pass estimate

    try {
      const res = await fetch(`/api/workflows/${workflowId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentSetId, ctxConfigurationId }),
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Extraction failed");
      }

      const data = await res.json();
      setCurrentPass(5);
      setResult(data);
      onComplete(data.workflowRunId);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Extraction failed");
      setRunning(false);
    }
  };

  if (isCompleted && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-600">
          <Check className="h-5 w-5" />
          <span className="font-medium">Extraction complete</span>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-2xl font-bold">{result.objectCount}</div>
              <div className="text-xs text-muted-foreground">Objects extracted</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{result.averageScore}/5</div>
              <div className="text-xs text-muted-foreground">Average score</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {passNames.map((name, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                ✓ {name}
              </Badge>
            ))}
          </div>
        </div>

        <Button variant="outline" className="w-full" asChild>
          <a href={`/workflows/${workflowId}/results?runId=${result.workflowRunId}`}>
            View Results →
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Run the 5-pass Mode 2 extraction pipeline to extract structured contract terms.
      </div>

      {/* Prerequisites */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Prerequisites</div>
        <div className="flex items-center gap-2">
          {documentSetId ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={`text-sm ${documentSetId ? "" : "text-muted-foreground"}`}>
            Documents uploaded
          </span>
        </div>
        <div className="flex items-center gap-2">
          {ctxConfigurationId ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={`text-sm ${ctxConfigurationId ? "" : "text-muted-foreground"}`}>
            CTX configured
          </span>
        </div>
      </div>

      {/* Pass progress */}
      {running && (
        <div className="space-y-3">
          <Progress value={(currentPass / 5) * 100} className="h-2" />
          <div className="space-y-1">
            {passNames.map((name, i) => {
              const passNum = i + 1;
              const isDone = currentPass > passNum;
              const isCurrent = currentPass === passNum;

              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {isDone ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                  )}
                  <span className={isCurrent ? "font-medium" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"}>
                    Pass {passNum}: {name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Run button */}
      <Button
        onClick={handleRun}
        disabled={!isReady || running}
        className="w-full"
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Running extraction...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Run Extraction
          </>
        )}
      </Button>

      {!isReady && (
        <p className="text-xs text-muted-foreground text-center">
          Complete the Document Ingest and CTX Configuration steps first.
        </p>
      )}
    </div>
  );
}

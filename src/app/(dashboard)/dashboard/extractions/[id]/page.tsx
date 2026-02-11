"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePipelineProgress } from "@/hooks/use-pipeline";
import { useExtraction } from "@/hooks/use-extractions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  Circle,
  Loader2,
  XCircle,
  ArrowRight,
} from "lucide-react";

const STAGES = [
  { key: "ingest", label: "Ingest", description: "Extracting text from document" },
  { key: "extract", label: "Extract", description: "Extracting contract terms" },
  { key: "validate", label: "Validate", description: "Scoring and validation" },
];

export default function ExtractionProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: extraction, refresh } = useExtraction(id);
  const { stage, events, isRunning, error, runPipeline } =
    usePipelineProgress(id);

  // Auto-start the pipeline when the page loads and extraction is in "created" status
  useEffect(() => {
    if (extraction?.extraction?.status === "created" && !isRunning && stage === "idle") {
      runPipeline();
    }
  }, [extraction?.extraction?.status, isRunning, stage, runPipeline]);

  // Redirect to review when complete
  useEffect(() => {
    if (stage === "complete") {
      refresh();
      const timer = setTimeout(() => {
        router.push(`/dashboard/extractions/${id}/review`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [stage, id, router, refresh]);

  const getStageStatus = (stageKey: string) => {
    if (stage === "complete") return "completed";
    if (stage === "failed") {
      // Find the stage that actually failed
      const failedEvent = events.find(
        (e) => e.stage === stageKey && e.status === "failed"
      );
      const completedEvent = events.find(
        (e) => e.stage === stageKey && e.status === "completed"
      );
      if (failedEvent) return "failed";
      if (completedEvent) return "completed";
      return "pending";
    }

    const completedEvent = events.find(
      (e) => e.stage === stageKey && e.status === "completed"
    );
    if (completedEvent) return "completed";

    if (stage === stageKey) return "running";

    const hasEvents = events.some((e) => e.stage === stageKey);
    if (hasEvents) return "running";

    return "pending";
  };

  const latestMessage = events.length > 0 ? events[events.length - 1] : null;

  // Calculate progress percentage
  const stageIndex = STAGES.findIndex((s) => s.key === stage);
  const progressPercent =
    stage === "complete"
      ? 100
      : stage === "idle"
        ? 0
        : ((stageIndex + 0.5) / STAGES.length) * 100;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {extraction?.extraction?.name ?? "Extraction"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {stage === "complete"
            ? "Extraction complete! Redirecting to results..."
            : stage === "failed"
              ? "Extraction failed"
              : isRunning
                ? "Extraction in progress..."
                : "Preparing extraction..."}
        </p>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="pt-4">
          <Progress value={progressPercent} className="mb-4" />

          {/* Stage Steps */}
          <div className="flex justify-between">
            {STAGES.map((s) => {
              const status = getStageStatus(s.key);
              return (
                <div key={s.key} className="flex items-center gap-2">
                  {status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : status === "running" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : status === "failed" ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      {latestMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{latestMessage.message}</p>
            {latestMessage.data &&
              typeof latestMessage.data === "object" &&
              "pass" in latestMessage.data && (
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline">
                    Pass {String(latestMessage.data.pass)}/
                    {String(latestMessage.data.totalPasses)}
                  </Badge>
                  {latestMessage.data.objectsFound != null && (
                    <Badge variant="secondary">
                      {String(latestMessage.data.objectsFound)} objects
                    </Badge>
                  )}
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Event Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Event Log</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-1">
              {events.map((event, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs"
                >
                  <span className="w-16 shrink-0 text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge
                    variant={
                      event.status === "completed"
                        ? "default"
                        : event.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                    className="shrink-0 text-[10px]"
                  >
                    {event.stage}
                  </Badge>
                  <span className="text-muted-foreground">
                    {event.message}
                  </span>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Waiting for events...
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Extraction Error</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => runPipeline()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Complete state */}
      {stage === "complete" && (
        <Button
          onClick={() => router.push(`/dashboard/extractions/${id}/review`)}
          className="w-full"
        >
          View Results
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

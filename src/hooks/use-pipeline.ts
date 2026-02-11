"use client";

import { useState, useCallback, useRef } from "react";

interface PipelineEvent {
  stage: string;
  status: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

type PipelineStage = "idle" | "ingest" | "extract" | "validate" | "complete" | "failed";

export function usePipelineProgress(extractionId: string | null) {
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const consumeSSE = useCallback(
    async (url: string, currentStage: PipelineStage) => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extractionId }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? `${currentStage} failed`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const event: PipelineEvent = JSON.parse(data);
                setEvents((prev) => [...prev, event]);

                if (event.status === "failed") {
                  setError(event.message);
                }
              } catch {
                // Skip malformed events
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setError(msg);
          throw err;
        }
      }
    },
    [extractionId]
  );

  const runPipeline = useCallback(async () => {
    if (!extractionId) return;

    setIsRunning(true);
    setError(null);
    setEvents([]);

    try {
      // Stage 1: Ingest
      setStage("ingest");
      await consumeSSE("/api/extract/ingest", "ingest");

      // Check if ingest failed
      if (error) {
        setStage("failed");
        return;
      }

      // Stage 2: Mode 2 Extract
      setStage("extract");
      await consumeSSE("/api/extract/mode2", "extract");

      if (error) {
        setStage("failed");
        return;
      }

      // Stage 3: Validate
      setStage("validate");
      await consumeSSE("/api/extract/validate", "validate");

      if (error) {
        setStage("failed");
        return;
      }

      setStage("complete");
    } catch {
      setStage("failed");
    } finally {
      setIsRunning(false);
    }
  }, [extractionId, consumeSSE, error]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  return {
    stage,
    events,
    isRunning,
    error,
    runPipeline,
    stop,
  };
}

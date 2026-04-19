"use client";

import { useEffect, useRef, useState } from "react";
import { ContextChat } from "../../interactions/context-chat";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download, Loader2, RotateCcw } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";
import type { ChatMessage, LogEntry } from "@/types/pipeline";
import { nanoid } from "nanoid";

export default function CTXStep({
  stepState,
  allStepStates,
  onStart,
  onComplete,
  onError,
  onLogEntry,
  onUpdateData,
  onUpdateTokenUsage,
}: StepBodyProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [ctxContent, setCtxContent] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const hasRun = useRef(false);

  // Auto-run when step becomes active
  useEffect(() => {
    if (
      stepState.status === "active" &&
      !hasRun.current &&
      allStepStates["ingest-parse"]?.status === "complete"
    ) {
      hasRun.current = true;
      runCTXProduction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepState.status]);

  const runCTXProduction = async () => {
    setRunning(true);
    onStart();

    const configData = allStepStates.configuration?.data;
    const candidates = allStepStates["ingest-parse"]?.data?.candidates;
    const transcriptContent = configData?.transcriptContent as string | undefined;

    if (!candidates || !transcriptContent) {
      onError({ code: "NO_INPUT", message: "Missing candidates or transcript" });
      setRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/ontology/ctx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates, transcript: transcriptContent }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "CTX production failed" }));
        onError({ code: "CTX_ERROR", message: err.error ?? "CTX production failed" });
        setRunning(false);
        return;
      }

      const data = await res.json();

      // Stream log entries
      const entries = data.logEntries as LogEntry[] ?? [];
      for (const entry of entries) {
        onLogEntry(entry);
        await new Promise((r) => setTimeout(r, 50));
      }

      setCtxContent(data.ctxContent);
      onUpdateData({ ctxContent: data.ctxContent });
      if (data.tokenUsage) onUpdateTokenUsage(data.tokenUsage);
      setRunning(false);

      // Add system message
      if (data.ctxContent) {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(8),
            role: "system",
            content: `CTX file generated with ${data.metrics?.definitions ?? 0} definitions and ${data.metrics?.tacitKnowledge ?? 0} tacit knowledge entries.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      onError({ code: "NETWORK", message: String(e) });
      setRunning(false);
    }
  };

  const handleChatSend = async (message: string) => {
    const userMsg: ChatMessage = {
      id: nanoid(8),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/ontology/ctx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ctxContent,
          enrichment: message,
        }),
      });

      const data = await res.json();

      if (data.ctxContent) {
        setCtxContent(data.ctxContent);
        onUpdateData({ ctxContent: data.ctxContent });
      }
      if (data.tokenUsage) onUpdateTokenUsage(data.tokenUsage);

      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(8),
          role: "system",
          content: data.response ?? "Context updated.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(8),
          role: "system",
          content: "Failed to process enrichment.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDownloadCTX = () => {
    if (!ctxContent) return;
    const blob = new Blob([ctxContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "context.ctx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirm = () => {
    onComplete({ ctxContent });
  };

  return (
    <div className="space-y-4">
      {running && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Producing CTX file from transcript...
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
              runCTXProduction();
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {ctxContent && (
        <>
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-2">
              Add Additional Context
            </p>
            <ContextChat
              messages={messages}
              onSend={handleChatSend}
              isLoading={chatLoading}
              placeholder="Add additional context or corrections..."
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleConfirm}
              className="bg-[var(--pipeline-navy)] hover:bg-[var(--pipeline-navy)]/90"
            >
              Confirm CTX & continue
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCTX}>
              <Download className="h-4 w-4 mr-2" />
              Download .ctx file
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

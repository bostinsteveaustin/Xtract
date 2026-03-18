"use client";

import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface RunRecord {
  id: string;
  status: string;
  tokens_used: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  step_token_log: StepTokenEntry[] | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface StepTokenEntry {
  stepId: string;
  stepLabel: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusBadge: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  running: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-slate-100 text-slate-600",
};

interface RunHistoryPanelProps {
  workflowId: string;
}

export function RunHistoryPanel({ workflowId }: RunHistoryPanelProps) {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Always fetch on mount so the count badge is visible even when collapsed
  useEffect(() => {
    setLoading(true);
    fetch(`/api/workflows/${workflowId}/runs`)
      .then((r) => r.json())
      .then((data) => setRuns(data.runs ?? []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, [workflowId]);

  return (
    <div className="border rounded-lg bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="h-4 w-4" />
        Run History
        {runs.length > 0 && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono">
            {runs.length}
          </span>
        )}
        <span className="flex-1" />
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div className="border-t px-4 py-3">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : runs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No runs recorded yet. Complete a pipeline run to see history here.</p>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <div key={run.id} className="border rounded-md">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((e) => (e === run.id ? null : run.id))
                    }
                    className="flex w-full items-center gap-3 px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
                  >
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusBadge[run.status] ?? statusBadge.pending)}>
                      {run.status}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDate(run.created_at)}
                    </span>
                    <span className="flex-1" />
                    {run.tokens_used != null && run.tokens_used > 0 && (
                      <span className="font-mono text-muted-foreground">
                        {formatTokens(run.tokens_used)} tokens
                      </span>
                    )}
                    {expanded === run.id ? (
                      <ChevronUp className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>

                  {expanded === run.id && (
                    <div className="border-t px-3 py-2 space-y-1.5 bg-muted/10">
                      <div className="flex gap-6 text-[11px] text-muted-foreground">
                        <span>Prompt: {formatTokens(run.prompt_tokens ?? 0)}</span>
                        <span>Completion: {formatTokens(run.completion_tokens ?? 0)}</span>
                        {run.started_at && run.completed_at && (
                          <span>
                            Duration:{" "}
                            {Math.round(
                              (new Date(run.completed_at).getTime() -
                                new Date(run.started_at).getTime()) /
                                1000
                            )}
                            s
                          </span>
                        )}
                      </div>
                      {run.step_token_log &&
                        (run.step_token_log as StepTokenEntry[]).length > 0 && (
                          <div className="space-y-1 pt-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                              Per-step breakdown
                            </p>
                            {(run.step_token_log as StepTokenEntry[]).map(
                              (step) => (
                                <div
                                  key={step.stepId}
                                  className="flex items-center gap-2 text-[11px]"
                                >
                                  <span className="flex-1 truncate text-foreground">
                                    {step.stepLabel}
                                  </span>
                                  <span className="font-mono text-muted-foreground">
                                    {formatTokens(step.promptTokens)} in
                                  </span>
                                  <span className="font-mono text-muted-foreground">
                                    {formatTokens(step.completionTokens)} out
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2, AlertCircle, Clock, Loader2,
  Download, ArrowRight, Cpu, FlaskConical,
} from "lucide-react";
import { PIPELINE_REGISTRY } from "@/lib/pipeline/workspace-registry";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RunSummary {
  id: string;
  status: string;
  pipeline_type: string | null;
  tokens_used: number | null;
  completed_at: string | null;
  started_at: string | null;
  created_at: string;
}

interface LastRunPanelProps {
  workflowId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function pipelineLabel(key: string | null): string {
  if (!key) return "Pipeline Run";
  return PIPELINE_REGISTRY.find((p) => p.key === key)?.label ?? key;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 style={{ width: "0.875rem", height: "0.875rem", color: "var(--tier-working)" }} />;
  if (status === "failed")    return <AlertCircle  style={{ width: "0.875rem", height: "0.875rem", color: "var(--destructive)" }} />;
  if (status === "running")   return <Loader2      style={{ width: "0.875rem", height: "0.875rem", color: "var(--coral)" }} className="animate-spin" />;
  return <Clock style={{ width: "0.875rem", height: "0.875rem", color: "var(--muted-fg)" }} />;
}

// Export formats available per pipeline type
function exportsForPipeline(pipelineType: string | null): Array<{
  format: "xlsx" | "icml" | "graph";
  label: string;
}> {
  if (!pipelineType) return [];
  if (pipelineType.startsWith("contract")) {
    return [
      { format: "xlsx",  label: "XLSX" },
      { format: "icml",  label: "iCML" },
    ];
  }
  // Ontology / other pipelines: no structured export via this endpoint yet
  return [];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LastRunPanel({ workflowId }: LastRunPanelProps) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchRuns = useCallback(() => {
    fetch(`/api/workflows/${workflowId}/runs`)
      .then((r) => r.json())
      .then((d) => setRuns(d.runs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workflowId]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  async function handleDownload(
    runId: string,
    format: "xlsx" | "icml" | "graph"
  ) {
    const key = `${runId}-${format}`;
    setDownloading(key);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, workflowRunId: runId }),
      });
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const ext = format === "xlsx" ? "xlsx" : format === "icml" ? "json" : "json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `xtract-${workflowId.slice(0, 8)}-${format}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — could add toast in future
    } finally {
      setDownloading(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const lastRun = runs[0] ?? null;
  const lastCompleted = runs.find((r) => r.status === "completed") ?? null;
  const displayRun = lastCompleted ?? lastRun;

  return (
    <div
      style={{
        width: "260px",
        flexShrink: 0,
        borderLeft: "1px solid var(--border)",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.125rem 0.75rem",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FlaskConical style={{ width: "0.875rem", height: "0.875rem", color: "var(--muted-fg)" }} />
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.02em" }}>
            Last Run
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.875rem 1.125rem" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "2rem" }}>
            <Loader2 style={{ width: "1.25rem", height: "1.25rem", color: "var(--muted-fg)" }} className="animate-spin" />
          </div>
        ) : !displayRun ? (
          /* Empty state */
          <div style={{ textAlign: "center", paddingTop: "2rem" }}>
            <div style={{
              width: "2.5rem", height: "2.5rem", borderRadius: "50%",
              background: "var(--muted)", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 0.75rem",
            }}>
              <Cpu style={{ width: "1.125rem", height: "1.125rem", color: "var(--muted-fg)" }} />
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--muted-fg)", lineHeight: 1.5 }}>
              No runs yet. Start a pipeline run to see output here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Run card */}
            <div
              style={{
                border: "1px solid var(--border)", borderRadius: "8px",
                padding: "0.75rem", background: "var(--background)",
              }}
            >
              {/* Status + pipeline */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.375rem" }}>
                <StatusIcon status={displayRun.status} />
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--foreground)" }}>
                  {pipelineLabel(displayRun.pipeline_type)}
                </span>
              </div>

              {/* Date */}
              <div style={{ fontSize: "0.73rem", color: "var(--muted-fg)", marginBottom: "0.25rem" }}>
                {formatDate(displayRun.completed_at ?? displayRun.started_at ?? displayRun.created_at)}
              </div>

              {/* Tokens */}
              {displayRun.tokens_used != null && displayRun.tokens_used > 0 && (
                <div style={{ fontSize: "0.72rem", color: "var(--muted-fg)" }}>
                  {displayRun.tokens_used.toLocaleString()} tokens
                </div>
              )}
            </div>

            {/* Downloads */}
            {lastCompleted && (() => {
              const exports = exportsForPipeline(lastCompleted.pipeline_type);
              if (exports.length === 0) return null;
              return (
                <div>
                  <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted-fg)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                    Downloads
                  </p>
                  <div className="space-y-1.5">
                    {exports.map(({ format, label }) => {
                      const key = `${lastCompleted.id}-${format}`;
                      const busy = downloading === key;
                      return (
                        <button
                          key={format}
                          onClick={() => handleDownload(lastCompleted.id, format)}
                          disabled={busy}
                          style={{
                            width: "100%", display: "flex", alignItems: "center",
                            gap: "0.5rem", padding: "0.45rem 0.75rem",
                            borderRadius: "6px", border: "1px solid var(--border)",
                            background: "var(--paper)", cursor: busy ? "default" : "pointer",
                            fontSize: "0.8rem", fontWeight: 500, color: "var(--foreground)",
                            transition: "background 0.1s",
                            opacity: busy ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!busy) (e.currentTarget as HTMLElement).style.background = "var(--muted)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "var(--paper)";
                          }}
                        >
                          {busy
                            ? <Loader2 style={{ width: "0.8rem", height: "0.8rem" }} className="animate-spin" />
                            : <Download style={{ width: "0.8rem", height: "0.8rem", color: "var(--muted-fg)" }} />
                          }
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* View results link */}
            {lastCompleted && (
              <Link
                href={`/workflows/${workflowId}/results`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.5rem 0.75rem", borderRadius: "6px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                  fontSize: "0.8rem", fontWeight: 500,
                  textDecoration: "none", transition: "background 0.1s, border-color 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--muted)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--muted-fg)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                }}
              >
                View full results
                <ArrowRight style={{ width: "0.8rem", height: "0.8rem" }} />
              </Link>
            )}

            {/* All runs summary */}
            {runs.length > 1 && (
              <p style={{ fontSize: "0.72rem", color: "var(--muted-fg)", textAlign: "center" }}>
                {runs.length} total run{runs.length !== 1 ? "s" : ""} in this workspace
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

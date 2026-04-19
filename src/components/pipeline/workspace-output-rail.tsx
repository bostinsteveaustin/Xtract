"use client";

import { useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, FileJson, Activity } from "lucide-react";
import type { LogEntry } from "@/types/pipeline";

export interface RailLogEntry extends LogEntry {
  stepLabel: string;
}

export interface RawFileData {
  key: string;
  name: string;
  format: string;
  content: string;
  size: string;
  encoding?: string;
}

interface WorkspaceOutputRailProps {
  logEntries: RailLogEntry[];
  rawFiles: RawFileData[];
  isRunning: boolean;
}

const formatIcon: Record<string, typeof FileText> = {
  ttl: FileText,
  csv: FileSpreadsheet,
  json: FileJson,
  xlsx: FileSpreadsheet,
};

export function WorkspaceOutputRail({
  logEntries,
  rawFiles,
  isRunning,
}: WorkspaceOutputRailProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new log entries
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logEntries.length]);

  const handleDownload = (file: RawFileData) => {
    let blob: Blob;
    if (file.encoding === "base64") {
      const binary = atob(file.content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } else {
      blob = new Blob([file.content], {
        type: file.format === "json" ? "application/json" : "text/plain",
      });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasFiles = rawFiles.length > 0;
  const hasLog = logEntries.length > 0;

  return (
    <div
      style={{
        width: "300px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--paper)",
        borderLeft: "1px solid var(--border)",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Rail header ── */}
      <div
        style={{
          height: "48px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 1rem",
          borderBottom: "1px solid var(--border)",
          gap: "0.5rem",
        }}
      >
        <Activity
          style={{
            width: "0.875rem",
            height: "0.875rem",
            color: isRunning ? "var(--coral)" : "var(--muted-fg)",
            transition: "color 0.2s",
          }}
        />
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--foreground)",
            flex: 1,
          }}
        >
          Output
        </span>
        {isRunning && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--coral)",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--coral)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            Running
          </span>
        )}
      </div>

      {/* ── Downloads section (visible when files exist) ── */}
      {hasFiles && (
        <div
          style={{
            flexShrink: 0,
            padding: "0.75rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted-fg)",
              marginBottom: "0.5rem",
            }}
          >
            Downloads
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {rawFiles.map((file) => {
              const Icon = formatIcon[file.format] ?? FileText;
              return (
                <button
                  key={file.key}
                  onClick={() => handleDownload(file)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.625rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.15s, background 0.15s",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--coral)";
                    el.style.background = "var(--coral-soft)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--border)";
                    el.style.background = "var(--background)";
                  }}
                >
                  <Icon
                    style={{
                      width: "0.875rem",
                      height: "0.875rem",
                      color: "var(--muted-fg)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        color: "var(--foreground)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {file.name}
                    </div>
                    {file.size && (
                      <div style={{ fontSize: "0.7rem", color: "var(--muted-fg)" }}>
                        {file.size}
                      </div>
                    )}
                  </div>
                  <Download
                    style={{
                      width: "0.75rem",
                      height: "0.75rem",
                      color: "var(--coral)",
                      flexShrink: 0,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Run log section ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Log label */}
        <div
          style={{
            padding: "0.625rem 1rem 0.375rem",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted-fg)",
            }}
          >
            Run log
          </p>
        </div>

        {/* Scrollable log entries */}
        <div
          ref={logRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.25rem 1rem 1rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.69rem",
            lineHeight: 1.55,
          }}
        >
          {!hasLog ? (
            <p
              style={{
                color: "var(--muted-fg)",
                marginTop: "0.5rem",
                fontFamily: "var(--font-sans)",
                fontSize: "0.8rem",
              }}
            >
              Run a pipeline to see output here.
            </p>
          ) : (
            logEntries.map((entry, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "0.375rem",
                  padding: "0.1rem 0",
                  color:
                    entry.level === "error"
                      ? "var(--destructive)"
                      : entry.level === "warning"
                      ? "var(--tier-institutional)"
                      : "var(--foreground)",
                }}
              >
                <span
                  style={{
                    color: "var(--muted-fg)",
                    flexShrink: 0,
                    minWidth: "3rem",
                  }}
                >
                  {entry.timestamp}
                </span>
                <span style={{ flex: 1, wordBreak: "break-word" }}>
                  {entry.message}
                </span>
              </div>
            ))
          )}
          {/* Pulsing indicator when running */}
          {isRunning && hasLog && (
            <div
              style={{
                display: "flex",
                gap: "3px",
                padding: "0.25rem 0",
                color: "var(--coral)",
              }}
            >
              <span>·</span>
              <span>·</span>
              <span>·</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

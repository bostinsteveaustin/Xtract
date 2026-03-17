"use client";

import type { ReactNode } from "react";
import type { TokenUsage } from "@/types/pipeline";

interface PipelineMetadata {
  templateName: string;
  runId?: string;
  inputFiles?: string[];
}

interface PipelineBodyProps {
  metadata?: PipelineMetadata;
  mode: "guided" | "auto";
  onModeChange: (mode: "guided" | "auto") => void;
  totalTokenUsage?: TokenUsage;
  children: ReactNode;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function PipelineBody({
  metadata,
  mode,
  onModeChange,
  totalTokenUsage,
  children,
}: PipelineBodyProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Metadata bar */}
      {metadata && (
        <div className="bg-[var(--pipeline-surface)] border-b px-4 py-2">
          <div className="max-w-[760px] mx-auto flex items-center justify-between text-[13px] text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="font-medium text-foreground">
                {metadata.templateName}
              </span>
              {metadata.inputFiles && metadata.inputFiles.length > 0 && (
                <span>{metadata.inputFiles.join(", ")}</span>
              )}
              {metadata.runId && (
                <span className="font-mono text-xs">{metadata.runId}</span>
              )}
              {totalTokenUsage && totalTokenUsage.totalTokens > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-background border px-2 py-0.5 text-xs font-mono">
                  <span className="text-[var(--pipeline-navy)] font-medium">
                    {formatTokens(totalTokenUsage.totalTokens)}
                  </span>
                  <span>tokens</span>
                </span>
              )}
            </div>

            {/* Mode toggle */}
            <div className="flex items-center gap-1 rounded-md bg-background p-0.5 border">
              <button
                type="button"
                onClick={() => onModeChange("guided")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  mode === "guided"
                    ? "bg-[var(--pipeline-navy)] text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Guided
              </button>
              <button
                type="button"
                onClick={() => onModeChange("auto")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  mode === "auto"
                    ? "bg-[var(--pipeline-navy)] text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Auto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline steps */}
      <div className="max-w-[760px] mx-auto py-8 px-4">{children}</div>
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkflows } from "@/hooks/use-workflows";
import type { TokenUsage } from "@/types/pipeline";

interface PipelineMetadata {
  templateName: string;
  runId?: string;
  inputFiles?: string[];
}

interface PipelineBodyProps {
  workflowId: string;
  workflowName: string;
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
  workflowId,
  workflowName,
  metadata,
  mode,
  onModeChange,
  totalTokenUsage,
  children,
}: PipelineBodyProps) {
  const router = useRouter();
  const { renameWorkflow, deleteWorkflow } = useWorkflows();
  const [displayName, setDisplayName] = useState(workflowName);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(workflowName);
  const [deleting, setDeleting] = useState(false);

  const handleSaveRename = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === displayName) {
      setEditing(false);
      return;
    }
    await renameWorkflow(workflowId, trimmed);
    setDisplayName(trimmed);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this pipeline? This cannot be undone.")) return;
    setDeleting(true);
    await deleteWorkflow(workflowId);
    router.push("/workflows");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Pipeline header with editable name */}
      <div className="border-b px-4 py-3">
        <div className="max-w-[760px] mx-auto flex items-center gap-3">
          {editing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setEditValue(displayName);
                  }
                }}
                autoFocus
                className="h-8 text-base font-semibold"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleSaveRename}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  setEditing(false);
                  setEditValue(displayName);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-foreground flex-1 truncate">
                {displayName}
              </h1>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setEditValue(displayName);
                  setEditing(true);
                }}
                title="Rename pipeline"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete pipeline"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

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

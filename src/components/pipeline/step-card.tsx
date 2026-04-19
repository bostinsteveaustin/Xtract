"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, AlertTriangle, Loader2 } from "lucide-react";
import type { StepStatus, TokenUsage } from "@/types/pipeline";
import { cn } from "@/lib/utils";

interface StepCardProps {
  stepNumber: number;
  label: string;
  title: string;
  status: StepStatus;
  flagCount?: number;
  tokenUsage?: TokenUsage;
  children: ReactNode;
  actionBar?: ReactNode;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const statusConfig: Record<
  StepStatus,
  {
    borderClass: string;
    circleClass: string;
    badgeLabel: string;
    badgeClass: string;
  }
> = {
  locked: {
    borderClass: "border-muted",
    circleClass: "border-2 border-muted-foreground/30 text-muted-foreground/30",
    badgeLabel: "Locked",
    badgeClass: "text-muted-foreground/50",
  },
  active: {
    borderClass: "border-[var(--coral)]",
    circleClass: "bg-[var(--coral)] text-white",
    badgeLabel: "Active",
    badgeClass: "text-[var(--coral)]",
  },
  running: {
    borderClass: "border-[var(--coral)]",
    circleClass: "bg-[var(--coral)] text-white",
    badgeLabel: "Running",
    badgeClass: "text-[var(--coral)]",
  },
  complete: {
    borderClass: "border-[var(--pipeline-pink)]",
    circleClass: "bg-[var(--pipeline-pink)] text-white",
    badgeLabel: "Complete",
    badgeClass: "text-[var(--pipeline-pink)]",
  },
  error: {
    borderClass: "border-destructive",
    circleClass: "bg-destructive text-white",
    badgeLabel: "Error",
    badgeClass: "text-destructive",
  },
};

export function StepCard({
  stepNumber,
  label,
  title,
  status,
  flagCount,
  tokenUsage,
  children,
  actionBar,
}: StepCardProps) {
  const config = statusConfig[status];
  const canExpand = status === "active" || status === "running" || status === "error";
  const [expanded, setExpanded] = useState(canExpand);

  // Auto-expand when step becomes active
  const isOpen = canExpand ? true : expanded && status === "complete";

  const toggleExpand = () => {
    if (status === "complete") {
      setExpanded((e) => !e);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-all duration-300",
        config.borderClass,
        status === "locked" && "opacity-50"
      )}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={toggleExpand}
        disabled={status === "locked"}
        className={cn(
          "flex w-full items-center gap-3 px-5 py-4 text-left",
          status === "complete" && "cursor-pointer hover:bg-muted/30",
          status === "locked" && "cursor-default"
        )}
      >
        {/* Step number circle */}
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium",
            config.circleClass
          )}
        >
          {status === "complete" ? (
            <Check className="h-4 w-4" />
          ) : status === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "error" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            stepNumber
          )}
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            {label}
          </p>
          <p className="text-sm font-medium text-[var(--coral)] truncate">
            {title}
          </p>
        </div>

        {/* Token usage badge */}
        {tokenUsage && tokenUsage.totalTokens > 0 && (
          <span
            style={{
              borderRadius: "999px",
              background: "var(--muted)",
              padding: "0.125rem 0.5rem",
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
              color: "var(--muted-fg)",
            }}
          >
            {formatTokens(tokenUsage.totalTokens)}
          </span>
        )}

        {/* Flag count badge */}
        {flagCount != null && flagCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {flagCount} flag{flagCount !== 1 ? "s" : ""}
          </span>
        )}

        {/* Status badge */}
        <span className={cn("text-xs font-medium", config.badgeClass)}>
          {config.badgeLabel}
        </span>

        {/* Chevron for complete cards */}
        {status === "complete" && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        )}
      </button>

      {/* Body — collapsible */}
      {isOpen && (
        <div className="border-t px-5 py-4 space-y-4">
          {children}

          {/* Action bar */}
          {actionBar && (
            <div className="flex items-center gap-3 pt-2 border-t">
              {actionBar}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

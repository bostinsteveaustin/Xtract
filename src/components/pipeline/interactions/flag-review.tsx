"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PipelineFlag, FlagType } from "@/types/pipeline";
import { cn } from "@/lib/utils";

interface FlagReviewProps {
  flags: PipelineFlag[];
  onAccept: (flagId: string) => void;
  onOverride: (flagId: string) => void;
}

const flagTypeConfig: Record<
  FlagType,
  { label: string; className: string }
> = {
  missing_taxonomy: {
    label: "Missing Taxonomy",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  contested_classification: {
    label: "Contested Classification",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  absent_field: {
    label: "Absent Field",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  inferred_class: {
    label: "Inferred Class",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  data_quality: {
    label: "Data Quality",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

export function FlagReview({ flags, onAccept, onOverride }: FlagReviewProps) {
  const pending = flags.filter((f) => f.resolution === "pending").length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <p className="text-sm font-medium">
        {pending === 0 ? (
          <span className="text-emerald-600">
            All flags resolved — ready to commit
          </span>
        ) : (
          <span className="text-amber-600">
            {pending} flag{pending !== 1 ? "s" : ""} remaining
          </span>
        )}
      </p>

      {/* Flag list */}
      <div className="space-y-2">
        {flags.map((flag) => {
          const typeConfig = flagTypeConfig[flag.type];
          const isResolved = flag.resolution !== "pending";

          return (
            <div
              key={flag.id}
              className={cn(
                "rounded-md border p-3 transition-opacity",
                isResolved && "opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono text-muted-foreground">
                      {flag.id}
                    </code>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", typeConfig.className)}
                    >
                      {typeConfig.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {flag.entity}
                    </span>
                  </div>
                  <p className="text-sm">{flag.description}</p>
                  {flag.suggestedResolution && (
                    <p className="text-xs text-muted-foreground">
                      Suggested: {flag.suggestedResolution}
                    </p>
                  )}
                  {isResolved && (
                    <p className="text-xs text-emerald-600 font-medium">
                      {flag.resolution === "accepted"
                        ? "Accepted"
                        : "Overridden"}
                    </p>
                  )}
                </div>

                {!isResolved && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAccept(flag.id)}
                      className="text-xs h-7"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOverride(flag.id)}
                      className="text-xs h-7"
                    >
                      Override
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

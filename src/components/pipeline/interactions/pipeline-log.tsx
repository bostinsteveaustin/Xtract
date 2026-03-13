"use client";

import { useEffect, useRef } from "react";
import { Check, Flag, X } from "lucide-react";
import type { LogEntry } from "@/types/pipeline";
import { cn } from "@/lib/utils";

interface PipelineLogProps {
  entries: LogEntry[];
  streaming?: boolean;
  maxHeight?: number;
}

const iconMap = {
  check: { icon: Check, className: "text-emerald-500" },
  flag: { icon: Flag, className: "text-amber-500" },
  cross: { icon: X, className: "text-red-500" },
};

export function PipelineLog({
  entries,
  streaming = false,
  maxHeight = 160,
}: PipelineLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto rounded-md border bg-muted/30 p-3 font-mono text-xs"
      style={{ maxHeight }}
    >
      {entries.length === 0 && (
        <p className="text-muted-foreground">Waiting for output...</p>
      )}
      {entries.map((entry, i) => {
        const iconConfig = entry.icon ? iconMap[entry.icon] : null;
        const IconComponent = iconConfig?.icon;

        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 py-0.5",
              streaming && i === entries.length - 1 && "animate-pulse"
            )}
          >
            <span className="text-muted-foreground/60 w-[60px] flex-shrink-0">
              {entry.timestamp}
            </span>
            {IconComponent ? (
              <IconComponent
                className={cn("h-3.5 w-3.5 mt-0.5 flex-shrink-0", iconConfig.className)}
              />
            ) : (
              <span className="w-3.5 flex-shrink-0" />
            )}
            <span
              className={cn(
                "flex-1",
                entry.level === "error" && "text-red-500",
                entry.level === "warning" && "text-amber-600"
              )}
            >
              {entry.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}

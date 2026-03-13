import type { MetricItem } from "@/types/pipeline";
import { cn } from "@/lib/utils";

interface MetricCardsProps {
  metrics: MetricItem[];
}

export function MetricCards({ metrics }: MetricCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m, i) => (
        <div
          key={i}
          className={cn(
            "rounded-lg border px-4 py-3 text-center",
            m.highlight
              ? "border-[var(--pipeline-pink)]/30 bg-[var(--pipeline-pink)]/5"
              : "bg-card"
          )}
        >
          <p
            className={cn(
              "text-2xl font-semibold",
              m.highlight && "text-[var(--pipeline-pink)]"
            )}
          >
            {m.value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

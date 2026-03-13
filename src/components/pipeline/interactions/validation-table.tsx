import { CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BenchmarkQuery } from "@/types/pipeline";

interface ValidationTableProps {
  queries: BenchmarkQuery[];
}

export function ValidationTable({ queries }: ValidationTableProps) {
  const allPassing = queries.every((q) => q.passed);

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
        Benchmark Validation
      </p>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-3 py-2 font-medium">Query</th>
              <th className="text-right px-3 py-2 font-medium w-[80px]">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {queries.map((q, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <p className="font-medium">{q.name}</p>
                  {q.description && (
                    <p className="text-xs text-muted-foreground">
                      {q.description}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {q.passed ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Pass
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Fail
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {allPassing && (
        <p className="text-xs text-emerald-600 font-medium">
          All {queries.length} benchmark queries passing
        </p>
      )}
    </div>
  );
}

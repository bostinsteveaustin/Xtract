"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, FileJson, Share2, Loader2, AlertCircle } from "lucide-react";

interface ExportPanelProps {
  workflowId: string;
  workflowRunId?: string;
  isReady: boolean;
}

const formats = [
  {
    value: "xlsx",
    label: "Excel Workbook (.xlsx)",
    description: "Spreadsheet with contract terms, summary, and relationships",
    icon: FileSpreadsheet,
  },
  {
    value: "icml",
    label: "iCML JSON (.json)",
    description: "Structured extraction output in iCML v4.0 format",
    icon: FileJson,
  },
  {
    value: "graph",
    label: "Graph Schema (.json)",
    description: "Neo4j-compatible nodes and edges for graph import",
    icon: Share2,
  },
];

export function ExportPanel({ workflowId, workflowRunId, isReady }: ExportPanelProps) {
  const [format, setFormat] = useState("xlsx");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!workflowRunId) return;

    setExporting(true);
    setError(null);

    try {
      const res = await fetch(`/api/workflows/${workflowId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, workflowRunId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Export failed");
      }

      // Trigger browser download
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] ?? `extraction.${format === "xlsx" ? "xlsx" : "json"}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (!isReady) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Complete the extraction step before exporting results.
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          Waiting for extraction to complete
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Export extracted contract terms in your preferred format.
      </div>

      {/* Format selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Export Format</label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {formats.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Format details */}
      {formats
        .filter((f) => f.value === format)
        .map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.value} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">{f.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{f.description}</p>
              {f.value === "xlsx" && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className="text-[10px]">Contract Terms</Badge>
                  <Badge variant="secondary" className="text-[10px]">Summary</Badge>
                  <Badge variant="secondary" className="text-[10px]">Relationships</Badge>
                </div>
              )}
              {f.value === "icml" && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className="text-[10px]">Entities</Badge>
                  <Badge variant="secondary" className="text-[10px]">Objects</Badge>
                  <Badge variant="secondary" className="text-[10px]">Provenance</Badge>
                  <Badge variant="secondary" className="text-[10px]">Quality</Badge>
                </div>
              )}
              {f.value === "graph" && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className="text-[10px]">Neo4j</Badge>
                  <Badge variant="secondary" className="text-[10px]">Nodes</Badge>
                  <Badge variant="secondary" className="text-[10px]">Edges</Badge>
                </div>
              )}
            </div>
          );
        })}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Download button */}
      <Button
        onClick={handleExport}
        disabled={exporting}
        className="w-full"
      >
        {exporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download {format.toUpperCase()}
          </>
        )}
      </Button>
    </div>
  );
}

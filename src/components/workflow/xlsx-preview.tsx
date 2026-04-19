"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ObjectAttribute {
  name: string;
  type: string;
}

interface ExtractedObject {
  id: string;
  object_icml_id?: string | null;
  object_type: string;
  attributes: Record<string, unknown>;
  confidence?: number | null;
  rubric_score?: number | null;
  rubric_level?: string | null;
  source_clause_text?: string | null;
}

interface XlsxPreviewProps {
  objects: ExtractedObject[];
  attributeSpec: ObjectAttribute[];
}

function confidenceColour(value: number | null | undefined) {
  if (value == null) return "";
  if (value >= 80) return "text-emerald-700 bg-emerald-50";
  if (value >= 60) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

function riskColour(value: string | null | undefined) {
  if (!value) return "";
  const v = value.toLowerCase();
  if (v === "high" || v.includes("high")) return "text-red-700 bg-red-50";
  if (v === "medium" || v.includes("medium")) return "text-amber-700 bg-amber-50";
  if (v === "low" || v.includes("low")) return "text-emerald-700 bg-emerald-50";
  return "";
}

function formatHeader(name: string) {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function XlsxPreview({ objects, attributeSpec }: XlsxPreviewProps) {
  if (objects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No extracted objects to preview
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="min-w-max">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-900 hover:bg-gray-900">
              <TableHead className="text-white font-bold text-xs whitespace-nowrap sticky top-0 bg-gray-900 z-10">
                Object ID
              </TableHead>
              {attributeSpec.map((attr) => (
                <TableHead
                  key={attr.name}
                  className="text-white font-bold text-xs whitespace-nowrap sticky top-0 bg-gray-900 z-10"
                >
                  {formatHeader(attr.name)}
                </TableHead>
              ))}
              <TableHead className="text-white font-bold text-xs whitespace-nowrap sticky top-0 bg-gray-900 z-10">
                Confidence
              </TableHead>
              <TableHead className="text-white font-bold text-xs whitespace-nowrap sticky top-0 bg-gray-900 z-10">
                Rubric Score
              </TableHead>
              <TableHead className="text-white font-bold text-xs whitespace-nowrap sticky top-0 bg-gray-900 z-10">
                Rubric Level
              </TableHead>
              <TableHead className="text-white font-bold text-xs whitespace-nowrap sticky top-0 bg-gray-900 z-10">
                Source Clause
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {objects.map((obj) => {
              const data = obj.attributes as Record<string, unknown>;
              return (
                <TableRow key={obj.id} className="text-xs">
                  <TableCell className="font-mono whitespace-nowrap">
                    {obj.object_icml_id ?? obj.id.slice(0, 8)}
                  </TableCell>
                  {attributeSpec.map((attr) => {
                    const value = data[attr.name];
                    const display = Array.isArray(value)
                      ? value.join(", ")
                      : value != null
                        ? String(value)
                        : "";

                    // Apply risk colouring for riskLevel attribute
                    const isRisk = attr.name === "riskLevel";
                    return (
                      <TableCell
                        key={attr.name}
                        className={cn(
                          "max-w-[200px] truncate",
                          isRisk && riskColour(display)
                        )}
                        title={display}
                      >
                        {display}
                      </TableCell>
                    );
                  })}
                  <TableCell
                    className={cn(
                      "text-center",
                      confidenceColour(obj.confidence)
                    )}
                  >
                    {obj.confidence != null ? `${obj.confidence}%` : ""}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-center",
                      confidenceColour(obj.rubric_score)
                    )}
                  >
                    {obj.rubric_score ?? ""}
                  </TableCell>
                  <TableCell className={riskColour(obj.rubric_level)}>
                    {obj.rubric_level ?? ""}
                  </TableCell>
                  <TableCell
                    className="max-w-[150px] truncate"
                    title={obj.source_clause_text ?? ""}
                  >
                    {obj.source_clause_text ?? ""}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}

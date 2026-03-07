"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ExtractedObject {
  id: string;
  object_icml_id?: string | null;
  object_type: string;
  attributes: Record<string, unknown>;
  confidence?: number | null;
  rubric_score?: number | null;
  rubric_level?: string | null;
  scoring_rationale?: string | null;
  source_clause_text?: string | null;
}

interface Relationship {
  id: string;
  from_object_icml_id: string;
  to_object_icml_id: string;
  relationship_type: string;
  direction: string;
  confidence: number;
  source: string;
  description?: string | null;
}

interface ResultsSummary {
  totalObjects: number;
  totalRelationships: number;
  averageRubricScore: number;
  averageConfidence: number;
  scoreDistribution: Record<number, number>;
  scoredCount: number;
}

interface ResultsTableProps {
  objects: ExtractedObject[];
  relationships: Relationship[];
  summary: ResultsSummary;
}

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 4) return "text-emerald-600";
  if (score >= 3) return "text-amber-600";
  return "text-red-600";
}

function confidenceBadge(confidence: number | null | undefined) {
  if (confidence == null) return <Badge variant="outline">—</Badge>;
  if (confidence >= 80) return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{confidence}%</Badge>;
  if (confidence >= 60) return <Badge variant="secondary" className="bg-amber-100 text-amber-700">{confidence}%</Badge>;
  return <Badge variant="secondary" className="bg-red-100 text-red-700">{confidence}%</Badge>;
}

export function ResultsTable({ objects, relationships, summary }: ResultsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Objects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalObjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Avg Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${scoreColor(summary.averageRubricScore)}`}>
              {summary.averageRubricScore}/5
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Avg Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageConfidence}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Relationships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalRelationships}</div>
          </CardContent>
        </Card>
      </div>

      {/* Objects table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>ID</TableHead>
              <TableHead>Term Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {objects.map((obj) => {
              const attrs = obj.attributes as Record<string, unknown>;
              const isExpanded = expandedRow === obj.id;

              return (
                <>
                  <TableRow
                    key={obj.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedRow(isExpanded ? null : obj.id)}
                  >
                    <TableCell className="w-8">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {obj.object_icml_id ?? obj.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {String(attrs.termName ?? attrs.name ?? "—")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {String(attrs.termType ?? obj.object_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {attrs.riskLevel != null && (
                        <Badge
                          variant={
                            String(attrs.riskLevel).toLowerCase() === "high"
                              ? "destructive"
                              : String(attrs.riskLevel).toLowerCase() === "medium"
                                ? "default"
                                : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {String(attrs.riskLevel)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{confidenceBadge(obj.confidence)}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${scoreColor(obj.rubric_score)}`}>
                        {obj.rubric_score != null ? `${obj.rubric_score}/5` : "—"}
                      </span>
                    </TableCell>
                  </TableRow>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <TableRow key={`${obj.id}-detail`}>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="space-y-3 text-sm">
                          {attrs.summary != null && (
                            <div>
                              <span className="font-medium">Summary: </span>
                              <span className="text-muted-foreground">{String(attrs.summary)}</span>
                            </div>
                          )}
                          {obj.source_clause_text && (
                            <div>
                              <span className="font-medium">Source: </span>
                              <span className="text-muted-foreground">{obj.source_clause_text}</span>
                            </div>
                          )}
                          {obj.rubric_level && (
                            <div>
                              <span className="font-medium">Rubric Level: </span>
                              <Badge variant="outline">{obj.rubric_level}</Badge>
                            </div>
                          )}
                          {obj.scoring_rationale && (
                            <div>
                              <span className="font-medium">Scoring Rationale: </span>
                              <span className="text-muted-foreground">{obj.scoring_rationale}</span>
                            </div>
                          )}

                          {/* Show all attributes */}
                          <div className="pt-2 border-t">
                            <span className="font-medium text-xs text-muted-foreground">All Attributes</span>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              {Object.entries(attrs)
                                .filter(([, v]) => v != null && String(v).length > 0)
                                .map(([key, value]) => (
                                  <div key={key} className="text-xs">
                                    <span className="text-muted-foreground">{key}: </span>
                                    <span>{Array.isArray(value) ? (value as string[]).join(", ") : String(value).slice(0, 100)}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}

            {objects.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No objects extracted
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Relationships table */}
      {relationships.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Relationships ({relationships.length})</h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relationships.map((rel) => (
                  <TableRow key={rel.id}>
                    <TableCell className="font-mono text-xs">{rel.from_object_icml_id}</TableCell>
                    <TableCell className="font-mono text-xs">{rel.to_object_icml_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {rel.relationship_type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {rel.direction === "bidirectional" ? "↔" : "→"}
                    </TableCell>
                    <TableCell>{confidenceBadge(rel.confidence)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {rel.description ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

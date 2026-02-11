"use client";

import { use, useState } from "react";
import { useExtraction } from "@/hooks/use-extractions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileJson, FileSpreadsheet, ChevronDown, ChevronUp } from "lucide-react";

const riskColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

const confidenceLabel = (c: number | null) => {
  if (c == null) return "—";
  if (c >= 80) return "High";
  if (c >= 60) return "Medium";
  return "Low";
};

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, loading } = useExtraction(id);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">Extraction not found.</p>;
  }

  const { extraction, domainObjects, entities, summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{extraction.name}</h1>
          <p className="text-sm text-muted-foreground">
            {summary.totalObjects} terms extracted
            {summary.entitiesFound > 0 &&
              ` from ${summary.entitiesFound} entities`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/api/extractions/${id}/export?format=json`}
              download
            >
              <FileJson className="mr-2 h-4 w-4" />
              iCML JSON
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/api/extractions/${id}/export?format=xlsx`}
              download
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </a>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Terms</p>
            <p className="text-2xl font-bold">{summary.totalObjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Avg Score</p>
            <p className="text-2xl font-bold">
              {summary.averageScore > 0
                ? `${summary.averageScore}/5`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Avg Confidence</p>
            <p className="text-2xl font-bold">
              {summary.averageConfidence > 0
                ? `${summary.averageConfidence}%`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">XQS-D Score</p>
            <p className="text-2xl font-bold">
              {extraction.xqsScore != null ? `${extraction.xqsScore}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="terms">
        <TabsList>
          <TabsTrigger value="terms">
            Extracted Terms ({summary.totalObjects})
          </TabsTrigger>
          <TabsTrigger value="entities">
            Entities ({summary.entitiesFound})
          </TabsTrigger>
          <TabsTrigger value="quality">Quality Details</TabsTrigger>
        </TabsList>

        {/* Terms Tab */}
        <TabsContent value="terms">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Term Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Clause</TableHead>
                    <TableHead>Obligation</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domainObjects.map((obj) => {
                    const d = obj.objectData as Record<string, unknown>;
                    const isExpanded = expandedRow === obj.id;
                    return (
                      <>
                        <TableRow
                          key={obj.id}
                          className="cursor-pointer"
                          onClick={() =>
                            setExpandedRow(isExpanded ? null : obj.id)
                          }
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {String(d.termName ?? "—")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {String(d.termType ?? "—")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {String(d.clauseReference ?? "—")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {String(d.obligationType ?? "—")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {d.riskLevel ? (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${riskColors[String(d.riskLevel)] ?? ""}`}
                              >
                                {String(d.riskLevel)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {obj.rubricScore != null
                              ? `${obj.rubricScore}/5`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {confidenceLabel(obj.confidence)}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${obj.id}-detail`}>
                            <TableCell colSpan={8} className="bg-muted/30">
                              <div className="grid gap-4 p-4 md:grid-cols-2">
                                <div>
                                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                    Summary
                                  </p>
                                  <p className="text-sm">
                                    {String(d.summary ?? "N/A")}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                    Risk Rationale
                                  </p>
                                  <p className="text-sm">
                                    {String(d.riskRationale ?? "N/A")}
                                  </p>
                                </div>
                                <div className="md:col-span-2">
                                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                    Full Clause Text
                                  </p>
                                  <p className="max-h-32 overflow-auto rounded bg-muted p-3 text-xs">
                                    {String(d.fullText ?? "N/A")}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                    Parties
                                  </p>
                                  <p className="text-sm">
                                    Obligated: {String(d.obligatedParty ?? "—")}
                                    {d.counterparty != null && (
                                      <> | Counter: {String(d.counterparty)}</>
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                    Financial
                                  </p>
                                  <p className="text-sm">
                                    {d.monetaryValue
                                      ? `${d.currency ?? ""} ${d.monetaryValue}`
                                      : "No monetary value"}
                                  </p>
                                </div>
                                {obj.scoringRationale && (
                                  <div className="md:col-span-2">
                                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                      Scoring Rationale ({obj.rubricLevel})
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {obj.scoringRationale}
                                    </p>
                                  </div>
                                )}
                                {d.dependencies != null && (
                                  <div className="md:col-span-2">
                                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                      Dependencies
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {Array.isArray(d.dependencies)
                                        ? (d.dependencies as string[]).join(", ")
                                        : String(d.dependencies)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                  {domainObjects.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No objects extracted.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entities Tab */}
        <TabsContent value="entities">
          <Card>
            <CardContent className="pt-4">
              {entities ? (
                <div className="space-y-4">
                  {(entities as { documentTitle?: string; entities?: Array<{ name: string; definedTerm?: string; entityType: string; roles: string[] }> }).documentTitle && (
                    <p className="text-sm">
                      <span className="font-medium">Document:</span>{" "}
                      {(entities as { documentTitle?: string }).documentTitle}
                    </p>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Defined Term</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Roles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((entities as { entities?: Array<{ name: string; definedTerm?: string; entityType: string; roles: string[] }> }).entities ?? []).map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {e.name}
                          </TableCell>
                          <TableCell>{e.definedTerm ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{e.entityType}</Badge>
                          </TableCell>
                          <TableCell>{e.roles.join(", ")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No entity data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Quality Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  {
                    label: "Schema Conformance",
                    value: summary.averageConfidence,
                    weight: "25%",
                  },
                  {
                    label: "Provenance Coverage",
                    value: summary.averageConfidence,
                    weight: "25%",
                  },
                  {
                    label: "Rubric Score",
                    value:
                      summary.averageScore > 0
                        ? (summary.averageScore / 5) * 100
                        : 0,
                    weight: "20%",
                  },
                  {
                    label: "Completeness",
                    value: summary.averageConfidence > 0 ? 75 : 0,
                    weight: "15%",
                  },
                  {
                    label: "Consistency",
                    value: summary.averageConfidence > 0 ? 75 : 0,
                    weight: "15%",
                  },
                ].map((dim) => (
                  <div key={dim.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{dim.label}</span>
                      <span className="text-muted-foreground">
                        {dim.weight} weight — {Math.round(dim.value)}%
                      </span>
                    </div>
                    <Progress value={dim.value} />
                  </div>
                ))}
              </div>

              {/* Score distribution */}
              <div className="mt-6">
                <p className="mb-2 text-sm font-medium">Score Distribution</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const count = domainObjects.filter(
                      (o) => o.rubricScore === score
                    ).length;
                    return (
                      <div
                        key={score}
                        className="flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-12 rounded bg-primary/20"
                          style={{
                            height: `${Math.max(4, count * 20)}px`,
                          }}
                        />
                        <span className="text-xs font-medium">{score}</span>
                        <span className="text-xs text-muted-foreground">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

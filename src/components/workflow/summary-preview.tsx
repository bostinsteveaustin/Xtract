"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryPreviewProps {
  summary: {
    totalObjects: number;
    totalRelationships: number;
    averageRubricScore: number;
    averageConfidence: number;
    scoreDistribution: Record<number, number>;
    scoredCount: number;
  };
  metadata?: {
    extractionId?: string;
    startedAt?: string;
  };
}

export function SummaryPreview({ summary, metadata }: SummaryPreviewProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">
              Objects
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-2xl font-bold">{summary.totalObjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">
              Relationships
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-2xl font-bold">
              {summary.totalRelationships}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">
              Avg Score
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-2xl font-bold">
              {summary.averageRubricScore}
              <span className="text-sm font-normal text-muted-foreground">
                /100
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-2xl font-bold">
              {summary.averageConfidence}
              <span className="text-sm font-normal text-muted-foreground">
                %
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution */}
      {summary.scoredCount > 0 && (
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1.5">
              {Object.entries(summary.scoreDistribution)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([score, count]) => (
                  <div key={score} className="flex items-center gap-2 text-sm">
                    <span className="w-14 text-right font-mono text-xs">
                      Score {score}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{
                          width: `${Math.min(
                            (count / summary.scoredCount) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="w-6 text-xs text-muted-foreground">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {metadata && (
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">
              Run Info
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1 text-xs">
            {metadata.extractionId && (
              <div>
                <span className="text-muted-foreground">ID: </span>
                <span className="font-mono">{metadata.extractionId}</span>
              </div>
            )}
            {metadata.startedAt && (
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span>
                  {new Date(metadata.startedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCtxLibrary } from "@/hooks/use-ctx-library";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Layers } from "lucide-react";

export default function CTXLibraryPage() {
  const { ctxFiles, loading } = useCtxLibrary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CTX Library</h1>
        <p className="text-sm text-muted-foreground">
          Pre-built and generated context files for extraction
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : ctxFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No CTX files available.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ctxFiles.map((ctx) => (
            <Link key={ctx.id} href={`/dashboard/ctx/${ctx.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{ctx.name}</CardTitle>
                    <Badge
                      variant={
                        ctx.status === "approved" ? "default" : "secondary"
                      }
                    >
                      {ctx.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ctx.domain && (
                    <p className="text-sm text-muted-foreground">
                      {ctx.domain}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {ctx.sectionCount} sections
                    </span>
                    {ctx.xqsKScore != null && (
                      <span>XQS-K: {ctx.xqsKScore}%</span>
                    )}
                    <span>v{ctx.version}</span>
                  </div>
                  {ctx.contextType && (
                    <Badge variant="outline" className="text-xs">
                      {ctx.contextType}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

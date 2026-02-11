"use client";

import Link from "next/link";
import { useExtractions } from "@/hooks/use-extractions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Activity, BarChart3, Plus } from "lucide-react";

const statusColors: Record<string, string> = {
  created: "bg-slate-100 text-slate-700",
  ingesting: "bg-blue-100 text-blue-700",
  extracting: "bg-amber-100 text-amber-700",
  synthesising: "bg-purple-100 text-purple-700",
  validating: "bg-cyan-100 text-cyan-700",
  review: "bg-emerald-100 text-emerald-700",
  approved: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function DashboardPage() {
  const { extractions, loading } = useExtractions();

  const totalExtractions = extractions.length;
  const activeExtractions = extractions.filter((e) =>
    ["ingesting", "extracting", "synthesising", "validating"].includes(e.status)
  ).length;
  const avgScore =
    extractions.filter((e) => e.xqsScore != null).length > 0
      ? Math.round(
          extractions
            .filter((e) => e.xqsScore != null)
            .reduce((s, e) => s + (e.xqsScore ?? 0), 0) /
            extractions.filter((e) => e.xqsScore != null).length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Contract Intelligence extraction overview
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/extractions/new">
            <Plus className="mr-2 h-4 w-4" />
            New Extraction
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Extractions
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-12" /> : totalExtractions}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                activeExtractions
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Quality Score
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : avgScore > 0 ? (
                `${avgScore}%`
              ) : (
                "—"
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Extractions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Extractions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : extractions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No extractions yet. Upload a contract to get started.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/dashboard/extractions/new">
                  Start Your First Extraction
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractions.slice(0, 10).map((ext) => (
                  <TableRow key={ext.id}>
                    <TableCell>
                      <Link
                        href={
                          ext.status === "review" || ext.status === "approved"
                            ? `/dashboard/extractions/${ext.id}/review`
                            : `/dashboard/extractions/${ext.id}`
                        }
                        className="font-medium hover:underline"
                      >
                        {ext.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ext.mode === "mode2" ? "Mode 2" : "Mode 1"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ext.status] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {ext.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {ext.xqsScore != null ? `${ext.xqsScore}%` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(ext.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

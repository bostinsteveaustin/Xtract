import { NextResponse } from "next/server";
import { generateCSVExports } from "@/lib/ontology/csv-exporter";
import { runBenchmarks } from "@/lib/ontology/benchmark-validator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { turtle, config, metrics, flags } = body as {
      turtle: string;
      config?: {
        namespace?: string;
        ontologyTitle?: string;
      };
      metrics?: Record<string, number>;
      flags?: unknown[];
    };

    if (!turtle) {
      return NextResponse.json(
        { error: "Missing turtle content" },
        { status: 400 }
      );
    }

    // Generate CSV exports
    const csvExports = generateCSVExports(turtle);

    // Run benchmark validation
    const benchmarkResults = runBenchmarks(turtle);

    // Build run summary
    const runSummary = {
      generatedAt: new Date().toISOString(),
      config: config ?? {},
      metrics: metrics ?? {},
      benchmarks: {
        total: benchmarkResults.length,
        passing: benchmarkResults.filter((b) => b.passed).length,
        queries: benchmarkResults,
      },
      flagCount: flags?.length ?? 0,
    };

    // Add turtle + run summary to downloadable files
    const files = [
      {
        name: "ontology.ttl",
        size: formatSize(turtle),
        format: "ttl",
        content: turtle,
      },
      ...csvExports.files,
      {
        name: "run_summary.json",
        size: formatSize(JSON.stringify(runSummary, null, 2)),
        format: "json",
        content: JSON.stringify(runSummary, null, 2),
      },
    ];

    return NextResponse.json({
      files,
      benchmarks: benchmarkResults,
      summary: runSummary,
    });
  } catch (error) {
    console.error("POST /api/ontology/export error:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}

function formatSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

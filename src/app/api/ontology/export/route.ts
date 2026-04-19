import { NextResponse } from "next/server";
import { generateCSVExports } from "@/lib/ontology/csv-exporter";
import { runBenchmarks } from "@/lib/ontology/benchmark-validator";
import { requireAuth } from "@/lib/api/auth";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { turtle, config, flags } = body as {
      turtle: string;
      config?: {
        namespace?: string;
        ontologyTitle?: string;
      };
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

    // Count entities from turtle
    const classCount = (turtle.match(/a\s+owl:Class/g) ?? []).length;
    const objPropCount = (turtle.match(/a\s+owl:ObjectProperty/g) ?? []).length;
    const dataPropCount = (turtle.match(/a\s+owl:DatatypeProperty/g) ?? []).length;
    const tripleCount = turtle.split(".\n").length;
    const queriesPassing = benchmarkResults.filter((b) => b.passed).length;

    const metrics = {
      classes: classCount,
      objectProperties: objPropCount,
      dataProperties: dataPropCount,
      triples: tripleCount,
      flagsRaised: flags?.length ?? 0,
      queriesPassing,
      totalQueries: benchmarkResults.length,
    };

    // Build run summary
    const runSummary = {
      generatedAt: new Date().toISOString(),
      config: config ?? {},
      metrics,
      benchmarks: {
        total: benchmarkResults.length,
        passing: queriesPassing,
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
      metrics,
      benchmarkResults,
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

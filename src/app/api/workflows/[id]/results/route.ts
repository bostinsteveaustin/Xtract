// GET /api/workflows/[id]/results — Load extraction results for a workflow

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get optional workflowRunId from query params
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    // Load the workflow run — either specific or latest
    let runQuery = admin
      .from("workflow_runs")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("started_at", { ascending: false });

    if (runId) {
      runQuery = runQuery.eq("id", runId);
    }

    const { data: runs } = await runQuery.limit(1);
    const run = runs?.[0];

    if (!run) {
      return NextResponse.json(
        { error: "No workflow runs found" },
        { status: 404 }
      );
    }

    // Load extracted objects (exclude _entities metadata)
    const { data: objects } = await admin
      .from("extracted_objects")
      .select("*")
      .eq("workflow_run_id", run.id)
      .neq("object_type", "_entities")
      .order("created_at", { ascending: true });

    // Load entity metadata
    const { data: entityRecords } = await admin
      .from("extracted_objects")
      .select("*")
      .eq("workflow_run_id", run.id)
      .eq("object_type", "_entities")
      .limit(1);

    const entityData = entityRecords?.[0]?.attributes as {
      documentTitle?: string;
      documentDate?: string;
      governingLaw?: string;
      entities?: Array<{
        name: string;
        definedTerm?: string;
        entityType: string;
        roles: string[];
      }>;
    } | null;

    // Load relationships
    const { data: relationships } = await admin
      .from("object_relationships")
      .select("*")
      .eq("workflow_run_id", run.id)
      .order("created_at", { ascending: true });

    // Build summary
    const realObjects = objects ?? [];
    const scoredObjects = realObjects.filter((o) => o.rubric_score != null);
    const avgScore =
      scoredObjects.length > 0
        ? Math.round(
            scoredObjects.reduce((s, o) => s + (o.rubric_score ?? 0), 0) /
              scoredObjects.length
          )
        : 0;
    const avgConfidence =
      realObjects.length > 0
        ? Math.round(
            realObjects.reduce((s, o) => s + (o.confidence ?? 0), 0) /
              realObjects.length
          )
        : 0;

    const scoreDistribution: Record<number, number> = {};
    for (const o of scoredObjects) {
      const score = o.rubric_score ?? 0;
      scoreDistribution[score] = (scoreDistribution[score] ?? 0) + 1;
    }

    return NextResponse.json({
      workflowRunId: run.id,
      status: run.status,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      errorMessage: run.error_message,
      entities: entityData,
      objects: realObjects,
      relationships: relationships ?? [],
      summary: {
        totalObjects: realObjects.length,
        totalRelationships: (relationships ?? []).length,
        averageRubricScore: avgScore,
        averageConfidence: avgConfidence,
        scoreDistribution,
        scoredCount: scoredObjects.length,
      },
    });
  } catch (error) {
    console.error("Results error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load results",
      },
      { status: 500 }
    );
  }
}

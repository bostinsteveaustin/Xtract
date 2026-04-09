import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ResultsSplitPane } from "@/components/workflow/results-split-pane";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { CTXFile } from "@/types/ctx";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ runId?: string }>;
}

export default async function ResultsPage({ params, searchParams }: ResultsPageProps) {
  const { id: workflowId } = await params;
  const { runId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  // Load workflow runs for this workflow
  const { data: allRuns } = await admin
    .from("workflow_runs")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("started_at", { ascending: false })
    .limit(10);

  // If a specific runId is provided, find that one; otherwise use the latest
  const matchedRun = runId
    ? allRuns?.find((r) => r.id === runId)
    : allRuns?.[0];

  if (!matchedRun) {
    return (
      <div className="p-6">
        <Link href="/workflows">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to workflow
          </Button>
        </Link>
        <div className="mt-8 text-center text-muted-foreground">
          No extraction results found. Run the extraction pipeline first.
        </div>
      </div>
    );
  }

  // Load objects (excluding metadata)
  const { data: objects } = await admin
    .from("extracted_objects")
    .select("*")
    .eq("workflow_run_id", matchedRun.id)
    .neq("object_type", "_entities")
    .order("created_at", { ascending: true });

  // Load relationships
  const { data: relationships } = await admin
    .from("object_relationships")
    .select("*")
    .eq("workflow_run_id", matchedRun.id)
    .order("created_at", { ascending: true });

  // Load CTX config to get the objectSpec (column definitions for XLSX preview)
  let attributeSpec: { name: string; type: string }[] = [];
  if (matchedRun.ctx_configuration_id) {
    const { data: ctxConfig } = await admin
      .from("ctx_configurations")
      .select("content")
      .eq("id", matchedRun.ctx_configuration_id)
      .single();

    if (ctxConfig?.content) {
      const ctxFile = ctxConfig.content as unknown as CTXFile;
      const objectTypes = ctxFile?.sections?.objects?.objectTypes;
      if (objectTypes && objectTypes.length > 0) {
        attributeSpec = objectTypes[0].attributes.map((a) => ({
          name: a.name,
          type: a.type,
        }));
      }
    }
  }

  // Fallback: if no objectSpec, derive columns from the first object's attributes
  if (attributeSpec.length === 0 && objects && objects.length > 0) {
    const firstAttrs = objects[0].attributes as Record<string, unknown> | null;
    if (firstAttrs) {
      attributeSpec = Object.keys(firstAttrs).map((key) => ({
        name: key,
        type: "text",
      }));
    }
  }

  const realObjects = objects ?? [];
  const rels = relationships ?? [];

  // Build summary
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

  const summary = {
    totalObjects: realObjects.length,
    totalRelationships: rels.length,
    averageRubricScore: avgScore,
    averageConfidence: avgConfidence,
    scoreDistribution,
    scoredCount: scoredObjects.length,
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/workflows">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Extraction Results</h1>
            <p className="text-sm text-muted-foreground">
              Run: {matchedRun.id.slice(0, 8)} · Status: {matchedRun.status} · {matchedRun.started_at ? new Date(matchedRun.started_at).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>
      </div>

      <ResultsSplitPane
        objects={realObjects as any}
        relationships={rels as any}
        summary={summary}
        attributeSpec={attributeSpec}
        metadata={{
          extractionId: matchedRun.id.slice(0, 8),
          startedAt: matchedRun.started_at ?? undefined,
        }}
      />
    </div>
  );
}

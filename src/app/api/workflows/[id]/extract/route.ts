// POST /api/workflows/[id]/extract — Run Mode 2 5-pass extraction pipeline

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateObject } from "ai";
import { extractionModel } from "@/lib/ai/client";
import { chunkText } from "@/lib/documents";
import type { CTXFile } from "@/types/ctx";
import {
  buildMode2SystemPrompt,
  buildEntityExtractionPrompt,
  buildObjectExtractionPrompt,
  buildRelationshipPrompt,
  buildScoringPrompt,
} from "@/lib/pipeline/prompts/mode2-prompts";
import {
  buildEntityExtractionSchema,
  buildObjectExtractionSchema,
  buildRelationshipSchema,
  buildScoringSchema,
} from "@/lib/ctx/schema-builder";

// Allow up to 300s for extraction (Vercel Pro)
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const body = await request.json();
    const { documentSetId, ctxConfigurationId } = body as {
      documentSetId: string;
      ctxConfigurationId: string;
    };

    if (!documentSetId || !ctxConfigurationId) {
      return NextResponse.json(
        { error: "documentSetId and ctxConfigurationId required" },
        { status: 400 }
      );
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Load CTX configuration
    const { data: ctxConfig } = await admin
      .from("ctx_configurations")
      .select("*")
      .eq("id", ctxConfigurationId)
      .single();

    if (!ctxConfig) {
      return NextResponse.json(
        { error: "CTX configuration not found" },
        { status: 404 }
      );
    }

    const ctxFile = ctxConfig.content as unknown as CTXFile;
    const objectSpec = ctxFile.sections?.objects?.objectTypes?.[0];
    if (!objectSpec) {
      return NextResponse.json(
        { error: "CTX has no object specification" },
        { status: 400 }
      );
    }

    const definitions = ctxFile.sections?.definitions;
    const pitfalls = ctxFile.sections?.pitfalls;
    const tacit = ctxFile.sections?.tacit;
    const rubric = ctxFile.sections?.assessment_criteria?.rubrics?.[0];

    // Load documents
    const { data: documents } = await admin
      .from("documents")
      .select("*")
      .eq("document_set_id", documentSetId)
      .eq("status", "ready");

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: "No processed documents found" },
        { status: 400 }
      );
    }

    // Verify workflow exists
    const { data: workflow } = await admin
      .from("workflows")
      .select("id")
      .eq("id", workflowId)
      .single();

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Create workflow run
    const { data: run, error: runError } = await admin
      .from("workflow_runs")
      .insert({
        workflow_id: workflowId,
        document_set_id: documentSetId,
        ctx_configuration_id: ctxConfigurationId,
        status: "running",
        started_at: new Date().toISOString(),
        run_by: user.id,
        node_states: {},
      })
      .select()
      .single();

    if (runError || !run) {
      console.error("Workflow run creation error:", runError);
      return NextResponse.json(
        { error: "Failed to create workflow run" },
        { status: 500 }
      );
    }

    const workflowRunId = run.id;

    try {
      // ── Pass 1: Segmentation ──────────────────────────────────
      const fullText = documents.map((d) => d.text_content ?? "").join("\n\n---\n\n");
      const chunks = chunkText(fullText);

      // Build system prompt (used across passes 2-3)
      const systemPrompt = buildMode2SystemPrompt(
        objectSpec,
        definitions,
        pitfalls,
        tacit
      );

      // ── Pass 2: Entity Extraction ─────────────────────────────
      const entityPrompt = buildEntityExtractionPrompt(
        fullText.slice(0, 30000) // First 30k chars for entity detection
      );
      const entitySchema = buildEntityExtractionSchema();

      const entityResult = await generateObject({
        model: extractionModel,
        schema: entitySchema,
        system: systemPrompt,
        prompt: entityPrompt,
      });

      const entityData = entityResult.object as Record<string, unknown>;

      // Store entity metadata
      await admin.from("extracted_objects").insert({
        workflow_run_id: workflowRunId,
        object_type: "_entities",
        attributes: JSON.parse(JSON.stringify(entityData)),
        status: "approved",
      });

      // Format entities for subsequent passes
      const entitySummary = JSON.stringify(entityData, null, 2);

      // ── Pass 3: Object Extraction (per chunk) ─────────────────
      const allObjects: Array<Record<string, unknown>> = [];
      const objectSchema = buildObjectExtractionSchema(objectSpec);

      for (let i = 0; i < chunks.length; i++) {
        const chunkPrompt = buildObjectExtractionPrompt(
          chunks[i].text,
          entitySummary,
          i,
          chunks.length
        );

        try {
          const chunkResult = await generateObject({
            model: extractionModel,
            schema: objectSchema,
            system: systemPrompt,
            prompt: chunkPrompt,
          });

          const extracted = chunkResult.object as {
            objects?: Record<string, unknown>[];
          };
          if (extracted.objects) {
            allObjects.push(...extracted.objects);
          }
        } catch (err) {
          console.error(`Pass 3 chunk ${i} error:`, err);
          // Continue with other chunks
        }
      }

      // Deduplicate by objectID
      const seen = new Set<string>();
      const uniqueObjects = allObjects.filter((obj) => {
        const id = String(obj.objectID ?? "");
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      // Insert extracted objects
      const sourceDocId = documents[0]?.id ?? null;
      for (const obj of uniqueObjects) {
        const confidence = obj.confidence === "high" ? 90 : obj.confidence === "medium" ? 70 : 50;
        await admin.from("extracted_objects").insert({
          workflow_run_id: workflowRunId,
          object_type: objectSpec.typeName,
          object_icml_id: String(obj.objectID ?? ""),
          attributes: JSON.parse(JSON.stringify(obj)),
          source_document_id: sourceDocId,
          source_clause_text: String(obj.sourceClause ?? ""),
          confidence,
          status: "pending",
        });
      }

      // ── Pass 4: Relationship Resolution ───────────────────────
      if (uniqueObjects.length > 1) {
        const objectsJson = JSON.stringify(
          uniqueObjects.map((o) => ({
            objectID: o.objectID,
            termName: o.termName,
            termType: o.termType,
            summary: o.summary,
          })),
          null,
          2
        );

        const relPrompt = buildRelationshipPrompt(objectsJson);
        const relSchema = buildRelationshipSchema();

        try {
          const relResult = await generateObject({
            model: extractionModel,
            schema: relSchema,
            system: systemPrompt,
            prompt: relPrompt,
          });

          const relData = relResult.object as {
            relationships?: Array<{
              fromObjectId: string;
              toObjectId: string;
              relationshipType: string;
              direction?: string;
              confidence?: number;
              description: string;
            }>;
          };

          // Insert relationships
          if (relData.relationships) {
            for (const rel of relData.relationships) {
              await admin.from("object_relationships").insert({
                workflow_run_id: workflowRunId,
                from_object_icml_id: rel.fromObjectId,
                to_object_icml_id: rel.toObjectId,
                relationship_type: rel.relationshipType,
                direction: rel.direction ?? "unidirectional",
                confidence: rel.confidence ?? 70,
                source: "extraction",
                description: rel.description,
              });
            }
          }
        } catch (err) {
          console.error("Pass 4 error:", err);
          // Non-fatal: relationships are supplementary
        }
      }

      // ── Pass 5: Rubric Scoring ────────────────────────────────
      if (rubric && uniqueObjects.length > 0) {
        const objectsForScoring = JSON.stringify(
          uniqueObjects.map((o) => ({
            objectID: o.objectID,
            termName: o.termName,
            termType: o.termType,
            fullText: o.fullText,
            summary: o.summary,
            riskLevel: o.riskLevel,
          })),
          null,
          2
        );

        const scorePrompt = buildScoringPrompt(objectsForScoring, rubric);
        const scoreSchema = buildScoringSchema();

        try {
          const scoreResult = await generateObject({
            model: extractionModel,
            schema: scoreSchema,
            system: systemPrompt,
            prompt: scorePrompt,
          });

          const scoreData = scoreResult.object as {
            scores?: Array<{
              objectId: string;
              score: number;
              level: string;
              rationale: string;
            }>;
          };

          // Update objects with scores
          if (scoreData.scores) {
            for (const score of scoreData.scores) {
              // Find the DB record by icml ID
              const { data: objRecord } = await admin
                .from("extracted_objects")
                .select("id")
                .eq("workflow_run_id", workflowRunId)
                .eq("object_icml_id", score.objectId)
                .single();

              if (objRecord) {
                await admin
                  .from("extracted_objects")
                  .update({
                    rubric_score: score.score,
                    rubric_level: score.level,
                    scoring_rationale: score.rationale,
                  })
                  .eq("id", objRecord.id);
              }
            }
          }
        } catch (err) {
          console.error("Pass 5 error:", err);
          // Non-fatal: scoring is supplementary
        }
      }

      // ── Finalize ──────────────────────────────────────────────
      await admin
        .from("workflow_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", workflowRunId);

      // Get summary
      const { data: resultObjects } = await admin
        .from("extracted_objects")
        .select("rubric_score, confidence")
        .eq("workflow_run_id", workflowRunId)
        .neq("object_type", "_entities");

      const objectCount = resultObjects?.length ?? 0;
      const scored = resultObjects?.filter((o) => o.rubric_score != null) ?? [];
      const avgScore =
        scored.length > 0
          ? Math.round(
              scored.reduce((s, o) => s + (o.rubric_score ?? 0), 0) /
                scored.length
            )
          : 0;

      return NextResponse.json({
        workflowRunId,
        objectCount,
        averageScore: avgScore,
        passesCompleted: 5,
      });
    } catch (pipelineError) {
      // Mark run as failed
      await admin
        .from("workflow_runs")
        .update({
          status: "failed",
          error_message:
            pipelineError instanceof Error
              ? pipelineError.message
              : "Unknown pipeline error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", workflowRunId);

      throw pipelineError;
    }
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Extraction failed",
      },
      { status: 500 }
    );
  }
}

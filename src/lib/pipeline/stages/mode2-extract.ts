// Mode 2 extraction stage — schema-driven extraction using CTX Section 11
// 5-pass pipeline: Schema Load → Entities → Objects → Relationships → Scoring

import { generateObject } from "ai";
import { extractionModel } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { sources, ctxSections, domainObjects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { chunkText } from "@/lib/documents/chunker";
import {
  buildEntityExtractionSchema,
  buildObjectExtractionSchema,
  buildRelationshipSchema,
  buildScoringSchema,
} from "@/lib/ctx/schema-builder";
import {
  buildMode2SystemPrompt,
  buildEntityExtractionPrompt,
  buildObjectExtractionPrompt,
  buildRelationshipPrompt,
  buildScoringPrompt,
} from "../prompts/mode2-prompts";
import type {
  PipelineContext,
  PipelineStageHandler,
  StageResult,
} from "../types";
import type {
  ObjectTypeSpec,
  ObjectsSection,
  DefinitionsSection,
  PitfallsSection,
  TacitSection,
  AssessmentCriteriaSection,
  AssessmentRubric,
} from "@/types/ctx";

export const mode2ExtractStage: PipelineStageHandler = {
  name: "extract",

  async execute(ctx: PipelineContext): Promise<StageResult> {
    let totalTokensUsed = 0;
    const startTime = Date.now();

    // ─── Pass 1: Schema Loading ──────────────────────────────────────
    ctx.onProgress({
      stage: "extract",
      status: "running",
      message: "Pass 1/5: Loading extraction schema from CTX Section 11...",
      data: {
        type: "mode2" as const,
        pass: 1,
        totalPasses: 5,
      },
      timestamp: Date.now(),
    });

    if (!ctx.ctxFileId) {
      return {
        success: false,
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
        error: "No CTX file ID provided for Mode 2 extraction",
      };
    }

    // Load all CTX sections
    const sections = await db
      .select()
      .from(ctxSections)
      .where(eq(ctxSections.ctxFileId, ctx.ctxFileId));

    // Find required sections
    const objectsSection = sections.find((s) => s.sectionKey === "objects");
    if (!objectsSection?.content) {
      return {
        success: false,
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
        error:
          "CTX file has no Section 11 (Objects) — cannot perform Mode 2 extraction",
      };
    }

    const objectsSectionContent =
      objectsSection.content as unknown as ObjectsSection;
    const objectSpec: ObjectTypeSpec = objectsSectionContent.objectTypes[0];

    if (!objectSpec) {
      return {
        success: false,
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
        error: "No object types defined in Section 11",
      };
    }

    // Load supporting sections (optional — extraction works without them)
    const definitionsContent = sections.find(
      (s) => s.sectionKey === "definitions"
    )?.content as unknown as DefinitionsSection | undefined;
    const pitfallsContent = sections.find(
      (s) => s.sectionKey === "pitfalls"
    )?.content as unknown as PitfallsSection | undefined;
    const tacitContent = sections.find(
      (s) => s.sectionKey === "tacit"
    )?.content as unknown as TacitSection | undefined;
    const assessmentContent = sections.find(
      (s) => s.sectionKey === "assessment_criteria"
    )?.content as unknown as AssessmentCriteriaSection | undefined;

    // Build system prompt with all CTX context
    const systemPrompt = buildMode2SystemPrompt(
      objectSpec,
      definitionsContent,
      pitfallsContent,
      tacitContent
    );

    ctx.onProgress({
      stage: "extract",
      status: "running",
      message: `Pass 1/5: Schema loaded — ${objectSpec.typeName} with ${objectSpec.attributes.length} attributes`,
      data: {
        type: "mode2" as const,
        pass: 1,
        totalPasses: 5,
        objectType: objectSpec.typeName,
        attributeCount: objectSpec.attributes.length,
      },
      timestamp: Date.now(),
    });

    // ─── Get source text ─────────────────────────────────────────────

    const sourceDocs = await db
      .select()
      .from(sources)
      .where(eq(sources.extractionId, ctx.extractionId));

    const combinedSourceText = sourceDocs
      .map((s) => `--- Source: ${s.fileName} ---\n${s.textContent ?? ""}`)
      .join("\n\n");

    if (!combinedSourceText.trim()) {
      return {
        success: false,
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
        error: "No text content found in source documents",
      };
    }

    // ─── Pass 2: Entity Extraction ───────────────────────────────────
    ctx.onProgress({
      stage: "extract",
      status: "running",
      message: "Pass 2/5: Extracting entities and document metadata...",
      data: {
        type: "mode2" as const,
        pass: 2,
        totalPasses: 5,
      },
      timestamp: Date.now(),
    });

    const entitySchema = buildEntityExtractionSchema();
    const entityPrompt = buildEntityExtractionPrompt(combinedSourceText);

    let entityResult: {
      documentTitle: string;
      documentDate?: string | null;
      governingLaw?: string | null;
      entities: Array<{
        name: string;
        definedTerm?: string | null;
        entityType: string;
        roles: string[];
      }>;
    };

    try {
      const entityResponse = await generateObject({
        model: extractionModel,
        schema: entitySchema,
        system: systemPrompt,
        prompt: entityPrompt,
      });

      entityResult = entityResponse.object as typeof entityResult;
      totalTokensUsed += entityResponse.usage?.totalTokens ?? 0;
    } catch (error) {
      console.error("Pass 2 entity extraction failed:", error);
      // Fallback with empty entities — extraction can still proceed
      entityResult = {
        documentTitle: sourceDocs[0]?.fileName ?? "Unknown document",
        entities: [],
      };
    }

    const entitiesSummary = entityResult.entities
      .map(
        (e) =>
          `- ${e.name}${e.definedTerm ? ` (defined as "${e.definedTerm}")` : ""}: ${e.entityType} — roles: ${e.roles.join(", ")}`
      )
      .join("\n");

    ctx.onProgress({
      stage: "extract",
      status: "running",
      message: `Pass 2/5: Found ${entityResult.entities.length} entities`,
      data: {
        type: "mode2" as const,
        pass: 2,
        totalPasses: 5,
        entitiesFound: entityResult.entities.length,
        documentTitle: entityResult.documentTitle,
      },
      timestamp: Date.now(),
    });

    // ─── Pass 3: Object Extraction (chunk by chunk) ──────────────────
    ctx.onProgress({
      stage: "extract",
      status: "running",
      message: "Pass 3/5: Extracting contract terms...",
      data: {
        type: "mode2" as const,
        pass: 3,
        totalPasses: 5,
      },
      timestamp: Date.now(),
    });

    // Chunk the source text — larger chunks for contracts
    const chunks = chunkText(combinedSourceText, {
      chunkSize: 12000,
      overlap: 1000,
      respectSections: true,
    });

    const extractionSchema = buildObjectExtractionSchema(objectSpec);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allExtractedObjects: Record<string, any>[] = [];
    let objectCounter = 1;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      ctx.onProgress({
        stage: "extract",
        status: "running",
        message: `Pass 3/5: Extracting from chunk ${i + 1}/${chunks.length} — ${allExtractedObjects.length} objects found so far`,
        data: {
          type: "mode2" as const,
          pass: 3,
          totalPasses: 5,
          currentChunk: i + 1,
          totalChunks: chunks.length,
          objectsFound: allExtractedObjects.length,
        },
        timestamp: Date.now(),
      });

      try {
        const extractionPrompt = buildObjectExtractionPrompt(
          chunk.text,
          entitiesSummary,
          i,
          chunks.length
        );

        const extractionResponse = await generateObject({
          model: extractionModel,
          schema: extractionSchema,
          system: systemPrompt,
          prompt: extractionPrompt,
        });

        totalTokensUsed += extractionResponse.usage?.totalTokens ?? 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = extractionResponse.object as { objects: any[] };

        if (result.objects && Array.isArray(result.objects)) {
          for (const obj of result.objects) {
            // Assign sequential IDs if not properly generated
            if (!obj.objectID || obj.objectID === "") {
              obj.objectID = `icml:OBJ-CT-${String(objectCounter).padStart(3, "0")}`;
            }
            objectCounter++;

            // Deduplicate: skip if we already have an object with the same clauseReference + termName
            const isDuplicate = allExtractedObjects.some(
              (existing) =>
                existing.clauseReference &&
                obj.clauseReference &&
                existing.clauseReference === obj.clauseReference &&
                existing.termName === obj.termName
            );

            if (!isDuplicate) {
              allExtractedObjects.push(obj);
            }
          }
        }
      } catch (error) {
        console.error(
          `Pass 3 chunk ${i + 1} extraction failed:`,
          error
        );
        // Continue with remaining chunks
      }
    }

    ctx.onProgress({
      stage: "extract",
      status: "running",
      message: `Pass 3/5: Extracted ${allExtractedObjects.length} ${objectSpec.typeName} objects`,
      data: {
        type: "mode2" as const,
        pass: 3,
        totalPasses: 5,
        objectsExtracted: allExtractedObjects.length,
      },
      timestamp: Date.now(),
    });

    if (allExtractedObjects.length === 0) {
      return {
        success: false,
        tokensUsed: totalTokensUsed,
        durationMs: Date.now() - startTime,
        error: "No objects extracted from source documents",
      };
    }

    // Re-number objects sequentially after deduplication
    for (let i = 0; i < allExtractedObjects.length; i++) {
      allExtractedObjects[i].objectID = `icml:OBJ-CT-${String(i + 1).padStart(3, "0")}`;
    }

    // ─── Pass 4: Relationship Resolution ─────────────────────────────
    ctx.onProgress({
      stage: "extract",
      status: "running",
      message: "Pass 4/5: Resolving relationships between extracted terms...",
      data: {
        type: "mode2" as const,
        pass: 4,
        totalPasses: 5,
      },
      timestamp: Date.now(),
    });

    const relationshipSchemaObj = buildRelationshipSchema();
    const objectsSummary = allExtractedObjects
      .map(
        (obj) =>
          `[${obj.objectID}] ${obj.termName} (${obj.termType}) — Clause: ${obj.clauseReference}`
      )
      .join("\n");

    try {
      const relationshipPrompt = buildRelationshipPrompt(objectsSummary);

      const relationshipResponse = await generateObject({
        model: extractionModel,
        schema: relationshipSchemaObj,
        system: systemPrompt,
        prompt: relationshipPrompt,
      });

      totalTokensUsed += relationshipResponse.usage?.totalTokens ?? 0;

      const relResult = relationshipResponse.object as {
        relationships: Array<{
          fromObjectId: string;
          toObjectId: string;
          relationshipType: string;
          description: string;
        }>;
        crossReferences: Array<{
          objectId: string;
          referencedClause: string;
          resolution: string;
        }>;
      };

      // Update objects with dependencies
      if (relResult.relationships) {
        for (const rel of relResult.relationships) {
          const sourceObj = allExtractedObjects.find(
            (o) => o.objectID === rel.fromObjectId
          );
          if (sourceObj) {
            if (!sourceObj.dependencies) {
              sourceObj.dependencies = [];
            }
            sourceObj.dependencies.push(
              `${rel.toObjectId} (${rel.relationshipType}: ${rel.description})`
            );
          }
        }
      }

      ctx.onProgress({
        stage: "extract",
        status: "running",
        message: `Pass 4/5: Found ${relResult.relationships?.length ?? 0} relationships`,
        data: {
          type: "mode2" as const,
          pass: 4,
          totalPasses: 5,
          relationshipsFound: relResult.relationships?.length ?? 0,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Pass 4 relationship resolution failed:", error);
      // Non-critical — proceed without relationships
    }

    // ─── Pass 5: Rubric Scoring ──────────────────────────────────────
    ctx.onProgress({
      stage: "extract",
      status: "running",
      message: "Pass 5/5: Scoring extracted terms against rubric...",
      data: {
        type: "mode2" as const,
        pass: 5,
        totalPasses: 5,
      },
      timestamp: Date.now(),
    });

    // Find the scoring rubric from assessment criteria
    let scoringRubric: AssessmentRubric | undefined;
    if (assessmentContent?.rubrics) {
      const rubricRef = objectSpec.scoring.rubricReference;
      const rubricName = rubricRef.replace("@assessment_criteria.", "");
      scoringRubric = assessmentContent.rubrics.find(
        (r) => r.name === rubricName
      );
      if (!scoringRubric) {
        scoringRubric = assessmentContent.rubrics[0];
      }
    }

    if (scoringRubric) {
      const scoringSchemaObj = buildScoringSchema();

      // Score in batches of 8
      const batchSize = 8;
      for (
        let i = 0;
        i < allExtractedObjects.length;
        i += batchSize
      ) {
        const batch = allExtractedObjects.slice(i, i + batchSize);
        const batchSummary = batch
          .map(
            (obj) =>
              `[${obj.objectID}] ${obj.termName} (${obj.termType})
  Clause: ${obj.clauseReference}
  Summary: ${obj.summary ?? "N/A"}
  Risk: ${obj.riskLevel ?? "N/A"} — ${obj.riskRationale ?? "N/A"}
  Attributes populated: ${Object.entries(obj).filter(([, v]) => v != null && v !== "").length}/${objectSpec.attributes.length}`
          )
          .join("\n\n");

        try {
          const scoringPrompt = buildScoringPrompt(
            batchSummary,
            scoringRubric
          );

          const scoringResponse = await generateObject({
            model: extractionModel,
            schema: scoringSchemaObj,
            system: systemPrompt,
            prompt: scoringPrompt,
          });

          totalTokensUsed += scoringResponse.usage?.totalTokens ?? 0;

          const scoreResult = scoringResponse.object as {
            scores: Array<{
              objectId: string;
              score: number;
              level: string;
              rationale: string;
            }>;
          };

          if (scoreResult.scores) {
            for (const s of scoreResult.scores) {
              const obj = allExtractedObjects.find(
                (o) => o.objectID === s.objectId
              );
              if (obj) {
                obj._rubricScore = s.score;
                obj._rubricLevel = s.level;
                obj._scoringRationale = s.rationale;
              }
            }
          }
        } catch (error) {
          console.error(
            `Pass 5 scoring batch ${Math.floor(i / batchSize) + 1} failed:`,
            error
          );
        }
      }
    }

    ctx.onProgress({
      stage: "extract",
      status: "running",
      message: `Pass 5/5: Scoring complete. Saving ${allExtractedObjects.length} objects to database...`,
      data: {
        type: "mode2" as const,
        pass: 5,
        totalPasses: 5,
      },
      timestamp: Date.now(),
    });

    // ─── Save to database ────────────────────────────────────────────

    for (const obj of allExtractedObjects) {
      // Separate provenance/scoring metadata from object data
      const {
        objectID,
        sourceClause,
        confidence,
        extractionNotes,
        _rubricScore,
        _rubricLevel,
        _scoringRationale,
        ...objectData
      } = obj;

      // Map confidence string to numeric (high=90, medium=70, low=40)
      const confidenceNumeric =
        confidence === "high" ? 90 : confidence === "medium" ? 70 : 40;

      await db.insert(domainObjects).values({
        extractionId: ctx.extractionId,
        ctxFileId: ctx.ctxFileId!,
        objectIcmlId: objectID,
        objectType: objectSpec.typeName,
        objectData,
        sourceRef: sourceClause,
        confidence: confidenceNumeric,
        provenance: {
          sourceArtefact: sourceDocs[0]?.fileName ?? "unknown",
          sourceClause: sourceClause ?? "unknown",
          confidence: confidence ?? "medium",
          extractionMethod: "mode2-schema-driven",
          ctxReference: `${ctx.ctxFileId}:objects.${objectSpec.typeName}`,
        },
        rubricScore: _rubricScore ?? null,
        rubricLevel: _rubricLevel ?? null,
        scoringRationale: _scoringRationale ?? null,
        validationStatus: "pending",
      });
    }

    // Save entity data as a special metadata object
    if (entityResult.entities.length > 0) {
      await db.insert(domainObjects).values({
        extractionId: ctx.extractionId,
        ctxFileId: ctx.ctxFileId!,
        objectIcmlId: "icml:META-ENTITIES-001",
        objectType: "_entities",
        objectData: {
          documentTitle: entityResult.documentTitle,
          documentDate: entityResult.documentDate,
          governingLaw: entityResult.governingLaw,
          entities: entityResult.entities,
        },
        confidence: 85,
        provenance: {
          sourceArtefact: sourceDocs[0]?.fileName ?? "unknown",
          sourceClause: "full-document",
          confidence: "high",
          extractionMethod: "mode2-entity-extraction",
          ctxReference: ctx.ctxFileId!,
        },
        validationStatus: "valid",
      });
    }

    // Compute averages for the return value
    const scoredObjects = allExtractedObjects.filter(
      (o) => o._rubricScore != null
    );
    const avgScore =
      scoredObjects.length > 0
        ? Math.round(
            scoredObjects.reduce(
              (sum: number, o: { _rubricScore?: number }) =>
                sum + (o._rubricScore ?? 0),
              0
            ) / scoredObjects.length
          )
        : 0;

    const avgConfidence =
      allExtractedObjects.length > 0
        ? Math.round(
            allExtractedObjects.reduce(
              (sum: number, o: { confidence?: string }) => {
                const c =
                  o.confidence === "high"
                    ? 90
                    : o.confidence === "medium"
                      ? 70
                      : 40;
                return sum + c;
              },
              0
            ) / allExtractedObjects.length
          )
        : 0;

    return {
      success: true,
      tokensUsed: totalTokensUsed,
      durationMs: Date.now() - startTime,
      data: {
        mode: "mode2",
        objectType: objectSpec.typeName,
        objectsExtracted: allExtractedObjects.length,
        entitiesFound: entityResult.entities.length,
        averageScore: avgScore,
        averageConfidence: avgConfidence,
        chunksProcessed: chunks.length,
      },
    };
  },
};

// iCML JSON export serializer
// Assembles extraction results into ICMLExtractionOutput format

import type { DomainObject, Source, CTXFileRecord } from "@/lib/db/schema";
import { CTX_SPEC_VERSION, ICML_VERSION, XTRACT_TOOL_ID } from "@/lib/utils/constants";

export interface ICMLExportOutput {
  "@context": string;
  extractionMetadata: {
    extractionId: string;
    ctxReference: string;
    ctxVersion: string;
    icmlVersion: string;
    extractionDate: string;
    tool: string;
    sourceDocuments: Array<{
      fileName: string;
      fileType: string;
    }>;
  };
  entities: Array<{
    entityID: string;
    name: string;
    definedTerm?: string;
    entityType: string;
    roles: string[];
  }>;
  artefacts: Array<{
    artefactID: string;
    name: string;
    type: string;
    source: string;
  }>;
  objects: Array<{
    "@type": string;
    objectID: string;
    attributes: Record<string, unknown>;
    provenance: {
      sourceArtefact: string;
      sourceClause: string;
      confidence: string;
      extractionMethod: string;
      ctxReference: string;
    };
    rubricScore?: {
      score: number;
      level: string;
      rationale: string;
    };
  }>;
  qualitySummary: {
    totalObjects: number;
    averageRubricScore: number;
    averageConfidence: number;
    scoreDistribution: Record<string, number>;
  };
}

export function serializeToICML(
  extractionId: string,
  sourceDocs: Source[],
  domainObjectRecords: DomainObject[],
  ctxFile: CTXFileRecord
): ICMLExportOutput {
  // Separate real objects from entity metadata
  const realObjects = domainObjectRecords.filter(
    (o) => !o.objectType.startsWith("_")
  );
  const entityMeta = domainObjectRecords.find(
    (o) => o.objectType === "_entities"
  );
  const entityData = entityMeta?.objectData as {
    documentTitle?: string;
    entities?: Array<{
      name: string;
      definedTerm?: string;
      entityType: string;
      roles: string[];
    }>;
  } | null;

  // Build entities
  const entities = (entityData?.entities ?? []).map((e, i) => ({
    entityID: `icml:ENT-${String(i + 1).padStart(3, "0")}`,
    name: e.name,
    definedTerm: e.definedTerm ?? undefined,
    entityType: e.entityType,
    roles: e.roles,
  }));

  // Build artefacts (the source documents)
  const artefacts = sourceDocs.map((s, i) => ({
    artefactID: `icml:ART-${String(i + 1).padStart(3, "0")}`,
    name: s.fileName,
    type: s.fileType,
    source: s.blobUrl,
  }));

  // Build objects
  const objects = realObjects.map((o) => ({
    "@type": o.objectType,
    objectID: o.objectIcmlId ?? o.id,
    attributes: o.objectData as Record<string, unknown>,
    provenance: (o.provenance as {
      sourceArtefact: string;
      sourceClause: string;
      confidence: string;
      extractionMethod: string;
      ctxReference: string;
    }) ?? {
      sourceArtefact: "unknown",
      sourceClause: o.sourceRef ?? "unknown",
      confidence: "medium",
      extractionMethod: "mode2-schema-driven",
      ctxReference: ctxFile.id,
    },
    rubricScore: o.rubricScore
      ? {
          score: o.rubricScore,
          level: o.rubricLevel ?? "Unknown",
          rationale: o.scoringRationale ?? "",
        }
      : undefined,
  }));

  // Quality summary
  const scoredObjects = realObjects.filter((o) => o.rubricScore != null);
  const avgScore =
    scoredObjects.length > 0
      ? Math.round(
          scoredObjects.reduce((s, o) => s + (o.rubricScore ?? 0), 0) /
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

  const scoreDistribution: Record<string, number> = {};
  for (const o of scoredObjects) {
    const score = String(o.rubricScore ?? 0);
    scoreDistribution[score] = (scoreDistribution[score] ?? 0) + 1;
  }

  return {
    "@context": `icml:v${ICML_VERSION}`,
    extractionMetadata: {
      extractionId,
      ctxReference: ctxFile.contextId ?? ctxFile.id,
      ctxVersion: CTX_SPEC_VERSION,
      icmlVersion: ICML_VERSION,
      extractionDate: new Date().toISOString(),
      tool: XTRACT_TOOL_ID,
      sourceDocuments: sourceDocs.map((s) => ({
        fileName: s.fileName,
        fileType: s.fileType,
      })),
    },
    entities,
    artefacts,
    objects,
    qualitySummary: {
      totalObjects: realObjects.length,
      averageRubricScore: avgScore,
      averageConfidence: avgConfidence,
      scoreDistribution,
    },
  };
}

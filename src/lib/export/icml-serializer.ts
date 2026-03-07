// iCML JSON export serializer
// Assembles extraction results into ICMLExtractionOutput format

import type { DomainObject, Source, CTXFileRecord, ObjectRelationshipRecord } from "@/lib/db";
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
  relationships: Array<{
    fromObjectId: string;
    toObjectId: string;
    relationshipType: string;
    direction: string;
    confidence: number;
    source: string;
    description?: string;
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
  ctxFile: CTXFileRecord,
  relationshipRecords: ObjectRelationshipRecord[] = []
): ICMLExportOutput {
  // Separate real objects from entity metadata
  const realObjects = domainObjectRecords.filter(
    (o) => !o.object_type.startsWith("_")
  );
  const entityMeta = domainObjectRecords.find(
    (o) => o.object_type === "_entities"
  );
  const entityData = entityMeta?.attributes as {
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
    name: s.filename,
    type: s.file_type,
    source: s.storage_path,
  }));

  // Build objects
  const objects = realObjects.map((o) => ({
    "@type": o.object_type,
    objectID: o.object_icml_id ?? o.id,
    attributes: o.attributes as Record<string, unknown>,
    provenance: (o.provenance as {
      sourceArtefact: string;
      sourceClause: string;
      confidence: string;
      extractionMethod: string;
      ctxReference: string;
    }) ?? {
      sourceArtefact: "unknown",
      sourceClause: o.source_clause_text ?? "unknown",
      confidence: "medium",
      extractionMethod: "mode2-schema-driven",
      ctxReference: ctxFile.id,
    },
    rubricScore: o.rubric_score
      ? {
          score: o.rubric_score,
          level: o.rubric_level ?? "Unknown",
          rationale: o.scoring_rationale ?? "",
        }
      : undefined,
  }));

  // Quality summary
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

  const scoreDistribution: Record<string, number> = {};
  for (const o of scoredObjects) {
    const score = String(o.rubric_score ?? 0);
    scoreDistribution[score] = (scoreDistribution[score] ?? 0) + 1;
  }

  return {
    "@context": `icml:v${ICML_VERSION}`,
    extractionMetadata: {
      extractionId,
      ctxReference: ctxFile.id,
      ctxVersion: CTX_SPEC_VERSION,
      icmlVersion: ICML_VERSION,
      extractionDate: new Date().toISOString(),
      tool: XTRACT_TOOL_ID,
      sourceDocuments: sourceDocs.map((s) => ({
        fileName: s.filename,
        fileType: s.file_type,
      })),
    },
    entities,
    artefacts,
    objects,
    relationships: relationshipRecords.map((r) => ({
      fromObjectId: r.from_object_icml_id,
      toObjectId: r.to_object_icml_id,
      relationshipType: r.relationship_type,
      direction: r.direction,
      confidence: r.confidence,
      source: r.source,
      description: r.description ?? undefined,
    })),
    qualitySummary: {
      totalObjects: realObjects.length,
      averageRubricScore: avgScore,
      averageConfidence: avgConfidence,
      scoreDistribution,
    },
  };
}

// XQS-D: Domain Object Quality Score calculator (Mode 2)
// Based on CTX Specification v0.3 Section 3.2.4
//
// Dimensions:
//   Schema Conformance (25%) — All required attributes populated, correct types
//   Provenance Coverage (25%) — Every attribute traces to source clause
//   Rubric Score (20%)       — Objects scored against Section 3 criteria
//   Completeness (15%)       — Coverage across source documents
//   Consistency (15%)        — No unresolved contradictions

import { XQS_D_WEIGHTS } from "@/lib/utils/constants";
import type { DomainObject } from "@/lib/db/schema";

/** Compute XQS-D score from extracted domain objects */
export function computeXQSD(objects: DomainObject[]): number {
  if (objects.length === 0) return 0;

  const schemaConformance = computeSchemaConformance(objects);
  const provenanceCoverage = computeProvenanceCoverage(objects);
  const rubricScore = computeAverageRubricScore(objects);
  const completeness = computeCompleteness(objects);
  const consistency = computeConsistency(objects);

  const score = Math.round(
    schemaConformance * XQS_D_WEIGHTS.schemaConformance +
    provenanceCoverage * XQS_D_WEIGHTS.provenanceCoverage +
    rubricScore * XQS_D_WEIGHTS.rubricScore +
    completeness * XQS_D_WEIGHTS.completeness +
    consistency * XQS_D_WEIGHTS.consistency
  );

  return Math.min(100, Math.max(0, score));
}

function computeSchemaConformance(objects: DomainObject[]): number {
  // TODO: Check each object's data against its Section 11 schema
  // For now, check that objectData is non-empty
  const conforming = objects.filter(
    (o) => o.objectData && Object.keys(o.objectData).length > 0
  );
  return (conforming.length / objects.length) * 100;
}

function computeProvenanceCoverage(objects: DomainObject[]): number {
  const withProvenance = objects.filter(
    (o) => o.provenance && o.provenance.sourceClause
  );
  return (withProvenance.length / objects.length) * 100;
}

function computeAverageRubricScore(objects: DomainObject[]): number {
  const scored = objects.filter((o) => o.rubricScore !== null);
  if (scored.length === 0) return 50; // neutral if unscored

  const avgScore =
    scored.reduce((sum, o) => sum + (o.rubricScore ?? 0), 0) / scored.length;
  // Normalize to 0-100 assuming a 1-5 rubric scale
  return (avgScore / 5) * 100;
}

function computeCompleteness(objects: DomainObject[]): number {
  // TODO: Compare against source document coverage
  // For now, base on confidence scores
  const withHighConfidence = objects.filter(
    (o) => o.confidence && o.confidence >= 70
  );
  return (withHighConfidence.length / objects.length) * 100;
}

function computeConsistency(objects: DomainObject[]): number {
  // TODO: Check for contradictions between objects
  // For now, return neutral score
  return 75;
}

export function getXQSDBreakdown(
  objects: DomainObject[]
): Record<string, number> {
  return {
    schemaConformance: Math.round(computeSchemaConformance(objects)),
    provenanceCoverage: Math.round(computeProvenanceCoverage(objects)),
    rubricScore: Math.round(computeAverageRubricScore(objects)),
    completeness: Math.round(computeCompleteness(objects)),
    consistency: Math.round(computeConsistency(objects)),
  };
}

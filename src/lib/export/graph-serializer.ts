// Graph-schema export serializer
// Produces nodes + edges structure compatible with Neo4j import

import type { DomainObject, ObjectRelationshipRecord } from "@/lib/db/schema";
import { ICML_VERSION } from "@/lib/utils/constants";

export interface GraphExportOutput {
  "@context": string;
  format: "graph-schema";
  nodes: Array<{
    id: string;
    label: string;
    properties: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    direction: string;
    confidence: number;
    properties: {
      source: string;
      description?: string;
    };
  }>;
  metadata: {
    extractionId: string;
    nodeCount: number;
    edgeCount: number;
    exportDate: string;
  };
}

export function serializeToGraph(
  extractionId: string,
  domainObjectRecords: DomainObject[],
  relationships: ObjectRelationshipRecord[]
): GraphExportOutput {
  // Filter out metadata objects
  const realObjects = domainObjectRecords.filter(
    (o) => !o.objectType.startsWith("_")
  );

  // Build nodes from domain objects
  const nodes = realObjects.map((o) => {
    const data = o.objectData as Record<string, unknown>;
    return {
      id: o.objectIcmlId ?? o.id,
      label: o.objectType,
      properties: {
        ...data,
        confidence: o.confidence,
        rubricScore: o.rubricScore,
        rubricLevel: o.rubricLevel,
        sourceRef: o.sourceRef,
        validationStatus: o.validationStatus,
      },
    };
  });

  // Build edges from relationships
  const edges = relationships.map((r) => ({
    id: r.id,
    source: r.fromObjectIcmlId,
    target: r.toObjectIcmlId,
    type: r.relationshipType,
    direction: r.direction,
    confidence: r.confidence,
    properties: {
      source: r.source,
      description: r.description ?? undefined,
    },
  }));

  return {
    "@context": `icml:v${ICML_VERSION}`,
    format: "graph-schema",
    nodes,
    edges,
    metadata: {
      extractionId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      exportDate: new Date().toISOString(),
    },
  };
}

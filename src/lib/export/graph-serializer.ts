// Graph-schema export serializer
// Produces a Neo4j-compatible nodes + edges structure for graph import

import type { DomainObject, ObjectRelationshipRecord } from "@/lib/db";
import { ICML_VERSION } from "@/lib/utils/constants";

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
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
}

export interface GraphExportOutput {
  "@context": string;
  format: "graph-schema";
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    extractionId: string;
    nodeCount: number;
    edgeCount: number;
    exportDate: string;
  };
}

/**
 * Serialize domain objects and relationships into a graph-schema format.
 * Nodes = domain objects, edges = relationships.
 * Compatible with Neo4j CSV import and graph visualisation tools.
 */
export function serializeToGraph(
  extractionId: string,
  domainObjectRecords: DomainObject[],
  relationshipRecords: ObjectRelationshipRecord[]
): GraphExportOutput {
  // Filter out metadata objects (e.g., _entities)
  const realObjects = domainObjectRecords.filter(
    (o) => !o.object_type.startsWith("_")
  );

  // Build nodes from domain objects
  const nodes: GraphNode[] = realObjects.map((o) => ({
    id: o.object_icml_id ?? o.id,
    label: o.object_type,
    properties: {
      ...(o.attributes as Record<string, unknown>),
      confidence: o.confidence,
      rubricScore: o.rubric_score,
      rubricLevel: o.rubric_level,
      sourceClause: o.source_clause_text,
    },
  }));

  // Build edges from relationships
  const edges: GraphEdge[] = relationshipRecords.map((r, i) => ({
    id: `edge-${String(i + 1).padStart(3, "0")}`,
    source: r.from_object_icml_id,
    target: r.to_object_icml_id,
    type: r.relationship_type,
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

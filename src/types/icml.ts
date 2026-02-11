// iCML v4.0 types — Core Primitives and Extraction Profile
// Based on iCML v4.0 specification (February 2026)

// ─── Confidence Scoring (iCML v4.0 Section 7.2) ────────────────────

export type ConfidenceLevel = "high" | "medium" | "low";

// ─── Provenance (iCML v4.0 Section 7.1) ────────────────────────────

export interface ExtractionProvenance {
  /** Source artefact ID */
  sourceArtefact: string;
  /** Specific clause, section, or page in source */
  sourceClause: string;
  /** Confidence level: high (directly stated), medium (strongly implied), low (inferred) */
  confidence: ConfidenceLevel;
  /** Extraction tool and version */
  extractionMethod: string;
  /** CTX file reference (ID and version) */
  ctxReference: string;
  /** Optional extraction notes */
  extractionNotes?: string | null;
}

// ─── Core Schema Primitives (iCML v4.0 Section 4.1) ────────────────

/** 4.1.1 Entity — A party, organisation, or role */
export interface ICMLEntity {
  "@type": "Entity";
  entityID: string;
  name: string;
  entityType?: string;
  jurisdiction?: string;
  roles?: string[];
  provenance: ExtractionProvenance;
}

/** 4.1.2 Artefact — A governing document or data source */
export interface ICMLArtefact {
  "@type": "Artefact";
  artefactID: string;
  title: string;
  artefactType: string;
  effectiveDate?: string;
  expiryDate?: string;
  jurisdiction?: string;
  provenance: ExtractionProvenance;
}

/** 4.1.3 Obligation — A binding requirement or dependency */
export interface ICMLObligation {
  "@type": "Obligation";
  obligationID: string;
  description: string;
  responsibleEntity: string;
  relatedArtefact: string;
  dueDate?: string;
  performanceMetric?: string;
  provenance: ExtractionProvenance;
}

/** 4.1.4 Event — An occurrence that fulfils/modifies/breaches an obligation */
export interface ICMLEvent {
  "@type": "Event";
  eventID: string;
  description: string;
  eventType: string;
  relatedObligation?: string;
  eventDate?: string;
  provenance: ExtractionProvenance;
}

/** 4.1.5 Bridge Object — Persistent reference linking related extractions */
export interface ICMLBridgeObject {
  "@type": "BridgeObject";
  bridgeID: string;
  scope: string;
  relatedArtefacts: string[];
  relatedEntities: string[];
  status?: "initiated" | "active" | "amended" | "completed" | "terminated";
}

/** 4.1.6 Transaction — Exchange of value or information */
export interface ICMLTransaction {
  "@type": "Transaction";
  transactionID: string;
  description: string;
  transactionType: string;
  fromEntity: string;
  toEntity: string;
  value?: string;
  currency?: string;
  provenance: ExtractionProvenance;
}

/** Union of all iCML primitives */
export type ICMLPrimitive =
  | ICMLEntity
  | ICMLArtefact
  | ICMLObligation
  | ICMLEvent
  | ICMLBridgeObject
  | ICMLTransaction;

// ─── Extraction Profile (iCML v4.0 Section 3.1) ────────────────────
// This is what Xtract produces — the Extraction Profile subset of iCML

/** Rubric score attached to an extracted domain object */
export interface ExtractedRubricScore {
  rubricReference: string;
  score: number;
  level: string;
  rationale: string;
}

/** iCML primitive mapping for an extracted domain object */
export interface ICMLMapping {
  primary: string; // e.g. "Obligation"
  relatedEntities?: string[];
  relatedArtefacts?: string[];
  relatedEvents?: string[];
  relatedTransactions?: string[];
}

/** A single extracted domain object (Mode 2 output) */
export interface ExtractedDomainObject {
  "@type": string; // Domain object type from CTX Section 11
  objectID: string; // e.g. "icml:OBJ-CC-001"
  attributes: Record<string, unknown>;
  rubricScore?: ExtractedRubricScore;
  provenance: ExtractionProvenance;
  iCMLMapping: ICMLMapping;
}

/** Extraction metadata — top-level context for the extraction output */
export interface ExtractionOutputMetadata {
  ctxReference: string;
  ctxVersion: string;
  extractionDate: string; // ISO 8601
  extractionTool: string;
  sourceDocuments: Array<{
    artefactID: string;
    title: string;
    type: string;
  }>;
}

/** Complete iCML Extraction Profile output (Mode 2) */
export interface ICMLExtractionOutput {
  extractionMetadata: ExtractionOutputMetadata;
  bridgeObject?: ICMLBridgeObject;
  entities: ICMLEntity[];
  artefacts: ICMLArtefact[];
  objects: ExtractedDomainObject[];
}

// ─── Serialisation Tiers (iCML v4.0 Section 6.1) ───────────────────

export type SerialisationTier = "json" | "xlsx" | "csv" | "json-ld" | "rdf";

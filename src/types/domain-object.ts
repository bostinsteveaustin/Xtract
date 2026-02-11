// Mode 2 domain object types

import type { ConfidenceLevel, ExtractionProvenance } from "./icml";

export type DomainObjectValidationStatus =
  | "pending"
  | "valid"
  | "flagged"
  | "rejected"
  | "approved";

export interface DomainObjectRecord {
  id: string;
  extractionId: string;
  ctxFileId: string;
  /** Object type from CTX Section 11 (e.g. "ComplianceControl", "ServiceCommitment") */
  objectType: string;
  /** The extracted object data conforming to the Section 11 schema */
  objectData: Record<string, unknown>;
  /** Source document reference */
  sourceRef: string;
  /** Overall confidence 0-100 */
  confidence: number;
  /** Per-attribute confidence breakdown */
  attributeConfidence?: Record<string, ConfidenceLevel>;
  /** Provenance metadata */
  provenance: ExtractionProvenance;
  /** Rubric score from Section 3 assessment */
  rubricScore?: number;
  /** Rubric level name */
  rubricLevel?: string;
  /** Scoring rationale */
  scoringRationale?: string;
  /** Validation status */
  validationStatus: DomainObjectValidationStatus;
  /** Review notes from human reviewer */
  reviewNotes?: string;
}

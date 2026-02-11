// Extraction domain types

export type ExtractionMode = "mode1" | "mode2";

export type ExtractionStatus =
  | "created"
  | "ingesting"
  | "extracting"
  | "synthesising"
  | "validating"
  | "review"
  | "approved"
  | "failed";

export type SourceType = "pdf" | "docx" | "txt" | "md";

export interface ExtractionConfig {
  /** Which sections to target for Mode 1 */
  targetSections?: string[];
  /** CTX file ID for Mode 2 (required) */
  ctxFileId?: string;
  /** Additional extraction parameters */
  options?: {
    /** Enable cross-document synthesis */
    crossDocSynthesis?: boolean;
    /** Enable acid test validation */
    acidTest?: boolean;
    /** Custom extraction instructions */
    customInstructions?: string;
  };
}

export interface SourceMetadata {
  /** Number of pages (PDF) or sections (DOCX) */
  pageCount?: number;
  /** Detected language */
  language?: string;
  /** Document title if detected */
  title?: string;
  /** Document author if detected */
  author?: string;
  /** Word count */
  wordCount?: number;
  /** Classification hint from source type analysis */
  sourceTypeHint?: SourceDocumentType;
}

/** Source document types as defined in CTX spec Section 3.1.1 */
export type SourceDocumentType =
  | "expert-interview"
  | "meeting-transcript"
  | "methodology-document"
  | "proposal-document"
  | "regulatory-document"
  | "contract-or-standard"
  | "training-material"
  | "retrospective"
  | "other";

export interface ExtractionSummary {
  totalObjects: number;
  averageScore: number;
  flaggedItems: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
}

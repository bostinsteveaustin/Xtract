// App-wide constants

/** Current CTX specification version */
export const CTX_SPEC_VERSION = "0.3" as const;

/** Current iCML version */
export const ICML_VERSION = "4.0" as const;

/** Xtract tool identifier for provenance */
export const XTRACT_TOOL_ID = "Xtract v1.0" as const;

/** Maximum file upload size (50MB) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Supported upload file types */
export const SUPPORTED_FILE_TYPES = ["pdf", "docx", "txt", "md"] as const;

/** MIME types for supported files */
export const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
};

/** XQS-K minimum threshold (CTX Spec v0.3) */
export const XQS_K_MIN_THRESHOLD = 65;

/** XQS-D minimum threshold (CTX Spec v0.3) */
export const XQS_D_MIN_THRESHOLD = 70;

/** XQS-K scoring weights (CTX Spec v0.3 Section 3.1.2 Step 8) */
export const XQS_K_WEIGHTS = {
  completeness: 0.25,
  specificity: 0.25,
  actionability: 0.20,
  provenance: 0.15,
  depth: 0.15,
} as const;

/** XQS-D scoring weights (CTX Spec v0.3 Section 3.2.4) */
export const XQS_D_WEIGHTS = {
  schemaConformance: 0.25,
  provenanceCoverage: 0.25,
  rubricScore: 0.20,
  completeness: 0.15,
  consistency: 0.15,
} as const;

/** Default Claude model for extraction */
export const DEFAULT_MODEL = "claude-sonnet-4-20250514" as const;

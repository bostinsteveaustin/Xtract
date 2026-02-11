// Custom error classes for Xtract

export class XtractError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "XtractError";
  }
}

export class ValidationError extends XtractError {
  constructor(message: string, public details?: Record<string, string[]>) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class PipelineError extends XtractError {
  constructor(
    message: string,
    public stage: string,
    public extractionId: string
  ) {
    super(message, "PIPELINE_ERROR", 500);
    this.name = "PipelineError";
  }
}

export class StorageError extends XtractError {
  constructor(message: string) {
    super(message, "STORAGE_ERROR", 500);
    this.name = "StorageError";
  }
}

export class DocumentProcessingError extends XtractError {
  constructor(message: string, public fileName: string) {
    super(message, "DOCUMENT_PROCESSING_ERROR", 422);
    this.name = "DocumentProcessingError";
  }
}

export class CTXValidationError extends XtractError {
  constructor(
    message: string,
    public severity: "error" | "warning",
    public rule: string
  ) {
    super(message, "CTX_VALIDATION_ERROR", 422);
    this.name = "CTXValidationError";
  }
}

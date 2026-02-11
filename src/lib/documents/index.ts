// Document processor factory

import type { SourceType } from "@/types/extraction";
import type { ProcessedDocument } from "./pdf-processor";
import { processPDF } from "./pdf-processor";
import { processDOCX } from "./docx-processor";
import { processText } from "./text-processor";
import { DocumentProcessingError } from "@/lib/utils/errors";

/** Detect file type from extension */
export function detectFileType(fileName: string): SourceType {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "pdf";
    case "docx":
      return "docx";
    case "txt":
      return "txt";
    case "md":
      return "md";
    default:
      throw new DocumentProcessingError(
        `Unsupported file type: .${ext}`,
        fileName
      );
  }
}

/** Process a document buffer based on its file type */
export async function processDocument(
  buffer: Buffer,
  fileName: string,
  fileType?: SourceType
): Promise<ProcessedDocument> {
  const type = fileType ?? detectFileType(fileName);

  switch (type) {
    case "pdf":
      return processPDF(buffer, fileName);
    case "docx":
      return processDOCX(buffer, fileName);
    case "txt":
    case "md":
      return processText(buffer, fileName);
    default:
      throw new DocumentProcessingError(
        `Unsupported file type: ${type}`,
        fileName
      );
  }
}

export { chunkText, type TextChunk, type ChunkerOptions } from "./chunker";
export type { ProcessedDocument } from "./pdf-processor";

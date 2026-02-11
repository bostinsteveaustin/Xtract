// DOCX text extraction using mammoth

import mammoth from "mammoth";
import type { SourceMetadata } from "@/types/extraction";
import { DocumentProcessingError } from "@/lib/utils/errors";
import type { ProcessedDocument } from "./pdf-processor";

export async function processDOCX(
  buffer: Buffer,
  fileName: string
): Promise<ProcessedDocument> {
  try {
    // Extract raw text (not HTML) for cleaner processing
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value;
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // Log any conversion warnings
    if (result.messages.length > 0) {
      console.warn(
        `[DOCX processor] Warnings for ${fileName}:`,
        result.messages.map((m) => m.message)
      );
    }

    return {
      text,
      metadata: {
        wordCount,
      },
    };
  } catch (error) {
    throw new DocumentProcessingError(
      `Failed to process DOCX: ${error instanceof Error ? error.message : "Unknown error"}`,
      fileName
    );
  }
}

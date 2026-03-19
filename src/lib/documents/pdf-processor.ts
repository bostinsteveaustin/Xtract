// PDF text extraction using pdf-parse v1

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const pdfParse = require("pdf-parse") as any;
import type { SourceMetadata } from "@/types/extraction";
import { DocumentProcessingError } from "@/lib/utils/errors";

export interface ProcessedDocument {
  text: string;
  metadata: SourceMetadata;
}

export async function processPDF(
  buffer: Buffer,
  fileName: string
): Promise<ProcessedDocument> {
  try {
    const result = await pdfParse(buffer);
    const text: string = result.text;
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    return {
      text,
      metadata: {
        pageCount: result.numpages,
        wordCount,
        title: result.info?.Title || undefined,
        author: result.info?.Author || undefined,
      },
    };
  } catch (error) {
    throw new DocumentProcessingError(
      `Failed to process PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      fileName
    );
  }
}

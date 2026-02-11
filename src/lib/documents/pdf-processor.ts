// PDF text extraction using pdf-parse v2

import { PDFParse } from "pdf-parse";
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
    // pdf-parse v2 API: constructor takes { data: Buffer }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parser = new PDFParse({ data: buffer }) as any;
    const textResult = await parser.getText();
    const info = await parser.getInfo();

    const text = textResult.text;
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    return {
      text,
      metadata: {
        pageCount: info?.numPages,
        wordCount,
        title: info?.info?.Title || undefined,
        author: info?.info?.Author || undefined,
      },
    };
  } catch (error) {
    throw new DocumentProcessingError(
      `Failed to process PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      fileName
    );
  }
}

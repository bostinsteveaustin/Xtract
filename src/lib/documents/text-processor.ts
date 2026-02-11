// TXT and Markdown text processor (passthrough with metadata)

import type { SourceMetadata } from "@/types/extraction";
import type { ProcessedDocument } from "./pdf-processor";

export async function processText(
  buffer: Buffer,
  fileName: string
): Promise<ProcessedDocument> {
  const text = buffer.toString("utf-8");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lineCount = text.split("\n").length;

  return {
    text,
    metadata: {
      wordCount,
      pageCount: Math.ceil(lineCount / 50), // rough estimate
    },
  };
}

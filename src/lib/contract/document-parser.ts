// Contract document parser
// Accepts base64-encoded file content + MIME type
// Returns plain text + structural metadata

export interface ParsedDocument {
  text: string;
  wordCount: number;
  charCount: number;
  fileName: string;
  mimeType: string;
  sections: DocumentSection[];
}

export interface DocumentSection {
  index: number;
  heading?: string;
  text: string;
  wordCount: number;
}

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

/** Split raw text into logical sections by clause/heading patterns */
function splitIntoSections(text: string): DocumentSection[] {
  // Split on common contract heading patterns:
  // "1.", "1.1", "CLAUSE 1", "Article 1", double newlines + capitalised line
  const headingPattern =
    /\n(?=(?:\d+\.[\d.]* |clause\s+\d+|article\s+\d+|schedule\s+\d+|appendix\s+\d+)[^\n]{3,80}\n)/gi;

  const parts = text.split(headingPattern);
  const sections: DocumentSection[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part || part.length < 20) continue;

    // Try to extract heading from first line
    const lines = part.split("\n");
    const firstLine = lines[0].trim();
    const isHeading = /^(\d+\.[\d.]* |clause\s+\d+|article\s+\d+|schedule|appendix)/i.test(
      firstLine
    );

    sections.push({
      index: sections.length,
      heading: isHeading ? firstLine : undefined,
      text: part,
      wordCount: part.split(/\s+/).filter(Boolean).length,
    });
  }

  // Fallback: if we got fewer than 3 sections, chunk by ~800 words
  if (sections.length < 3) {
    sections.length = 0;
    const words = text.split(/\s+/);
    const chunkSize = 800;
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(" ");
      sections.push({
        index: sections.length,
        text: chunk,
        wordCount: chunk.split(/\s+/).filter(Boolean).length,
      });
    }
  }

  return sections;
}

export async function parseDocument(
  fileContentBase64: string,
  fileName: string,
  mimeType: string
): Promise<ParsedDocument & { logEntries: { timestamp: string; level: string; message: string; icon: string }[] }> {
  const log: { timestamp: string; level: string; message: string; icon: string }[] = [];

  log.push({ timestamp: ts(), level: "info", message: `Parsing document: ${fileName}`, icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: `Format: ${mimeType}`, icon: "check" });

  let text = "";

  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    // PDF: decode base64 → buffer → pdf-parse
    const buffer = Buffer.from(fileContentBase64, "base64");

    try {
      // pdf-parse v2 — class-based API
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const PDFParse = require("pdf-parse") as any;
      const pdf = await new PDFParse({ data: buffer });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text = (pdf as any).text as string;
    } catch (e) {
      throw new Error(`PDF parsing failed: ${String(e)}`);
    }

    log.push({ timestamp: ts(), level: "info", message: `PDF parsed successfully`, icon: "check" });
  } else {
    // TXT / MD: decode base64 → utf-8 string
    const buffer = Buffer.from(fileContentBase64, "base64");
    text = buffer.toString("utf-8");
    log.push({ timestamp: ts(), level: "info", message: `Text document decoded`, icon: "check" });
  }

  // Normalise whitespace
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n{4,}/g, "\n\n\n");

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  log.push({
    timestamp: ts(),
    level: "info",
    message: `Document length: ${wordCount.toLocaleString()} words / ${charCount.toLocaleString()} characters`,
    icon: "check",
  });

  const sections = splitIntoSections(text);

  log.push({
    timestamp: ts(),
    level: "info",
    message: `Split into ${sections.length} sections for extraction`,
    icon: "check",
  });

  return {
    text,
    wordCount,
    charCount,
    fileName,
    mimeType,
    sections,
    logEntries: log,
  };
}

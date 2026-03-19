// Contract document parser
// Accepts base64-encoded file content + MIME type
// Returns plain text + structural metadata
//
// PDF parsing strategy:
//   Pass A: pdf-parse v1 (fast, free, works on text-layer PDFs)
//   Pass B: Claude PDF vision (fallback for scanned/image PDFs — no text layer)

import { generateText } from "ai";
import { anthropic } from "@/lib/ai/client";

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

/** Minimum words before we consider pdf-parse output usable */
const MIN_WORDS_THRESHOLD = 150;

/** Split raw text into logical sections by clause/heading patterns */
function splitIntoSections(text: string): DocumentSection[] {
  const headingPattern =
    /\n(?=(?:\d+\.[\d.]* |clause\s+\d+|article\s+\d+|schedule\s+\d+|appendix\s+\d+)[^\n]{3,80}\n)/gi;

  const parts = text.split(headingPattern);
  const sections: DocumentSection[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part || part.length < 20) continue;

    const lines = part.split("\n");
    const firstLine = lines[0].trim();
    const isHeading = /^(\d+\.[\d.]* |clause\s+\d+|article\s+\d+|schedule|appendix)/i.test(firstLine);

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

/**
 * Claude PDF vision OCR — used as fallback when pdf-parse returns too little text.
 * Sends the raw PDF base64 directly to Claude's document understanding API.
 * Works on scanned/image PDFs, DocuSign counter-signed PDFs, and any PDF
 * where pdf-parse fails to extract a text layer.
 */
async function claudePdfOcr(
  fileContentBase64: string,
  log: { timestamp: string; level: string; message: string; icon: string }[]
): Promise<string> {
  log.push({
    timestamp: ts(),
    level: "info",
    message: "PDF appears to be image-based — using Claude vision OCR as fallback...",
    icon: "check",
  });

  // Convert base64 → Uint8Array for the AI SDK file part
  const pdfBytes = new Uint8Array(Buffer.from(fileContentBase64, "base64"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filePart: any = { type: "file", data: pdfBytes, mimeType: "application/pdf" };

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    messages: [
      {
        role: "user",
        content: [
          filePart,
          {
            type: "text",
            text: `Extract ALL text from this PDF document. This is a legal/commercial agreement. Return the raw text content only, preserving paragraphs, clause numbers, headings, and section structure. Do not summarise, interpret, or add any commentary — return only the verbatim text as it appears in the document, in reading order.`,
          },
        ],
      },
    ],
    maxOutputTokens: 8000,
  });

  log.push({
    timestamp: ts(),
    level: "info",
    message: `Claude OCR complete — ${result.text.split(/\s+/).filter(Boolean).length.toLocaleString()} words extracted`,
    icon: "check",
  });

  return result.text;
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
  let usedOcr = false;

  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    // Pass A: pdf-parse (fast — works on digital/text-layer PDFs)
    const buffer = Buffer.from(fileContentBase64, "base64");

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const pdfParse = require("pdf-parse") as any;
      const result = await pdfParse(buffer);
      text = (result.text as string) ?? "";
    } catch (e) {
      log.push({
        timestamp: ts(),
        level: "warning",
        message: `pdf-parse failed (${String(e).slice(0, 80)}) — attempting Claude OCR`,
        icon: "flag",
      });
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;

    if (wordCount < MIN_WORDS_THRESHOLD) {
      // Pass B: Claude PDF vision OCR (handles scanned/image PDFs)
      text = await claudePdfOcr(fileContentBase64, log);
      usedOcr = true;
    } else {
      log.push({ timestamp: ts(), level: "info", message: `PDF text layer extracted successfully`, icon: "check" });
    }
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
    message: `Document length: ${wordCount.toLocaleString()} words / ${charCount.toLocaleString()} characters${usedOcr ? " (via OCR)" : ""}`,
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

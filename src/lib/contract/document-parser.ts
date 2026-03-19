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

    // Polyfill browser globals that pdfjs-dist requires in Node.js / Vercel serverless
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    if (typeof g.DOMMatrix === "undefined") {
      g.DOMMatrix = class DOMMatrix {
        m11=1;m12=0;m13=0;m14=0;m21=0;m22=1;m23=0;m24=0;
        m31=0;m32=0;m33=1;m34=0;m41=0;m42=0;m43=0;m44=1;
        a=1;b=0;c=0;d=1;e=0;f=0;is2D=true;isIdentity=true;
        static fromMatrix() { return new g.DOMMatrix(); }
        static fromFloat32Array() { return new g.DOMMatrix(); }
        static fromFloat64Array() { return new g.DOMMatrix(); }
        multiply() { return this; } translate() { return this; }
        scale() { return this; } rotate() { return this; }
        inverse() { return this; } invertSelf() { return this; }
        multiplySelf() { return this; } translateSelf() { return this; }
        scaleSelf() { return this; } rotateSelf() { return this; }
        skewX() { return this; } skewY() { return this; }
        flipX() { return this; } flipY() { return this; }
        transformPoint(p?: {x?:number;y?:number;z?:number;w?:number}) {
          return { x: p?.x??0, y: p?.y??0, z: p?.z??0, w: p?.w??1 };
        }
        toFloat32Array() { return new Float32Array(16); }
        toFloat64Array() { return new Float64Array(16); }
        toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
        toJSON() { return {}; }
      };
    }
    if (typeof g.DOMPoint === "undefined") {
      g.DOMPoint = class DOMPoint {
        constructor(public x=0, public y=0, public z=0, public w=1) {}
        static fromPoint(p?: {x?:number;y?:number;z?:number;w?:number}) {
          return new g.DOMPoint(p?.x??0, p?.y??0, p?.z??0, p?.w??1);
        }
        matrixTransform() { return this; }
        toJSON() { return {}; }
      };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const PDFParse = require("pdf-parse") as any;
      const pdf = await new PDFParse({ data: buffer });
      text = (pdf as { text: string }).text;
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

// Text chunking strategies for source document processing
// Chunks are used to fit within LLM context windows while preserving coherence

export interface TextChunk {
  /** Chunk index (0-based) */
  index: number;
  /** The chunk text */
  text: string;
  /** Character offset in the original document */
  startOffset: number;
  /** Character end offset */
  endOffset: number;
  /** Approximate word count */
  wordCount: number;
}

export interface ChunkerOptions {
  /** Target chunk size in characters (default: 8000) */
  chunkSize?: number;
  /** Overlap between chunks in characters (default: 500) */
  overlap?: number;
  /** Whether to split on section boundaries when possible (default: true) */
  respectSections?: boolean;
}

const DEFAULT_CHUNK_SIZE = 8000;
const DEFAULT_OVERLAP = 500;

/** Section boundary patterns (markdown headers, numbered sections, etc.) */
const SECTION_PATTERNS = [
  /^#{1,6}\s/m, // Markdown headers
  /^\d+\.\s/m, // Numbered sections (1. 2. 3.)
  /^\d+\.\d+\s/m, // Sub-sections (1.1 1.2)
  /^Section\s+\d+/im, // "Section N"
  /^Part\s+\d+/im, // "Part N"
  /^Chapter\s+\d+/im, // "Chapter N"
  /^Article\s+\d+/im, // "Article N"
  /^Schedule\s+\d+/im, // "Schedule N"
  /^Appendix\s+[A-Z\d]/im, // "Appendix A"
  /^Clause\s+\d+/im, // "Clause N"
];

/** Chunk text into overlapping segments */
export function chunkText(
  text: string,
  options: ChunkerOptions = {}
): TextChunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;
  const respectSections = options.respectSections ?? true;

  if (text.length <= chunkSize) {
    return [
      {
        index: 0,
        text,
        startOffset: 0,
        endOffset: text.length,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      },
    ];
  }

  if (respectSections) {
    return chunkBySections(text, chunkSize, overlap);
  }

  return chunkBySize(text, chunkSize, overlap);
}

/** Simple fixed-size chunking with overlap */
function chunkBySize(
  text: string,
  chunkSize: number,
  overlap: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to break at a paragraph or sentence boundary
    if (end < text.length) {
      const breakPoint = findNaturalBreak(text, end, start + chunkSize * 0.8);
      if (breakPoint > 0) {
        end = breakPoint;
      }
    }

    const chunkText = text.slice(start, end);
    chunks.push({
      index,
      text: chunkText,
      startOffset: start,
      endOffset: end,
      wordCount: chunkText.split(/\s+/).filter(Boolean).length,
    });

    // Move start forward, accounting for overlap
    start = end - overlap;
    if (start >= text.length) break;
    index++;
  }

  return chunks;
}

/** Section-aware chunking: try to keep sections together */
function chunkBySections(
  text: string,
  chunkSize: number,
  overlap: number
): TextChunk[] {
  // Find all section boundaries
  const boundaries = findSectionBoundaries(text);

  if (boundaries.length <= 1) {
    return chunkBySize(text, chunkSize, overlap);
  }

  const chunks: TextChunk[] = [];
  let currentStart = 0;
  let currentText = "";
  let index = 0;

  for (let i = 0; i < boundaries.length; i++) {
    const sectionStart = boundaries[i];
    const sectionEnd =
      i + 1 < boundaries.length ? boundaries[i + 1] : text.length;
    const sectionText = text.slice(sectionStart, sectionEnd);

    // If adding this section exceeds chunk size, emit current chunk
    if (
      currentText.length + sectionText.length > chunkSize &&
      currentText.length > 0
    ) {
      chunks.push({
        index,
        text: currentText,
        startOffset: currentStart,
        endOffset: currentStart + currentText.length,
        wordCount: currentText.split(/\s+/).filter(Boolean).length,
      });

      // Start new chunk with overlap from previous
      const overlapText = currentText.slice(-overlap);
      currentStart = currentStart + currentText.length - overlap;
      currentText = overlapText;
      index++;
    }

    // If a single section is larger than chunk size, sub-chunk it
    if (sectionText.length > chunkSize) {
      if (currentText.length > 0) {
        chunks.push({
          index,
          text: currentText,
          startOffset: currentStart,
          endOffset: currentStart + currentText.length,
          wordCount: currentText.split(/\s+/).filter(Boolean).length,
        });
        currentStart = sectionStart;
        currentText = "";
        index++;
      }

      const subChunks = chunkBySize(sectionText, chunkSize, overlap);
      for (const sc of subChunks) {
        chunks.push({
          index,
          text: sc.text,
          startOffset: sectionStart + sc.startOffset,
          endOffset: sectionStart + sc.endOffset,
          wordCount: sc.wordCount,
        });
        index++;
      }
      currentStart = sectionEnd;
      currentText = "";
    } else {
      currentText += sectionText;
    }
  }

  // Emit remaining text
  if (currentText.length > 0) {
    chunks.push({
      index,
      text: currentText,
      startOffset: currentStart,
      endOffset: currentStart + currentText.length,
      wordCount: currentText.split(/\s+/).filter(Boolean).length,
    });
  }

  return chunks;
}

/** Find section boundaries in text */
function findSectionBoundaries(text: string): number[] {
  const boundaries = new Set<number>();
  boundaries.add(0); // Start of document is always a boundary

  for (const pattern of SECTION_PATTERNS) {
    const regex = new RegExp(pattern.source, "gim");
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Find the start of the line
      const lineStart = text.lastIndexOf("\n", match.index);
      boundaries.add(lineStart === -1 ? match.index : lineStart + 1);
    }
  }

  return Array.from(boundaries).sort((a, b) => a - b);
}

/** Find a natural break point (paragraph or sentence boundary) */
function findNaturalBreak(
  text: string,
  idealPos: number,
  minPos: number
): number {
  // Try paragraph break first
  const paragraphBreak = text.lastIndexOf("\n\n", idealPos);
  if (paragraphBreak >= minPos) {
    return paragraphBreak + 2;
  }

  // Try single newline
  const lineBreak = text.lastIndexOf("\n", idealPos);
  if (lineBreak >= minPos) {
    return lineBreak + 1;
  }

  // Try sentence break
  const sentenceBreak = text.lastIndexOf(". ", idealPos);
  if (sentenceBreak >= minPos) {
    return sentenceBreak + 2;
  }

  return -1;
}

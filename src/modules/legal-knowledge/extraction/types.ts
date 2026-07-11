/**
 * Text-extraction abstraction (Epic 1 POC).
 * Every extractor preserves structure + anchors; nothing is flattened
 * into an anchor-less blob.
 */

export type OcrStatus = "not_required" | "pending" | "completed" | "low_confidence" | "failed";

export interface ExtractedBlock {
  /** 0-based order in the document */
  index: number;
  kind: "paragraph" | "heading" | "page" | "section";
  /** Stable anchor key, e.g. `p:0007` / `h:0002` / `pg:0003` */
  anchorKey: string;
  /** Heading trail, e.g. "פסק דין > הכרעה" (null for top level) */
  headingPath: string | null;
  pageNumber: number | null;
  /** Character offsets into normalizedText */
  charStart: number;
  charEnd: number;
  /** Original block text (as extracted, pre-normalization) */
  originalText: string;
  /** Normalized block text (whitespace/quotes normalized) */
  text: string;
}

export interface ExtractionResult {
  ok: boolean;
  /** e.g. "html-v1", "pdf-text-v1", "docx-v1", "plain-v1" */
  extractor: string;
  contentType: string;
  language: "he" | "en" | "mixed" | "unknown";
  ocrStatus: OcrStatus;
  /** 0..1 — extraction confidence (structure + text-layer quality) */
  confidence: number;
  /** Full original text (concatenated blocks, pre-normalization) */
  originalText: string;
  /** Full normalized text — offsets in blocks refer to THIS string */
  normalizedText: string;
  pageCount: number | null;
  blocks: ExtractedBlock[];
  warnings: string[];
}

export interface Extractor {
  readonly name: string;
  supports(contentType: string): boolean;
  extract(content: string | Uint8Array, contentType: string): Promise<ExtractionResult>;
}

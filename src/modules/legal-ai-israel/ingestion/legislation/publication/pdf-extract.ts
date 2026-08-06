/**
 * PDF text-extraction pipeline interface (current Epic, Track A).
 *
 * Extraction is staged, cheapest-and-most-faithful first; OCR is a LAST resort,
 * never a blanket pass:
 *
 *   1. text_layer  — pull the embedded text layer (most official gazette PDFs
 *                    are digitally typeset and carry one);
 *   2. layout      — reconstruct reading order / RTL columns from glyph boxes;
 *   3. normalize   — Hebrew legal normalization (final-letter forms, niqqud,
 *                    quote/gershayim unification) via the existing normalizer;
 *   4. structural  — run the section parser to recover sections/subsections;
 *   5. ocr         — ONLY if stage 1 yields effectively no text (scanned image).
 *
 * The heavy engines (a PDF text-layer reader and an OCR backend) are INJECTED so
 * this orchestration is pure and offline-testable; the container has no network,
 * so real extraction runs on the operator side behind this same interface.
 */
import { normalizeHebrewLegalText } from "../../../parser/hebrew-normalize.ts";
import { parseLegislation } from "../section-parser.ts";
import type { ParsedLaw } from "../section-parser.ts";

export type ExtractionStage = "text_layer" | "layout" | "normalize" | "structural" | "ocr";

export interface TextLayerResult {
  text: string;
  /** Fraction of pages that carried an embedded text layer (0..1). */
  textLayerCoverage: number;
  pageCount: number;
}

export interface OcrResult {
  text: string;
  meanConfidence: number; // 0..1
}

export interface PdfEngines {
  /** Extract the embedded text layer + layout-ordered text. */
  readTextLayer: (pdf: Uint8Array) => Promise<TextLayerResult>;
  /** OCR fallback — invoked ONLY when the text layer is effectively empty. */
  ocr?: (pdf: Uint8Array) => Promise<OcrResult>;
}

export interface ExtractionConfig {
  /** Below this text-layer coverage we consider the PDF a scan and try OCR. */
  minTextLayerCoverage: number; // e.g. 0.2
  /** Minimum characters for the text layer to count as "has text". */
  minChars: number; // e.g. 200
}

export const DEFAULT_EXTRACTION_CONFIG: ExtractionConfig = {
  minTextLayerCoverage: 0.2,
  minChars: 200,
};

export interface ExtractionResult {
  stagesRun: readonly ExtractionStage[];
  usedOcr: boolean;
  rawText: string;
  normalizedText: string;
  law: ParsedLaw;
  ocrConfidence: number | null;
  textLayerCoverage: number;
  pageCount: number;
  /** needs_review when we fell back to OCR or coverage was weak. */
  status: "extracted" | "needs_review" | "no_text";
}

/**
 * Run the staged extraction pipeline over PDF bytes. Structural parsing always
 * runs on the normalized text; OCR runs only when the embedded text layer is
 * effectively empty AND an OCR engine is provided.
 */
export async function extractPdf(
  pdf: Uint8Array,
  engines: PdfEngines,
  config: ExtractionConfig = DEFAULT_EXTRACTION_CONFIG,
): Promise<ExtractionResult> {
  const stagesRun: ExtractionStage[] = ["text_layer", "layout"];
  const layer = await engines.readTextLayer(pdf);
  let rawText = layer.text;
  let usedOcr = false;
  let ocrConfidence: number | null = null;

  const hasText =
    layer.text.trim().length >= config.minChars &&
    layer.textLayerCoverage >= config.minTextLayerCoverage;

  if (!hasText) {
    if (engines.ocr) {
      const ocr = await engines.ocr(pdf);
      stagesRun.push("ocr");
      usedOcr = true;
      ocrConfidence = ocr.meanConfidence;
      rawText = ocr.text;
    } else {
      // No text and no OCR backend: return explicitly, do not fabricate.
      const empty = normalizeHebrewLegalText("");
      return {
        stagesRun,
        usedOcr: false,
        rawText: "",
        normalizedText: "",
        law: parseLegislation(empty.normalizedText),
        ocrConfidence: null,
        textLayerCoverage: layer.textLayerCoverage,
        pageCount: layer.pageCount,
        status: "no_text",
      };
    }
  }

  stagesRun.push("normalize");
  const normalized = normalizeHebrewLegalText(rawText).normalizedText;
  stagesRun.push("structural");
  const law = parseLegislation(normalized);

  const status: ExtractionResult["status"] =
    usedOcr || !hasText ? "needs_review" : "extracted";

  return {
    stagesRun,
    usedOcr,
    rawText,
    normalizedText: normalized,
    law,
    ocrConfidence,
    textLayerCoverage: layer.textLayerCoverage,
    pageCount: layer.pageCount,
    status,
  };
}

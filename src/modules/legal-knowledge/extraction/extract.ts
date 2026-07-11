/** Extraction dispatcher — routes by content type to a registered extractor. */
import { DocxExtractor } from "./extractors/docx.ts";
import { HtmlExtractor } from "./extractors/html.ts";
import { PdfExtractor } from "./extractors/pdf.ts";
import { PlainTextExtractor } from "./extractors/plain.ts";
import type { ExtractionResult, Extractor } from "./types.ts";

const EXTRACTORS: Extractor[] = [
  new HtmlExtractor(),
  new PlainTextExtractor(),
  new PdfExtractor(),
  new DocxExtractor(),
];

export async function extractDocument(
  content: string | Uint8Array,
  contentType: string,
): Promise<ExtractionResult> {
  const extractor = EXTRACTORS.find((e) => e.supports(contentType));
  if (!extractor) {
    return {
      ok: false,
      extractor: "none",
      contentType,
      language: "unknown",
      ocrStatus: "not_required",
      confidence: 0,
      originalText: "",
      normalizedText: "",
      pageCount: null,
      blocks: [],
      warnings: [`no extractor registered for content type: ${contentType}`],
    };
  }
  return extractor.extract(content, contentType);
}

export { HtmlExtractor, PlainTextExtractor, PdfExtractor, DocxExtractor };

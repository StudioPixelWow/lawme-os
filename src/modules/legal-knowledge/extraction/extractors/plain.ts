/** Plain-text extractor — paragraphs split on blank lines. */
import { detectLanguage, normalizeText } from "../normalize-text.ts";
import type { ExtractedBlock, ExtractionResult, Extractor } from "../types.ts";

export class PlainTextExtractor implements Extractor {
  readonly name = "plain-v1";

  supports(contentType: string): boolean {
    return contentType.includes("text/plain");
  }

  async extract(content: string | Uint8Array, contentType: string): Promise<ExtractionResult> {
    const raw = typeof content === "string" ? content : new TextDecoder("utf-8").decode(content);
    const paragraphs = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

    const blocks: ExtractedBlock[] = [];
    let cursor = 0;
    const normalizedParts: string[] = [];
    for (const p of paragraphs) {
      const text = normalizeText(p);
      if (!text) continue;
      const charStart = cursor;
      const charEnd = cursor + text.length;
      cursor = charEnd + 1;
      blocks.push({
        index: blocks.length,
        kind: "paragraph",
        anchorKey: `p:${String(blocks.length).padStart(4, "0")}`,
        headingPath: null,
        pageNumber: null,
        charStart,
        charEnd,
        originalText: p,
        text,
      });
      normalizedParts.push(text);
    }

    const normalizedText = normalizedParts.join("\n");
    return {
      ok: blocks.length > 0,
      extractor: this.name,
      contentType,
      language: detectLanguage(normalizedText),
      ocrStatus: "not_required",
      confidence: blocks.length > 0 ? 0.9 : 0,
      originalText: paragraphs.join("\n"),
      normalizedText,
      pageCount: null,
      blocks,
      warnings: blocks.length === 0 ? ["empty plain-text document"] : [],
    };
  }
}

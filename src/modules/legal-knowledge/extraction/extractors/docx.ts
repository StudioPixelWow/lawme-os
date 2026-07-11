/**
 * DOCX extractor — for SYNTHETIC internal fixtures only (Epic 1 POC).
 * Reads word/document.xml via jszip and extracts paragraph text.
 * SECURITY: bounded sizes (zip-bomb control) — total uncompressed read is
 * capped; only document.xml is touched.
 */
import { detectLanguage, normalizeText } from "../normalize-text.ts";
import type { ExtractedBlock, ExtractionResult, Extractor } from "../types.ts";

const MAX_DOCX_BYTES = 20 * 1024 * 1024;
const MAX_XML_BYTES = 30 * 1024 * 1024; // uncompressed cap (zip-bomb control)

export class DocxExtractor implements Extractor {
  readonly name = "docx-v1";

  supports(contentType: string): boolean {
    return contentType.includes("officedocument.wordprocessingml.document");
  }

  async extract(content: string | Uint8Array, contentType: string): Promise<ExtractionResult> {
    const empty = (warnings: string[]): ExtractionResult => ({
      ok: false, extractor: this.name, contentType, language: "unknown",
      ocrStatus: "not_required", confidence: 0, originalText: "",
      normalizedText: "", pageCount: null, blocks: [], warnings,
    });

    const buf = typeof content === "string" ? Buffer.from(content, "binary") : Buffer.from(content);
    if (buf.byteLength > MAX_DOCX_BYTES) return empty(["docx exceeds size bound — rejected"]);

    let xml: string;
    try {
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(buf);
      const doc = zip.file("word/document.xml");
      if (!doc) return empty(["word/document.xml missing — not a valid docx"]);
      const raw = await doc.async("uint8array");
      if (raw.byteLength > MAX_XML_BYTES) return empty(["document.xml exceeds uncompressed cap — rejected (zip-bomb control)"]);
      xml = new TextDecoder("utf-8").decode(raw);
    } catch (e) {
      return empty([`docx read failed: ${(e as Error).message}`]);
    }

    // Paragraphs: <w:p>…</w:p>; runs: <w:t>text</w:t>
    const paragraphs: string[] = [];
    for (const pm of xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)) {
      const texts = [...pm[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((t) =>
        t[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'),
      );
      const joined = texts.join("").trim();
      if (joined) paragraphs.push(joined);
    }

    const blocks: ExtractedBlock[] = [];
    let cursor = 0;
    const parts: string[] = [];
    for (const p of paragraphs) {
      const text = normalizeText(p);
      if (!text) continue;
      blocks.push({
        index: blocks.length,
        kind: "paragraph",
        anchorKey: `p:${String(blocks.length).padStart(4, "0")}`,
        headingPath: null,
        pageNumber: null,
        charStart: cursor,
        charEnd: cursor + text.length,
        originalText: p,
        text,
      });
      cursor += text.length + 1;
      parts.push(text);
    }
    const normalizedText = parts.join("\n");

    return {
      ok: blocks.length > 0,
      extractor: this.name,
      contentType,
      language: detectLanguage(normalizedText),
      ocrStatus: "not_required",
      confidence: blocks.length > 0 ? 0.85 : 0,
      originalText: paragraphs.join("\n"),
      normalizedText,
      pageCount: null,
      blocks,
      warnings: blocks.length === 0 ? ["no paragraphs extracted"] : [],
    };
  }
}

/**
 * PDF extractor — text-layer PDFs only (Epic 1 POC).
 * OCR is NEVER invoked automatically: when no usable text layer exists the
 * result is ok=false with ocrStatus="pending" — a human/pipeline decision
 * point, per the founder spec (Phase 8).
 * Uses `pdf-parse` via dynamic import (devDependency); when unavailable the
 * extractor reports itself unavailable instead of failing the harness.
 */
import { detectLanguage, normalizeText } from "../normalize-text.ts";
import type { ExtractedBlock, ExtractionResult, Extractor } from "../types.ts";

const MAX_PDF_BYTES = 25 * 1024 * 1024; // threat model: file-size abuse

export class PdfExtractor implements Extractor {
  readonly name = "pdf-text-v1";

  supports(contentType: string): boolean {
    return contentType.includes("application/pdf");
  }

  async extract(content: string | Uint8Array, contentType: string): Promise<ExtractionResult> {
    const empty = (warnings: string[], ocr: ExtractionResult["ocrStatus"]): ExtractionResult => ({
      ok: false, extractor: this.name, contentType, language: "unknown",
      ocrStatus: ocr, confidence: 0, originalText: "", normalizedText: "",
      pageCount: null, blocks: [], warnings,
    });

    const buf = typeof content === "string" ? Buffer.from(content, "binary") : Buffer.from(content);
    if (buf.byteLength > MAX_PDF_BYTES) {
      return empty([`pdf exceeds ${MAX_PDF_BYTES} bytes — rejected (size-abuse control)`], "failed");
    }

    let pdfParse: (b: Buffer) => Promise<{ text: string; numpages: number }>;
    try {
      const mod = await import("pdf-parse");
      pdfParse = (mod.default ?? mod) as typeof pdfParse;
    } catch {
      return empty(["pdf-parse not installed — PDF extraction unavailable in this environment"], "pending");
    }

    let parsed: { text: string; numpages: number };
    try {
      parsed = await pdfParse(buf);
    } catch (e) {
      return empty([`pdf parse failed: ${(e as Error).message}`], "failed");
    }

    const rawText = (parsed.text ?? "").trim();
    // No usable text layer → OCR decision point, NOT automatic OCR.
    if (rawText.replace(/\s/g, "").length < 40) {
      return empty(["no usable text layer — OCR required (not invoked automatically)"], "pending");
    }

    const paragraphs = rawText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
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
        pageNumber: null, // pdf-parse flattens pages; page anchors need the per-page API (future)
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
      confidence: blocks.length > 0 ? 0.8 : 0, // text-layer PDFs lose layout fidelity
      originalText: rawText,
      normalizedText,
      pageCount: parsed.numpages ?? null,
      blocks,
      warnings: ["pdf page anchors unavailable in POC extractor (flattened text layer)"],
    };
  }
}

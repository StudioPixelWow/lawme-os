/**
 * HTML extractor — POC implementation without a DOM dependency.
 * SECURITY: scripts/styles/comments are stripped BEFORE any text handling
 * (threat model: HTML/script injection via source documents); the output
 * is plain text only — no markup survives extraction.
 */
import { detectLanguage, normalizeText } from "../normalize-text.ts";
import type { ExtractedBlock, ExtractionResult, Extractor } from "../types.ts";

const BLOCK_RE = /<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;

function stripDangerous(html: string): { clean: string; warnings: string[] } {
  const warnings: string[] = [];
  let clean = html;
  if (/<script\b/i.test(clean)) warnings.push("script tags removed from source HTML");
  if (/\bon[a-z]+\s*=/i.test(clean)) warnings.push("inline event handlers removed");
  clean = clean
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  return { clean, warnings };
}

function stripTags(fragment: string): string {
  return fragment
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

export class HtmlExtractor implements Extractor {
  readonly name = "html-v1";

  supports(contentType: string): boolean {
    return contentType.includes("text/html");
  }

  async extract(content: string | Uint8Array, contentType: string): Promise<ExtractionResult> {
    const html = typeof content === "string" ? content : new TextDecoder("utf-8").decode(content);
    const { clean, warnings } = stripDangerous(html);

    const blocks: ExtractedBlock[] = [];
    let headingPath: string[] = [];
    let cursor = 0;
    const normalizedParts: string[] = [];
    let m: RegExpExecArray | null;
    let pIdx = 0;
    let hIdx = 0;

    BLOCK_RE.lastIndex = 0;
    while ((m = BLOCK_RE.exec(clean)) !== null) {
      const tag = m[1].toLowerCase();
      const original = stripTags(m[2]).trim();
      if (!original) continue;
      const text = normalizeText(original);
      if (!text) continue;

      const isHeading = tag.startsWith("h");
      if (isHeading) {
        const level = Number(tag[1]);
        headingPath = [...headingPath.slice(0, level - 1), text];
      }
      const kind = isHeading ? "heading" : "paragraph";
      const anchorKey = isHeading
        ? `h:${String(hIdx++).padStart(4, "0")}`
        : `p:${String(pIdx++).padStart(4, "0")}`;

      const charStart = cursor;
      const charEnd = cursor + text.length;
      cursor = charEnd + 1; // +1 for the joining newline

      blocks.push({
        index: blocks.length,
        kind,
        anchorKey,
        headingPath: isHeading
          ? (headingPath.length > 1 ? headingPath.slice(0, -1).join(" > ") : null)
          : (headingPath.length ? headingPath.join(" > ") : null),
        pageNumber: null,
        charStart,
        charEnd,
        originalText: original,
        text,
      });
      normalizedParts.push(text);
    }

    const normalizedText = normalizedParts.join("\n");
    const originalText = blocks.map((b) => b.originalText).join("\n");
    const ok = blocks.length > 0;
    if (!ok) warnings.push("no extractable blocks found in HTML");

    return {
      ok,
      extractor: this.name,
      contentType,
      language: detectLanguage(normalizedText),
      ocrStatus: "not_required",
      confidence: ok ? 0.95 : 0,
      originalText,
      normalizedText,
      pageCount: null,
      blocks,
      warnings,
    };
  }
}

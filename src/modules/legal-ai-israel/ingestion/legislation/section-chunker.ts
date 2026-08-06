/**
 * Legal RAG chunker for legislation (Step 9).
 *
 * Chunks by Section by default. A very long section is split along its
 * subsections; a short section stays whole. Every chunk carries the law title +
 * hierarchical heading path and the section number, and never removes section
 * numbers or cuts mid-subsection. Pure/offline.
 */
import { createHash } from "node:crypto";
import type { ParsedLaw, ParsedSection } from "./section-parser.ts";

export interface LegalChunk {
  lawId: string;
  documentVersionId: string;
  sectionId: string; // canonical Section id
  sectionNumber: string;
  headingPath: string; // "חוק … › פרק א' › סימן ב'"
  ordinal: number;
  chunkIndex: number; // within the section
  text: string; // heading-path prefix + section text
  sourceSpanStart: number;
  sourceSpanEnd: number;
  tokenCount: number;
  contentHash: string;
  language: string;
}

const hash = (s: string): string => createHash("sha256").update(s.normalize("NFC")).digest("hex");
const tokenCount = (t: string): number => (t.trim() ? t.trim().split(/\s+/).length : 0);

function pathString(lawTitle: string | null, s: ParsedSection): string {
  const parts: string[] = [];
  if (lawTitle) parts.push(lawTitle);
  for (const h of s.headingPath) {
    const label = h.kind === "chapter" ? "פרק" : h.kind === "subchapter" ? "סימן" : h.kind === "schedule" ? "תוספת" : "";
    parts.push(`${label} ${h.number ?? ""} ${h.heading}`.trim());
  }
  parts.push(s.heading ? `סעיף ${s.sectionNumber} — ${s.heading}` : `סעיף ${s.sectionNumber}`);
  return parts.join(" › ");
}

export interface ChunkOptions {
  maxChars: number; // split a section only if it exceeds this
  lawId: string;
  documentVersionId: string;
  sectionId: (s: ParsedSection) => string;
}

export function chunkLaw(law: ParsedLaw, opts: ChunkOptions): LegalChunk[] {
  const chunks: LegalChunk[] = [];
  for (const s of law.sections) {
    const heading = pathString(law.lawTitle, s);
    const pieces: { text: string; refStart: number; refEnd: number }[] = [];

    if (s.bodyText.length <= opts.maxChars || s.subsections.length === 0) {
      pieces.push({ text: s.bodyText, refStart: s.sourceSpan.start, refEnd: s.sourceSpan.end });
    } else {
      // split along subsections, never mid-subsection; group small ones
      let acc = "";
      for (const sub of s.subsections) {
        const piece = `${sub.marker} ${sub.text}`;
        if (acc.length > 0 && acc.length + piece.length + 1 > opts.maxChars) {
          pieces.push({ text: acc, refStart: s.sourceSpan.start, refEnd: s.sourceSpan.end });
          acc = piece;
        } else {
          acc = acc.length ? `${acc}\n${piece}` : piece;
        }
      }
      if (acc.length) pieces.push({ text: acc, refStart: s.sourceSpan.start, refEnd: s.sourceSpan.end });
    }

    pieces.forEach((p, i) => {
      const text = `${heading}\n\n${p.text}`.trim();
      chunks.push({
        lawId: opts.lawId,
        documentVersionId: opts.documentVersionId,
        sectionId: opts.sectionId(s),
        sectionNumber: s.sectionNumber,
        headingPath: heading,
        ordinal: s.ordinal,
        chunkIndex: i,
        text,
        sourceSpanStart: p.refStart,
        sourceSpanEnd: p.refEnd,
        tokenCount: tokenCount(text),
        contentHash: hash(text),
        language: "he",
      });
    });
  }
  return chunks;
}

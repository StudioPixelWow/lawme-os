/**
 * Rule-based Hebrew legal-document segmenter (LEGAL AI ISRAEL — Phase 2).
 *
 * Recognizes Hebrew structural headings and assigns each block a section_type.
 * Never splits solely by character count for the STRUCTURAL pass; oversized
 * structural sections are then split into paragraph-aware retrieval chunks that
 * carry surrounding context.
 */

export type SectionType =
  | "header" | "procedural_history" | "facts"
  | "applicant_arguments" | "respondent_arguments"
  | "plaintiff_arguments" | "defendant_arguments"
  | "legal_questions" | "legal_framework" | "analysis" | "evidence_analysis"
  | "majority_opinion" | "minority_opinion" | "ruling" | "operative_order"
  | "costs" | "sentence" | "appendix" | "unknown";

interface HeadingRule { re: RegExp; type: SectionType; }

// Order matters: more specific first.
const HEADING_RULES: readonly HeadingRule[] = [
  { re: /^\s*רקע(?:\s+עובדתי)?\s*[:.]?\s*$/, type: "facts" },
  { re: /^\s*העובדות\s*[:.]?\s*$/, type: "facts" },
  { re: /^\s*הרקע\s+הדיוני\s*[:.]?\s*$/, type: "procedural_history" },
  { re: /^\s*ההליך\s*[:.]?\s*$/, type: "procedural_history" },
  { re: /^\s*טענות\s+המבקש(?:ים|ת)?\s*[:.]?\s*$/, type: "applicant_arguments" },
  { re: /^\s*טענות\s+המשיב(?:ים|ה)?\s*[:.]?\s*$/, type: "respondent_arguments" },
  { re: /^\s*טענות\s+התובע(?:ים|ת)?\s*[:.]?\s*$/, type: "plaintiff_arguments" },
  { re: /^\s*טענות\s+הנתבע(?:ים|ת)?\s*[:.]?\s*$/, type: "defendant_arguments" },
  { re: /^\s*טענות\s+הצדדים\s*[:.]?\s*$/, type: "analysis" },
  { re: /^\s*השאלה\s+המשפטית\s*[:.]?\s*$/, type: "legal_questions" },
  { re: /^\s*המסגרת\s+ה(?:נורמטיבית|משפטית)\s*[:.]?\s*$/, type: "legal_framework" },
  { re: /^\s*דיון\s+והכרעה\s*[:.]?\s*$/, type: "analysis" },
  { re: /^\s*דיון\s*[:.]?\s*$/, type: "analysis" },
  { re: /^\s*הכרעה\s*[:.]?\s*$/, type: "ruling" },
  { re: /^\s*ניתוח\s+הראיות\s*[:.]?\s*$/, type: "evidence_analysis" },
  { re: /^\s*דעת\s+(?:הרוב|הרובב)\s*[:.]?\s*$/, type: "majority_opinion" },
  { re: /^\s*דעת\s+(?:המיעוט|יחיד)\s*[:.]?\s*$/, type: "minority_opinion" },
  { re: /^\s*(?:סוף\s+דבר|סיכום|התוצאה|אשר\s+על\s+כן)\s*[:.]?\s*$/, type: "operative_order" },
  { re: /^\s*הוצאות\s*[:.]?\s*$/, type: "costs" },
  { re: /^\s*גזר\s+דין\s*[:.]?\s*$/, type: "sentence" },
  { re: /^\s*החלטה\s*[:.]?\s*$/, type: "ruling" },
  { re: /^\s*נספח(?:ים)?\s*[:.]?\s*$/, type: "appendix" },
];

export interface DocumentSection {
  sectionIndex: number;
  sectionType: SectionType;
  heading: string | null;
  text: string;
}

function matchHeading(line: string): HeadingRule | null {
  if (line.trim().length === 0 || line.trim().length > 40) return null;
  for (const r of HEADING_RULES) if (r.re.test(line)) return r;
  return null;
}

/** Structural segmentation by recognized Hebrew headings. */
export function segmentDocument(normalizedText: string): DocumentSection[] {
  const lines = normalizedText.split("\n");
  const sections: DocumentSection[] = [];
  let current: DocumentSection = { sectionIndex: 0, sectionType: "header", heading: null, text: "" };
  const buffer: string[] = [];

  const flush = () => {
    current.text = buffer.join("\n").trim();
    if (current.text.length > 0 || current.heading !== null) {
      sections.push({ ...current, sectionIndex: sections.length });
    }
    buffer.length = 0;
  };

  for (const line of lines) {
    const h = matchHeading(line);
    if (h) {
      flush();
      current = { sectionIndex: sections.length, sectionType: h.type, heading: line.trim(), text: "" };
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections.length > 0 ? sections : [{ sectionIndex: 0, sectionType: "unknown", heading: null, text: normalizedText.trim() }];
}

export interface RetrievalChunk {
  documentId: string;
  sectionIndex: number;
  sectionType: SectionType;
  heading: string | null;
  chunkIndex: number;
  text: string;
  precedingContext: string;
  followingContext: string;
}

/** Split oversized sections into paragraph-aware chunks with context. */
export function chunkSections(
  documentId: string,
  sections: readonly DocumentSection[],
  maxChars = 1200,
): RetrievalChunk[] {
  const chunks: RetrievalChunk[] = [];
  for (const sec of sections) {
    const rawParas = sec.text.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0);
    // Hard-split any single paragraph that exceeds maxChars (at word boundaries),
    // so an unparagraphed wall of text still yields multiple retrieval chunks.
    const paragraphs: string[] = [];
    for (const p of rawParas) {
      if (p.length <= maxChars) { paragraphs.push(p); continue; }
      const words = p.split(/\s+/);
      let piece = "";
      for (const w of words) {
        if (piece.length > 0 && piece.length + w.length + 1 > maxChars) { paragraphs.push(piece); piece = w; }
        else piece = piece.length ? `${piece} ${w}` : w;
      }
      if (piece.length > 0) paragraphs.push(piece);
    }
    const grouped: string[] = [];
    let acc = "";
    for (const p of paragraphs) {
      if (acc.length > 0 && acc.length + p.length + 2 > maxChars) { grouped.push(acc); acc = p; }
      else acc = acc.length ? `${acc}\n\n${p}` : p;
    }
    if (acc.length > 0) grouped.push(acc);
    if (grouped.length === 0) grouped.push(sec.text);
    grouped.forEach((text, i) => {
      chunks.push({
        documentId,
        sectionIndex: sec.sectionIndex,
        sectionType: sec.sectionType,
        heading: sec.heading,
        chunkIndex: i,
        text,
        precedingContext: i > 0 ? grouped[i - 1].slice(-160) : "",
        followingContext: i < grouped.length - 1 ? grouped[i + 1].slice(0, 160) : "",
      });
    });
  }
  return chunks;
}

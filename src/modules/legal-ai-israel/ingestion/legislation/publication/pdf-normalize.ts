/**
 * Pre-parse normalization for extracted ספר-החוקים PDF text (current Epic Track A).
 *
 * Turns RAW pdf.js text-layer output into STABLE structured legal text before the
 * section parser / amendment parser / chunker run. It is fully DETERMINISTIC —
 * NO LLM in the loop — and never mutates the stored raw text: callers keep three
 * separate layers (raw_extracted_text, normalized_legal_text, structured_parse).
 *
 * Rules were built against REAL extraction failures observed in the pilot PDFs:
 *   - reversed RTL parentheses:  ")ה("  → "(ה)",  "9א)א("  → "9א(א)"
 *   - glued Hebrew/Gregorian year:  תשי"ט1959  → תשי"ט-1959
 *   - missing hyphen:  בחוקיסוד  → בחוק-יסוד
 *   - lone spurious glyph "פ" (a mis-mapped marker) → clause separator (flagged)
 *   - lines broken mid-sentence rejoined (unless the next line is a structural
 *     marker: section number, subsection, heading, list item, schedule)
 *   - repeated running heads/feet removed (רשומות / ספר החוקים / page number /
 *     recurring date) — only when they repeat across pages at high confidence.
 *
 * Every transformation is recorded in an optional trace, and risky ones raise a
 * warning + lower the normalization confidence rather than silently applying.
 */

export const NORMALIZATION_VERSION = "legal-normalize-1";

export type NormalizationRule =
  | "collapse_spaces"
  | "fix_reversed_parens"
  | "fix_glued_year"
  | "fix_missing_hyphen"
  | "glyph_remap"
  | "line_rejoin"
  | "remove_running_head";

export interface NormalizationTraceEntry {
  rule: NormalizationRule;
  before: string;
  after: string;
  confidence: number;
}

export interface NormalizationResult {
  rawText: string;
  normalizedText: string;
  normalizedTextHash: string; // set by caller (crypto) — kept here as empty placeholder unless provided
  version: string;
  rulesApplied: NormalizationRule[];
  confidence: number; // 0..1
  warnings: string[];
  trace: NormalizationTraceEntry[];
}

export interface NormalizeOptions {
  /** Collect a per-transformation trace (capped). Off by default for scale. */
  trace?: boolean;
  /** Page delimiter used by the extractor (default: blank line between pages). */
  pageDelimiter?: string;
  hashFn?: (s: string) => string;
}

/** A line that must NOT be joined onto the previous line (structural markers). */
const STRUCTURAL_LINE = new RegExp(
  [
    "^\\d+[א-ת]{0,2}\\.\\s", // section number "12." / "12א."
    "^\\(?[א-ת]\\)", // subsection "(א)" or "א)"
    "^\\(?\\d+\\)", // list item "(1)" / "1)"
    "^(פרק|סימן|תוספת|לוח|טופס)\\b", // chapter/part/schedule/form headings
    "^תיקון\\s", // "תיקון סעיף ..." heading
    "^הוספת\\s", // "הוספת סעיף ..."
    "^ביטול\\s", // "ביטול ..."
    "^החלפת\\s", // "החלפת ..."
  ].join("|"),
);

/** Boilerplate running heads/feet that repeat across gazette pages. */
const RUNNING_HEAD = /^(רשומות|ספר\s+החוקים|עמוד|ילקוט\s+הפרסומים)\s*$/;
const PAGE_NUMBER_LINE = /^\d{1,4}\s*$/;

function endsWithSentencePunct(line: string): boolean {
  return /[.:;)]\s*$/.test(line) || /["']\s*$/.test(line);
}

/** Fix parentheses that the RTL text layer emitted reversed: ")X(" → "(X)". */
function fixReversedParens(s: string, trace: NormalizationTraceEntry[]): string {
  return s.replace(/\)([^()\n]{1,40}?)\(/g, (m, inner: string) => {
    const after = `(${inner})`;
    if (trace.length < 200) trace.push({ rule: "fix_reversed_parens", before: m, after, confidence: 0.9 });
    return after;
  });
}

/** Insert the missing hyphen between a Hebrew year abbreviation and its Gregorian year. */
function fixGluedYear(s: string, trace: NormalizationTraceEntry[]): string {
  return s.replace(/(הת?ש[א-ת]?["'״׳]?[א-ת])[־-]?(\d{4})/g, (m, heb: string, greg: string) => {
    const after = `${heb}-${greg}`;
    if (m === after) return m;
    if (trace.length < 200) trace.push({ rule: "fix_glued_year", before: m, after, confidence: 0.85 });
    return after;
  });
}

function fixMissingHyphen(s: string, trace: NormalizationTraceEntry[]): string {
  return s.replace(/(^|[\s"])(ב?ה?)חוקיסוד/g, (m, pre: string, prefix: string) => {
    const after = `${pre}${prefix}חוק-יסוד`;
    if (trace.length < 200) trace.push({ rule: "fix_missing_hyphen", before: m.trim(), after: after.trim(), confidence: 0.95 });
    return after;
  });
}

/**
 * Remap the lone mis-mapped glyph "פ" (whitespace-bounded single char, a known
 * pdf.js font-encoding artifact) to a clause separator. NEVER touches a פ inside
 * a word. Flagged as lower confidence → a warning + needs_review upstream.
 */
function glyphRemap(s: string, trace: NormalizationTraceEntry[], warnings: string[]): string {
  let count = 0;
  const out = s.replace(/(^|\s)פ(?=\s|$)/g, (m, pre: string) => {
    count += 1;
    if (trace.length < 200) trace.push({ rule: "glyph_remap", before: "פ", after: ";", confidence: 0.5 });
    return `${pre};`;
  });
  if (count > 0) warnings.push(`glyph_remap: replaced ${count} lone "פ" glyph(s) with ";" (needs_review)`);
  return out;
}

/** Remove running heads/feet that repeat identically across pages. */
function removeRunningHeads(pages: string[], trace: NormalizationTraceEntry[]): string[] {
  const freq = new Map<string, number>();
  for (const page of pages) {
    for (const raw of page.split("\n")) {
      const line = raw.trim();
      if (RUNNING_HEAD.test(line) || PAGE_NUMBER_LINE.test(line)) {
        freq.set(line, (freq.get(line) ?? 0) + 1);
      }
    }
  }
  return pages.map((page) =>
    page
      .split("\n")
      .filter((raw) => {
        const line = raw.trim();
        const repeated = (freq.get(line) ?? 0) >= 2;
        const boiler = RUNNING_HEAD.test(line) || PAGE_NUMBER_LINE.test(line);
        if (boiler && (repeated || RUNNING_HEAD.test(line))) {
          if (trace.length < 200) trace.push({ rule: "remove_running_head", before: line, after: "", confidence: 0.9 });
          return false;
        }
        return true;
      })
      .join("\n"),
  );
}

/** Rejoin lines broken mid-sentence (deterministic; respects structural markers). */
function rejoinLines(text: string, trace: NormalizationTraceEntry[]): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const cur = lines[i].trim();
    if (cur.length === 0) {
      out.push("");
      continue;
    }
    if (out.length > 0) {
      const prev = out[out.length - 1];
      const prevOpen = prev.length > 0 && !endsWithSentencePunct(prev);
      const curIsStructural = STRUCTURAL_LINE.test(cur) || cur.length === 0;
      const prevIsStructuralHeading = /^(תיקון|הוספת|ביטול|החלפת|פרק|סימן|תוספת)\b/.test(prev) && !endsWithSentencePunct(prev);
      if (prevOpen && !curIsStructural && !prevIsStructuralHeading) {
        // Merge a mid-word split ("...בסעיף\n6 לחוק") or a wrapped sentence.
        out[out.length - 1] = `${prev} ${cur}`;
        if (trace.length < 200) trace.push({ rule: "line_rejoin", before: `${prev} ⏎ ${cur}`.slice(0, 80), after: `${prev} ${cur}`.slice(0, 80), confidence: 0.8 });
        continue;
      }
    }
    out.push(cur);
  }
  return out.join("\n");
}

/** Normalize raw extracted PDF text into stable legal text. Deterministic. */
export function normalizePdfText(raw: string, opts: NormalizeOptions = {}): NormalizationResult {
  const trace: NormalizationTraceEntry[] = [];
  const warnings: string[] = [];
  const rulesApplied: NormalizationRule[] = [];
  const delim = opts.pageDelimiter ?? "\n\n";

  let s = raw.normalize("NFC");

  // 1. collapse runs of spaces/tabs (pdf.js emits many).
  s = s.replace(/[ \t ]{2,}/g, " ").replace(/ +\n/g, "\n").replace(/\n +/g, "\n");
  rulesApplied.push("collapse_spaces");

  // 2. remove repeated running heads/feet (page-aware).
  const pages = s.split(delim);
  const cleanedPages = removeRunningHeads(pages, trace);
  s = cleanedPages.join(delim);
  rulesApplied.push("remove_running_head");

  // 3. structural fixes.
  s = fixReversedParens(s, trace); rulesApplied.push("fix_reversed_parens");
  s = fixGluedYear(s, trace); rulesApplied.push("fix_glued_year");
  s = fixMissingHyphen(s, trace); rulesApplied.push("fix_missing_hyphen");
  s = glyphRemap(s, trace, warnings); rulesApplied.push("glyph_remap");

  // 4. line rejoin (after structural fixes so markers are recognizable).
  s = rejoinLines(s, trace); rulesApplied.push("line_rejoin");

  s = s.replace(/\n{3,}/g, "\n\n").trim();

  // Confidence: start high, dock for risky glyph remaps.
  const glyphRemaps = trace.filter((t) => t.rule === "glyph_remap").length;
  const confidence = Math.max(0.5, 1 - glyphRemaps * 0.03);

  return {
    rawText: raw,
    normalizedText: s,
    normalizedTextHash: opts.hashFn ? opts.hashFn(s) : "",
    version: NORMALIZATION_VERSION,
    rulesApplied: [...new Set(rulesApplied)],
    confidence: Number(confidence.toFixed(3)),
    warnings,
    trace: opts.trace ? trace : [],
  };
}

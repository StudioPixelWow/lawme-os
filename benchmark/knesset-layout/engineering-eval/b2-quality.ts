/**
 * LAW ME — Path-B2 quality gates, sparse/empty classification, and decision.
 *
 * Founder Epic §7–§12. Deterministic, pure. Nothing here publishes; every
 * uncertain result is routed to needs_review rather than silently accepted.
 * These are ENGINEERING / PROXY gates — never a claim of human-level accuracy.
 */


import type { CanonicalTable } from "./b2-tables.ts";
import { HEB, stripSpace } from "./eng-metrics.ts";

// ---- Machine-readable reason codes -----------------------------------------
export const B2_REASON = {
  SPARSE_PAGE: "B2_SPARSE_PAGE",
  EMPTY_OCR: "B2_EMPTY_OCR",
  LOW_CONFIDENCE: "B2_LOW_CONFIDENCE",
  TABLE_STRUCTURE_UNCERTAIN: "B2_TABLE_STRUCTURE_UNCERTAIN",
  TABLE_LOW_CONFIDENCE: "B2_TABLE_LOW_CONFIDENCE",
  OCR_ERROR: "B2_OCR_ERROR",
} as const;
export type B2Reason = typeof B2_REASON[keyof typeof B2_REASON];

// ---- Page classification ----------------------------------------------------
export type PageState = "content" | "likely_blank" | "sparse" | "ocr_failed" | "needs_review";

export interface B2PageSignals {
  char_count: number;        // stripSpace length of produced text
  token_count?: number;
  line_count?: number;
  block_count?: number;
  mean_confidence: number;   // 0..100 (Document AI mean token/cell confidence)
  ocr_error?: boolean;       // provider/API error occurred
  image_decoded?: boolean;   // page image existed and decoded (if known)
}

export interface B2Thresholds {
  sparse_max_chars: number;  // ≤ ⇒ sparse
  low_conf: number;          // < ⇒ low confidence (0..100)
  table_low_cell_conf: number; // < ⇒ table cells low confidence (0..1)
  numeric_ratio_table_hint: number; // ≥ numeric token ratio with no table ⇒ suspicious
}
export const DEFAULT_B2_THRESHOLDS: B2Thresholds = {
  sparse_max_chars: 12,
  low_conf: 60,
  table_low_cell_conf: 0.6,
  numeric_ratio_table_hint: 0.3,
};

export interface PageClassification {
  state: PageState;
  needs_review: boolean;
  reason_codes: B2Reason[];
}

/**
 * Classify a B2 page. Crucially, "OCR returned no text" is NOT auto-equated
 * with "page is truly blank": an empty result is `likely_blank` but always
 * needs_review, because we cannot deterministically distinguish a genuinely
 * blank verso from a scan the OCR could not read.
 */
export function classifyPage(sig: B2PageSignals, th: B2Thresholds = DEFAULT_B2_THRESHOLDS): PageClassification {
  const reasons: B2Reason[] = [];
  const chars = Math.max(0, sig.char_count | 0);

  if (sig.ocr_error) {
    return { state: "ocr_failed", needs_review: true, reason_codes: [B2_REASON.OCR_ERROR] };
  }
  if (chars === 0) {
    // Empty OCR result — could be a blank page OR a failed read. Never auto-blank.
    reasons.push(B2_REASON.EMPTY_OCR);
    return { state: "likely_blank", needs_review: true, reason_codes: reasons };
  }
  if (chars <= th.sparse_max_chars) {
    reasons.push(B2_REASON.SPARSE_PAGE);
    if (sig.mean_confidence < th.low_conf) reasons.push(B2_REASON.LOW_CONFIDENCE);
    return { state: "sparse", needs_review: true, reason_codes: reasons };
  }
  if (sig.mean_confidence < th.low_conf) {
    reasons.push(B2_REASON.LOW_CONFIDENCE);
    return { state: "needs_review", needs_review: true, reason_codes: reasons };
  }
  return { state: "content", needs_review: false, reason_codes: [] };
}

// ---- Table quality gates ----------------------------------------------------
export interface TableGateSignals {
  numeric_ratio: number;     // fraction of tokens that are numeric (0..1)
  has_flattened_text: boolean;
}
export interface TableAssessment {
  table_detected: boolean;
  issues: B2Reason[];
  needs_review: boolean;
}

const rowCellCounts = (t: CanonicalTable): number[] => t.rows.map((r) => r.cells.length);

/** Generic (not overfit) checks on reconstructed table structure. */
export function assessTables(tables: CanonicalTable[], sig: TableGateSignals, th: B2Thresholds = DEFAULT_B2_THRESHOLDS): TableAssessment {
  const issues = new Set<B2Reason>();
  const detected = tables.length > 0;

  // (a) mostly-numeric page but NO table detected → flattened numbers lost their grid.
  if (!detected && sig.has_flattened_text && sig.numeric_ratio >= th.numeric_ratio_table_hint) {
    issues.add(B2_REASON.TABLE_STRUCTURE_UNCERTAIN);
  }

  for (const t of tables) {
    // (b) table detected but zero cells.
    if (t.total_cells === 0) issues.add(B2_REASON.TABLE_STRUCTURE_UNCERTAIN);
    // (c) rows with strongly inconsistent cell counts (ragged grid).
    const counts = rowCellCounts(t).filter((n) => n > 0);
    if (counts.length >= 2) {
      const mn = Math.min(...counts), mx = Math.max(...counts);
      if (mx - mn >= 2 && mx - mn > Math.ceil(0.5 * mx)) issues.add(B2_REASON.TABLE_STRUCTURE_UNCERTAIN);
    }
    // (d) low per-cell confidence.
    if (t.mean_cell_confidence != null && t.mean_cell_confidence < th.table_low_cell_conf) issues.add(B2_REASON.TABLE_LOW_CONFIDENCE);
    // (e) geometry-reconstructed tables are inherently uncertain vs native DocAI tables.
    if (t.source === "geometry_reconstructed") issues.add(B2_REASON.TABLE_STRUCTURE_UNCERTAIN);
  }
  return { table_detected: detected, issues: [...issues], needs_review: issues.size > 0 };
}

// ---- B2 decision model (§12) ------------------------------------------------
export type B2Decision = "accepted" | "needs_review" | "failed";
export interface B2Verdict {
  decision: B2Decision;
  state: PageState;
  reason_codes: B2Reason[];
  table_detected: boolean;
  published: 0;
}

/**
 * Combine page classification and table assessment into a final B2 verdict.
 * A provider/API success (HTTP 200) is NEVER sufficient on its own to accept.
 */
export function decideB2(cls: PageClassification, tbl: TableAssessment): B2Verdict {
  const reasons = [...new Set<B2Reason>([...cls.reason_codes, ...tbl.issues])];
  let decision: B2Decision;
  if (cls.state === "ocr_failed") decision = "failed";
  else if (cls.needs_review || tbl.needs_review) decision = "needs_review";
  else decision = "accepted";
  return { decision, state: cls.state, reason_codes: reasons, table_detected: tbl.table_detected, published: 0 };
}

// ---- Metric-calculation fixes (§11) ----------------------------------------
/**
 * Strip structural dot-leaders / rule characters used to lay out tables so they
 * don't inflate *semantic* duplication. Operates on a COPY for metric purposes
 * only — never mutates the canonical OCR text.
 */
export function stripStructural(t: string): string {
  return (t ?? "")
    .replace(/[.\-=_·•‧∙]{2,}/g, " ")   // dot-leaders / rules: "-.-.-.", "====", "____"
    .replace(/(\s[.\-=_])+\s/g, " ")     // spaced leader runs
    .replace(/\s+/g, " ")
    .trim();
}

/** Semantic bigram-duplication rate AFTER removing structural punctuation. */
export function semanticDuplication(text: string): number {
  const s = stripSpace(stripStructural(text));
  if (s.length < 4) return 0;
  const seen = new Map<string, number>();
  let rep = 0, tot = 0;
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    const n = (seen.get(g) ?? 0) + 1;
    seen.set(g, n); tot++;
    if (n > 3) rep++;
  }
  return tot ? rep / tot : 0;
}

/** Fraction of whitespace-separated tokens that are purely numeric (amounts). */
export function numericRatio(text: string): number {
  const toks = (text ?? "").split(/\s+/).filter(Boolean);
  if (!toks.length) return 0;
  const nums = toks.filter((w) => /^[\d.,()%\-]+$/.test(w) && /\d/.test(w)).length;
  return nums / toks.length;
}

/** Hebrew share, but explicitly NOT a hard gate for bilingual pages. */
export function hebrewShareText(text: string): number {
  let letters = 0, heb = 0;
  for (const c of text ?? "") { if (/\p{L}/u.test(c)) { letters++; if (HEB.test(c)) heb++; } }
  return letters ? heb / letters : 0;
}

/** Produced-text breakdown (§11) — report categories separately, never lump
 *  expected blanks in with OCR failures. */
export interface ProducedBreakdown {
  pages: number;
  pages_with_text: number;
  likely_blank_or_sparse: number;
  ocr_failed: number;
  needs_review: number;
}
export function producedBreakdown(classes: PageClassification[]): ProducedBreakdown {
  return {
    pages: classes.length,
    pages_with_text: classes.filter((c) => c.state === "content").length,
    likely_blank_or_sparse: classes.filter((c) => c.state === "likely_blank" || c.state === "sparse").length,
    ocr_failed: classes.filter((c) => c.state === "ocr_failed").length,
    needs_review: classes.filter((c) => c.needs_review).length,
  };
}

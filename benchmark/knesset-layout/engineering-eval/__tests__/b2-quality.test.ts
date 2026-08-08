/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyPage, assessTables, decideB2, semanticDuplication, stripStructural,
  numericRatio, producedBreakdown, B2_REASON, type B2PageSignals,
} from "../b2-quality.ts";
import type { CanonicalTable } from "../b2-tables.ts";

const sig = (o: Partial<B2PageSignals>): B2PageSignals => ({ char_count: 0, mean_confidence: 0, ...o });

test("content page → accepted, no review", () => {
  const c = classifyPage(sig({ char_count: 600, mean_confidence: 96 }));
  assert.equal(c.state, "content");
  assert.equal(c.needs_review, false);
  assert.deepEqual(c.reason_codes, []);
});

test("empty OCR is likely_blank + needs_review (never auto-blank)", () => {
  const c = classifyPage(sig({ char_count: 0, mean_confidence: 0 }));
  assert.equal(c.state, "likely_blank");
  assert.equal(c.needs_review, true);
  assert.ok(c.reason_codes.includes(B2_REASON.EMPTY_OCR));
});

test("provider/API error → ocr_failed", () => {
  const c = classifyPage(sig({ char_count: 0, ocr_error: true }));
  assert.equal(c.state, "ocr_failed");
  assert.ok(c.reason_codes.includes(B2_REASON.OCR_ERROR));
});

test("sparse page (few chars, low conf) → sparse + needs_review", () => {
  const c = classifyPage(sig({ char_count: 2, mean_confidence: 56.6 })); // bench-101 "1 1"
  assert.equal(c.state, "sparse");
  assert.equal(c.needs_review, true);
  assert.ok(c.reason_codes.includes(B2_REASON.SPARSE_PAGE));
  assert.ok(c.reason_codes.includes(B2_REASON.LOW_CONFIDENCE));
});

test("content but low confidence → needs_review", () => {
  const c = classifyPage(sig({ char_count: 400, mean_confidence: 50 }));
  assert.equal(c.needs_review, true);
  assert.ok(c.reason_codes.includes(B2_REASON.LOW_CONFIDENCE));
});

test("table gates: mostly-numeric page with NO table → uncertain", () => {
  const a = assessTables([], { numeric_ratio: 0.5, has_flattened_text: true });
  assert.equal(a.needs_review, true);
  assert.ok(a.issues.includes(B2_REASON.TABLE_STRUCTURE_UNCERTAIN));
});

test("table gates: clean native table → no issues", () => {
  const t: CanonicalTable = {
    page: 44, table_index: 0, source: "docai_tables", n_rows: 3, n_cols: 2, total_cells: 6, header: ["סעיף", "סכום"],
    rows: [
      { cells: [{ row: 0, column: 0, text: "סעיף", confidence: 0.95, bbox: null }, { row: 0, column: 1, text: "סכום", confidence: 0.95, bbox: null }] },
      { cells: [{ row: 1, column: 0, text: "מטה", confidence: 0.95, bbox: null }, { row: 1, column: 1, text: "269,586", confidence: 0.95, bbox: null }] },
      { cells: [{ row: 2, column: 0, text: "עידוד", confidence: 0.95, bbox: null }, { row: 2, column: 1, text: "189,913", confidence: 0.95, bbox: null }] },
    ],
    mean_cell_confidence: 0.95, bbox: null,
  };
  const a = assessTables([t], { numeric_ratio: 0.4, has_flattened_text: true });
  assert.equal(a.table_detected, true);
  assert.equal(a.needs_review, false);
  assert.deepEqual(a.issues, []);
});

test("table gates: geometry-reconstructed & zero-cell & low-conf → uncertain/low", () => {
  const geom: CanonicalTable = { page: 1, table_index: 0, source: "geometry_reconstructed", n_rows: 2, n_cols: 2, total_cells: 4, header: [], rows: [{ cells: [{ row: 0, column: 0, text: "a", confidence: 0.5, bbox: null }] }], mean_cell_confidence: 0.5, bbox: null };
  const a = assessTables([geom], { numeric_ratio: 0.4, has_flattened_text: true });
  assert.ok(a.issues.includes(B2_REASON.TABLE_STRUCTURE_UNCERTAIN));
  assert.ok(a.issues.includes(B2_REASON.TABLE_LOW_CONFIDENCE));
});

test("decision model combines classification + table gates", () => {
  const content = classifyPage(sig({ char_count: 600, mean_confidence: 96 }));
  const cleanTbl = { table_detected: true, issues: [], needs_review: false };
  assert.equal(decideB2(content, cleanTbl).decision, "accepted");
  const uncertainTbl = { table_detected: true, issues: [B2_REASON.TABLE_STRUCTURE_UNCERTAIN], needs_review: true };
  assert.equal(decideB2(content, uncertainTbl).decision, "needs_review");
  const failed = classifyPage(sig({ char_count: 0, ocr_error: true }));
  assert.equal(decideB2(failed, { table_detected: false, issues: [], needs_review: false }).decision, "failed");
});

test("duplication metric ignores structural dot-leaders (does not alter canonical text)", () => {
  const leaders = "-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.====----____";
  assert.equal(stripStructural(leaders).replace(/\s+/g, ""), "");
  assert.ok(semanticDuplication(leaders) < 0.05, "leaders don't inflate duplication");
  const realDup = "אבגאבגאבגאבגאבגאבגאבגאבגאבגאבג"; // genuinely repetitive bigrams
  assert.ok(semanticDuplication(realDup) > 0.2, "real repetition still detected");
});

test("numericRatio counts amount-like tokens", () => {
  assert.equal(numericRatio("269,586 189,913 מטה"), 2 / 3);
  assert.equal(numericRatio("שלום עולם"), 0);
});

test("producedBreakdown separates blanks/sparse/failed from content", () => {
  const b = producedBreakdown([
    classifyPage(sig({ char_count: 600, mean_confidence: 96 })), // content
    classifyPage(sig({ char_count: 0, mean_confidence: 0 })),    // likely_blank
    classifyPage(sig({ char_count: 2, mean_confidence: 56 })),   // sparse
    classifyPage(sig({ char_count: 0, ocr_error: true })),       // ocr_failed
  ]);
  assert.equal(b.pages, 4);
  assert.equal(b.pages_with_text, 1);
  assert.equal(b.likely_blank_or_sparse, 2);
  assert.equal(b.ocr_failed, 1);
  assert.equal(b.needs_review, 3);
});

/**
 * Regression against the OBSERVED 10-page cohort (text-only signals from the
 * live run) — proves the required routing without live Document AI:
 *   022/023/102/105/108 → content(accepted)   060/061 → needs_review(table)   101/104/107 → needs_review(blank/sparse)
 */
test("observed 10-page cohort routes as required", () => {
  const cohort: Record<string, { chars: number; conf: number; numeric: number }> = {
    "bench-022": { chars: 900, conf: 96.0, numeric: 0.15 },
    "bench-023": { chars: 1200, conf: 95.7, numeric: 0.1 },
    "bench-102": { chars: 45, conf: 96.4, numeric: 0.2 },
    "bench-105": { chars: 55, conf: 95.8, numeric: 0.2 },
    "bench-108": { chars: 55, conf: 97.0, numeric: 0.2 },
    "bench-060": { chars: 800, conf: 92.8, numeric: 0.55 }, // budget table, no native tables
    "bench-061": { chars: 300, conf: 89.2, numeric: 0.55 },
    "bench-101": { chars: 2, conf: 56.6, numeric: 1.0 },
    "bench-104": { chars: 0, conf: 0, numeric: 0 },
    "bench-107": { chars: 0, conf: 0, numeric: 0 },
  };
  const decide = (id: string) => {
    const s = cohort[id];
    const cls = classifyPage(sig({ char_count: s.chars, mean_confidence: s.conf }));
    const tbl = assessTables([], { numeric_ratio: s.numeric, has_flattened_text: s.chars > 0 }); // no native tables from OCR processor
    return decideB2(cls, tbl).decision;
  };
  for (const id of ["bench-022", "bench-023", "bench-102", "bench-105", "bench-108"]) assert.equal(decide(id), "accepted", id);
  for (const id of ["bench-060", "bench-061"]) assert.equal(decide(id), "needs_review", id);       // table structure uncertain
  for (const id of ["bench-101", "bench-104", "bench-107"]) assert.equal(decide(id), "needs_review", id);
});

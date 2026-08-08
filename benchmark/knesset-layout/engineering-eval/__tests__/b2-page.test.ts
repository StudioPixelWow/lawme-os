import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleB2Page } from "../b2-page.ts";
import type { DocaiDocument } from "../b2-tables.ts";

function budgetLayout(): DocaiDocument {
  const parts: Record<string, string> = { h0: "סעיף", h1: "סכום", l1: "מטה", a1: "269,586" };
  const order = ["h0", "h1", "l1", "a1"]; let text = ""; const idx: Record<string, [number, number]> = {};
  for (const k of order) { const s = text.length; text += parts[k] + "\n"; idx[k] = [s, s + parts[k].length]; }
  const anc = (k: string) => ({ layout: { textAnchor: { textSegments: [{ startIndex: idx[k][0], endIndex: idx[k][1] }] }, confidence: 0.95 } });
  return { text, pages: [{ pageNumber: 60, dimension: { width: 600, height: 800 }, tables: [{ headerRows: [{ cells: [anc("h0"), anc("h1")] }], bodyRows: [{ cells: [anc("l1"), anc("a1")] }] }], tokens: [] }] };
}

test("content page with native table → accepted-or-review carries structured table", () => {
  const lay = budgetLayout();
  const a = assembleB2Page({ text: `${lay.text} 269,586 12,000 4,751,336`, layout: lay, mean_confidence: 95, token_count: 20, line_count: 4, block_count: 2 });
  assert.equal(a.ocr_state, "content");
  assert.equal(a.table_source, "native");
  assert.equal(a.table_count, 1);
  assert.equal(a.verdict.decision, "accepted"); // native cells, no gate issues
  assert.ok(a.normalized_text.includes("[טבלה]"));
});

test("empty OCR → likely_blank + needs_review (never authoritative blank)", () => {
  const a = assembleB2Page({ text: "", layout: { text: "", pages: [] }, mean_confidence: 0, ocr_error: false });
  assert.equal(a.ocr_state, "likely_blank");
  assert.equal(a.verdict.decision, "needs_review");
  assert.ok(a.verdict.reason_codes.includes("B2_EMPTY_OCR"));
});

test("clean bilingual prose (low numeric) → no geometry table, accepted", () => {
  // tokens present but numeric-poor text ⇒ geometry gated off
  const doc: DocaiDocument = { text: "אשלגן ביכרומאט KALII", pages: [{ pageNumber: 1, dimension: { width: 600, height: 800 }, tables: [], tokens: [
    { layout: { textAnchor: { content: "אשלגן" }, confidence: 0.96, boundingPoly: { vertices: [{ x: 500, y: 100 }, { x: 560, y: 100 }, { x: 560, y: 112 }, { x: 500, y: 112 }] } } },
    { layout: { textAnchor: { content: "KALII" }, confidence: 0.96, boundingPoly: { vertices: [{ x: 200, y: 100 }, { x: 260, y: 100 }, { x: 260, y: 112 }, { x: 200, y: 112 }] } } },
  ] }] };
  const a = assembleB2Page({ text: "אשלגן ביכרומאט KALII", layout: doc, mean_confidence: 96, token_count: 3 });
  assert.equal(a.table_count, 0);
  assert.equal(a.verdict.decision, "accepted");
});

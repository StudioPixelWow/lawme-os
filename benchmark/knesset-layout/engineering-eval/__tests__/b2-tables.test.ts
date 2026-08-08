/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractDocaiTables, extractTables, reconstructTablesFromTokens, resolveAnchorText,
  tableDetection, tableToText, type DocaiDocument,
} from "../b2-tables.ts";

/**
 * Build a budget-table fixture whose FLATTENED text puts all labels first and
 * all amounts last (mimicking the bench-060/061 failure), while the Document AI
 * table cells reference the correct slices. This proves the label↔amount pairing
 * is recovered from the CELL GRID, not from OCR reading order.
 */
function budgetFixture(): DocaiDocument {
  const parts: Record<string, string> = {
    h0: "סעיף", h1: "סכום",
    l1: "מטה ורגולציה", l2: "עידוד תעסוקת הורים",
    a1: "269,586", a2: "189,913",
  };
  const order = ["h0", "h1", "l1", "l2", "a1", "a2"]; // labels block, then amounts block
  let text = "";
  const idx: Record<string, [number, number]> = {};
  for (const k of order) { const s = text.length; text += parts[k] + "\n"; idx[k] = [s, s + parts[k].length]; }
  const anchor = (k: string, conf = 0.95) => ({ layout: { textAnchor: { textSegments: [{ startIndex: idx[k][0], endIndex: idx[k][1] }] }, confidence: conf } });
  return {
    text,
    pages: [{
      pageNumber: 44, dimension: { width: 600, height: 800 },
      tables: [{
        headerRows: [{ cells: [anchor("h0"), anchor("h1")] }],
        bodyRows: [
          { cells: [anchor("l1"), anchor("a1")] },
          { cells: [anchor("l2"), anchor("a2")] },
        ],
      }],
      tokens: [],
    }],
  };
}

test("resolveAnchorText slices document text by segments", () => {
  const doc: DocaiDocument = { text: "ABCDEFGH" };
  assert.equal(resolveAnchorText(doc.text!, { textSegments: [{ startIndex: 2, endIndex: 5 }] }), "CDE");
  assert.equal(resolveAnchorText(doc.text!, { textSegments: [{ startIndex: "0", endIndex: "1" }, { startIndex: 7, endIndex: 8 }] }), "A H".replace(" ", "")); // "AH"
});

test("native Document AI tables → canonical grid with correct shape", () => {
  const tables = extractDocaiTables(budgetFixture());
  assert.equal(tables.length, 1);
  const t = tables[0];
  assert.equal(t.source, "docai_tables");
  assert.equal(t.page, 44);
  assert.equal(t.n_rows, 3);
  assert.equal(t.n_cols, 2);
  assert.equal(t.total_cells, 6);
  assert.ok(t.mean_cell_confidence! > 0.9);
});

test("label↔amount pairing comes from the CELL grid, not OCR order", () => {
  const t = extractDocaiTables(budgetFixture())[0];
  // body row 1 (index 1): label in col 0, amount in col 1 — on the SAME row.
  const row1 = t.rows[1].cells;
  assert.equal(row1.find((c) => c.column === 0)!.text, "מטה ורגולציה");
  assert.equal(row1.find((c) => c.column === 1)!.text, "269,586");
  const row2 = t.rows[2].cells;
  assert.equal(row2.find((c) => c.column === 0)!.text, "עידוד תעסוקת הורים");
  assert.equal(row2.find((c) => c.column === 1)!.text, "189,913");
});

test("tableToText keeps label and amount on the same line", () => {
  const t = extractDocaiTables(budgetFixture())[0];
  const txt = tableToText(t);
  const lines = txt.split("\n");
  assert.ok(lines.some((l) => l.includes("מטה ורגולציה") && l.includes("269,586")), "row 1 label+amount together");
  assert.ok(lines.some((l) => l.includes("עידוד תעסוקת הורים") && l.includes("189,913")), "row 2 label+amount together");
  // and NOT crossed
  assert.ok(!lines.some((l) => l.includes("מטה ורגולציה") && l.includes("189,913")), "no cross-pairing");
});

test("tableDetection summarises native tables", () => {
  const det = tableDetection(extractDocaiTables(budgetFixture()));
  assert.deepEqual(det, { table_detected: true, number_of_tables: 1, total_cells: 6, source: "docai_tables" });
  assert.deepEqual(tableDetection([]), { table_detected: false, number_of_tables: 0, total_cells: 0, source: "none" });
});

test("no native tables + no fallback ⇒ empty; fallback flag enables geometry", () => {
  const doc: DocaiDocument = { text: "x", pages: [{ pageNumber: 1, tables: [], tokens: [] }] };
  assert.equal(extractTables(doc).length, 0);
  assert.equal(extractTables(doc, { allowGeometryFallback: true }).length, 0); // no tokens ⇒ nothing to reconstruct
});

test("geometry fallback is gated by page numeric ratio (no spurious tables on prose)", () => {
  const mkTok = (t: string, x: number, y: number) => ({ layout: { textAnchor: { content: t }, confidence: 0.9, boundingPoly: { vertices: [{ x, y }, { x: x + 40, y }, { x: x + 40, y: y + 10 }, { x, y: y + 10 }] } } });
  const doc: DocaiDocument = {
    text: "",
    pages: [{
      pageNumber: 1, dimension: { width: 600, height: 800 }, tables: [],
      tokens: [mkTok("א", 500, 100), mkTok("ב", 200, 100), mkTok("ג", 500, 130), mkTok("ד", 200, 130), mkTok("ה", 500, 70), mkTok("ו", 200, 70)],
    }],
  };
  // numeric-poor page (prose/colophon) ⇒ NO geometry table
  assert.equal(extractTables(doc, { allowGeometryFallback: true, pageNumericRatio: 0.1 }).length, 0);
  // numeric-heavy page (budget table) ⇒ geometry table allowed
  assert.equal(extractTables(doc, { allowGeometryFallback: true, pageNumericRatio: 0.5 }).length, 1);
});

test("geometry fallback reconstructs a grid from token bboxes (uncertain)", () => {
  // Two rows × two columns of tokens by coordinates (RTL: higher x = col 0).
  const mkTok = (t: string, x: number, y: number) => ({ layout: { textAnchor: { content: t }, confidence: 0.8, boundingPoly: { vertices: [{ x, y }, { x: x + 40, y }, { x: x + 40, y: y + 10 }, { x, y: y + 10 }] } } });
  const doc: DocaiDocument = {
    text: "",
    pages: [{
      pageNumber: 1, dimension: { width: 600, height: 800 },
      tables: [],
      tokens: [
        mkTok("מטה", 500, 100), mkTok("269586", 200, 100),
        mkTok("עידוד", 500, 130), mkTok("189913", 200, 130),
        mkTok("סעיף", 500, 70), mkTok("סכום", 200, 70),
      ],
    }],
  };
  const tables = reconstructTablesFromTokens(doc);
  assert.equal(tables.length, 1);
  assert.equal(tables[0].source, "geometry_reconstructed");
  assert.ok(tables[0].n_rows >= 2 && tables[0].n_cols >= 2, "coarse grid recovered");
});

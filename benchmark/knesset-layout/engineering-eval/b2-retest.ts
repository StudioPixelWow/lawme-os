/**
 * LAW ME — Path-B2 retest + table verification over the SAME 10-page residual
 * cohort (founder Epic §13–§14). Consumes the enriched google-docai outputs
 * (text + structured layout) and produces:
 *   report/b2-retest.json            — per-page final B2 status (accept/review/fail)
 *   report/b2-table-verification.json — bench-060/061 table proof (rows/cells,
 *                                       label↔amount pairs from cell grid)
 *
 * Deterministic and offline: it re-derives tables from each record's persisted
 * `layout` (Document AI structure) via the same shared modules the pipeline
 * uses. Works on legacy text-only records too (it will report that structured
 * layout is absent and that eng-google must be re-run to capture tables).
 * published=0; proxy engineering evidence, not human-certified accuracy.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { extractTables, tableDetection, tableToText, type DocaiDocument, type CanonicalTable } from "./b2-tables.ts";
import { classifyPage, assessTables, decideB2, numericRatio, producedBreakdown, type B2PageSignals, type PageClassification } from "./b2-quality.ts";
import { stripSpace } from "./eng-metrics.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const OUT = `${EVAL}/outputs/google-docai`;
const RESIDUAL = (process.env.B2_IDS ?? "bench-022,bench-023,bench-060,bench-061,bench-101,bench-102,bench-104,bench-105,bench-107,bench-108").split(",").map((s) => s.trim());
const TABLE_PAGES = (process.env.B2_TABLE_IDS ?? "bench-060,bench-061").split(",").map((s) => s.trim());
const ALLOW_GEOMETRY = (process.env.B2_TABLE_GEOMETRY_FALLBACK ?? "true") !== "false";

const readJson = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

// Expected final status per §13 (tables may be accepted OR needs_review
// depending on whether the processor emits native table structure).
const EXPECTED: Record<string, "accepted" | "needs_review" | "table_or_review"> = {
  "bench-022": "accepted", "bench-023": "accepted", "bench-102": "accepted", "bench-105": "accepted", "bench-108": "accepted",
  "bench-060": "table_or_review", "bench-061": "table_or_review",
  "bench-101": "needs_review", "bench-104": "needs_review", "bench-107": "needs_review",
};

interface RetestRow {
  id: string; present: boolean; structured_layout: boolean;
  char_count: number; mean_confidence: number;
  table_detected: boolean; number_of_tables: number; total_cells: number; table_source: string;
  state: string; decision: string; reason_codes: string[];
  expected: string; matches_expected: boolean;
}

function tablesFor(rec: any): CanonicalTable[] {
  if (rec?.layout && Array.isArray(rec.layout.pages) && rec.layout.pages.length) {
    return extractTables(rec.layout as DocaiDocument, { allowGeometryFallback: ALLOW_GEOMETRY, pageNumericRatio: numericRatio(rec?.text ?? "") });
  }
  if (Array.isArray(rec?.tables)) return rec.tables as CanonicalTable[]; // pre-computed
  return [];
}

function classify(rec: any, tables: CanonicalTable[]): { cls: PageClassification; decision: string } {
  const text: string = rec?.text ?? "";
  const sig: B2PageSignals = {
    char_count: stripSpace(text).length, token_count: rec?.token_count, line_count: rec?.line_count, block_count: rec?.block_count,
    mean_confidence: typeof rec?.mean_confidence === "number" ? rec.mean_confidence : 0, ocr_error: !!rec?.ocr_error, image_decoded: !rec?.ocr_error,
  };
  const cls = classifyPage(sig);
  const tbl = assessTables(tables, { numeric_ratio: numericRatio(text), has_flattened_text: stripSpace(text).length > 0 });
  return { cls, decision: decideB2(cls, tbl).decision };
}

function matches(expected: string, decision: string): boolean {
  if (expected === "table_or_review") return decision === "accepted" || decision === "needs_review";
  return decision === expected;
}

const rows: RetestRow[] = [];
const classes: PageClassification[] = [];
let anyStructured = false;

for (const id of RESIDUAL) {
  const rec = readJson(`${OUT}/${id}.json`);
  if (!rec) {
    rows.push({ id, present: false, structured_layout: false, char_count: 0, mean_confidence: 0, table_detected: false, number_of_tables: 0, total_cells: 0, table_source: "none", state: "MISSING", decision: "MISSING", reason_codes: [], expected: EXPECTED[id] ?? "?", matches_expected: false });
    continue;
  }
  const tables = tablesFor(rec);
  const det = tableDetection(tables);
  const structured = !!(rec.layout && Array.isArray(rec.layout.pages) && rec.layout.pages.length);
  anyStructured = anyStructured || structured;
  const { cls, decision } = classify(rec, tables);
  classes.push(cls);
  rows.push({
    id, present: true, structured_layout: structured,
    char_count: stripSpace(rec.text ?? "").length, mean_confidence: typeof rec.mean_confidence === "number" ? rec.mean_confidence : 0,
    table_detected: det.table_detected, number_of_tables: det.number_of_tables, total_cells: det.total_cells, table_source: det.source,
    state: cls.state, decision, reason_codes: cls.reason_codes,
    expected: EXPECTED[id] ?? "?", matches_expected: matches(EXPECTED[id] ?? "?", decision),
  });
}

const breakdown = producedBreakdown(classes);
const retest = {
  kind: "B2-RETEST (same 10-page residual cohort; engineering/proxy — not human accuracy)",
  cohort: RESIDUAL,
  structured_layout_present: anyStructured,
  note: anyStructured ? "Structured Document AI layout present — table extraction active." : "NO structured layout in outputs — re-run eng-google.ts (enriched) to capture Document AI tables/tokens. Classification/decision still computed from text+confidence.",
  produced_breakdown: breakdown,
  decisions: {
    accepted: rows.filter((r) => r.decision === "accepted").length,
    needs_review: rows.filter((r) => r.decision === "needs_review").length,
    failed: rows.filter((r) => r.decision === "failed").length,
  },
  all_match_expected: rows.every((r) => r.matches_expected),
  pages: rows,
  published: 0,
};
mkdirSync(`${EVAL}/report`, { recursive: true });
writeFileSync(`${EVAL}/report/b2-retest.json`, JSON.stringify(retest, null, 2));

// ---- Table verification (§14) ----------------------------------------------
interface CellProof { row: number; column: number; text: string; confidence: number | null }
const verification = {
  kind: "B2-TABLE-VERIFICATION (label↔amount relationship from Document AI cell grid; not human-certified)",
  structured_layout_present: anyStructured,
  pages: TABLE_PAGES.map((id) => {
    const rec = readJson(`${OUT}/${id}.json`);
    if (!rec) return { id, present: false };
    const tables = tablesFor(rec);
    return {
      id, present: true, structured_layout: !!(rec.layout && rec.layout.pages?.length),
      number_of_tables: tables.length,
      tables: tables.map((t) => ({
        table_index: t.table_index, source: t.source, rows: t.n_rows, columns: t.n_cols, cells: t.total_cells,
        mean_cell_confidence: t.mean_cell_confidence,
        sample_rows: t.rows.slice(0, 6).map((r) => (r.cells as CellProof[]).map((c) => ({ row: c.row, column: c.column, text: c.text, confidence: c.confidence }))),
        table_text: tableToText(t),
      })),
      relationship_preserved: tables.some((t) => t.total_cells > 0 && t.n_cols >= 2),
      caveat: tables.length === 0
        ? "No table structure available from this processor for this page — a mostly-numeric page with only flattened text is routed to needs_review (B2_TABLE_STRUCTURE_UNCERTAIN), NOT accepted."
        : tables[0].source === "geometry_reconstructed"
          ? "Table reconstructed from token geometry (no native Document AI tables) — routed to needs_review; enable a Form/Layout parser for native cells."
          : "Native Document AI table cells used.",
    };
  }),
  published: 0,
};
writeFileSync(`${EVAL}/report/b2-table-verification.json`, JSON.stringify(verification, null, 2));

process.stdout.write(
  `B2 retest — ${rows.filter((r) => r.present).length}/${RESIDUAL.length} pages present · ` +
  `accepted ${retest.decisions.accepted} · needs_review ${retest.decisions.needs_review} · failed ${retest.decisions.failed}\n` +
  `structured layout: ${anyStructured ? "yes" : "NO (re-run enriched eng-google)"} · all match expected: ${retest.all_match_expected}\n` +
  rows.map((r) => `  ${r.id}: ${r.decision}${r.reason_codes.length ? " [" + r.reason_codes.join(",") + "]" : ""}${r.matches_expected ? "" : " (≠expected " + r.expected + ")"}`).join("\n") + "\n" +
  `reports → ${EVAL}/report/b2-retest.json , b2-table-verification.json\n`,
);

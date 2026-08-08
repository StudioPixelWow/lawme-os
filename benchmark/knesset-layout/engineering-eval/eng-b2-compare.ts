/**
 * ENGINEERING EVAL — Path B2 comparison + provider DECISION.
 *
 *   node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-b2-compare.ts
 *
 * Founder Epic §2: Azure is OPTIONAL_BENCHMARK, NOT a required adoption gate.
 * The decision may become GOOGLE_APPROVED on Google-only evidence when the B2
 * quality gates pass and the table/sparse safeguards are implemented — no second
 * cloud provider is required. Azure support is preserved for later head-to-head
 * benchmarking; it simply is not on the blocking critical path.
 *
 * Metrics are engineering / PROXY signals — never human-certified accuracy.
 * Tesseract is reported for reference but is fallback-only. published=0.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { hebrewShare, folioDetected, stripSpace } from "./eng-metrics.ts";
import {
  classifyPage, assessTables, decideB2, semanticDuplication, numericRatio, producedBreakdown,
  type B2PageSignals, type PageClassification,
} from "./b2-quality.ts";
import { extractTables, tableDetection, type DocaiDocument, type CanonicalTable } from "./b2-tables.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const readJson = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

const RESIDUAL = (process.env.B2_IDS ?? "bench-022,bench-023,bench-060,bench-061,bench-101,bench-102,bench-104,bench-105,bench-107,bench-108").split(",").map((s) => s.trim());
const CLOUD = new Set(["azure-di", "google-docai"]);
const PRIMARY = "google-docai";
const ALLOW_GEOMETRY = (process.env.B2_TABLE_GEOMETRY_FALLBACK ?? "true") !== "false";
const COST_PER_1K: Record<string, number> = JSON.parse(process.env.COST_JSON ?? '{"azure-di":1.5,"google-docai":1.5,"tesseract-heb":0}');

const providers = existsSync(`${EVAL}/outputs`) ? readdirSync(`${EVAL}/outputs`).filter((d) => existsSync(`${EVAL}/outputs/${d}`)) : [];

const sectionCount = (t: string) => (t.match(/(?:^|\n|\s)\d{1,3}\s*\./g) ?? []).length;

function tablesFor(rec: any): CanonicalTable[] {
  if (rec?.layout && Array.isArray(rec.layout.pages) && rec.layout.pages.length) return extractTables(rec.layout as DocaiDocument, { allowGeometryFallback: ALLOW_GEOMETRY, pageNumericRatio: numericRatio(rec?.text ?? "") });
  if (Array.isArray(rec?.tables)) return rec.tables as CanonicalTable[];
  return [];
}
function pageClass(rec: any): PageClassification {
  const text: string = rec?.text ?? "";
  const sig: B2PageSignals = {
    char_count: stripSpace(text).length, token_count: rec?.token_count, line_count: rec?.line_count, block_count: rec?.block_count,
    mean_confidence: typeof rec?.mean_confidence === "number" ? rec.mean_confidence : 0, ocr_error: !!rec?.ocr_error, image_decoded: !rec?.ocr_error,
  };
  return classifyPage(sig);
}
function pageDecision(rec: any, tables: CanonicalTable[]): string {
  const cls = pageClass(rec);
  const text: string = rec?.text ?? "";
  const tbl = assessTables(tables, { numeric_ratio: numericRatio(text), has_flattened_text: stripSpace(text).length > 0 });
  return decideB2(cls, tbl).decision;
}

interface PMetric {
  provider: string; pages: number;
  hebrew_share: number; semantic_duplication: number; section_markers: number; folio_rate: number;
  mean_latency_ms: number | null; cost_per_1k: number;
  produced: ReturnType<typeof producedBreakdown>;
  decisions: { accepted: number; needs_review: number; failed: number };
  table_pages: number; total_table_cells: number;
  structured_layout: boolean;
}
const perProvider: PMetric[] = [];
for (const provider of providers) {
  const rows = RESIDUAL.map((id) => readJson(`${EVAL}/outputs/${provider}/${id}.json`)).filter(Boolean);
  if (!rows.length) continue;
  const texts = rows.map((r: any) => r.text ?? "");
  const lat = rows.map((r: any) => r.latency_ms).filter((x: any) => typeof x === "number");
  const classes: PageClassification[] = [];
  const decisions = { accepted: 0, needs_review: 0, failed: 0 };
  let tablePages = 0, tableCells = 0, structured = false;
  for (const r of rows as any[]) {
    const tables = tablesFor(r);
    if (r.layout?.pages?.length) structured = true;
    const det = tableDetection(tables);
    if (det.table_detected) { tablePages++; tableCells += det.total_cells; }
    classes.push(pageClass(r));
    const d = pageDecision(r, tables);
    (decisions as any)[d] = ((decisions as any)[d] ?? 0) + 1;
  }
  perProvider.push({
    provider, pages: rows.length,
    hebrew_share: +(100 * texts.reduce((a, t) => a + hebrewShare(t), 0) / texts.length).toFixed(2),
    semantic_duplication: +(100 * texts.reduce((a, t) => a + semanticDuplication(t), 0) / texts.length).toFixed(2),
    section_markers: +(texts.reduce((a, t) => a + sectionCount(t), 0) / texts.length).toFixed(2),
    folio_rate: +(100 * texts.filter((t) => folioDetected(t)).length / texts.length).toFixed(2),
    mean_latency_ms: lat.length ? Math.round(lat.reduce((a: number, b: number) => a + b, 0) / lat.length) : null,
    cost_per_1k: COST_PER_1K[provider] ?? -1,
    produced: producedBreakdown(classes),
    decisions, table_pages: tablePages, total_table_cells: tableCells, structured_layout: structured,
  });
}

// ---- Provider decision (§2, §12) -------------------------------------------
const google = perProvider.find((p) => p.provider === PRIMARY);
const azurePresent = perProvider.some((p) => p.provider === "azure-di");
const googleRows = RESIDUAL.map((id) => readJson(`${EVAL}/outputs/${PRIMARY}/${id}.json`)).filter(Boolean) as any[];

const google_eval_exists = !!google && google.pages > 0;
// Safeguards implemented = records carry the structured verdict fields.
const safeguards_implemented = googleRows.length > 0 && googleRows.every((r) => r.classification && r.table_assessment && r.verdict);
// No critical integrity failure = nothing accepted that a gate flagged for review,
// and at least one genuine content page was produced.
const content_pages = google?.produced.pages_with_text ?? 0;
const bad_accept = googleRows.some((r) => r.verdict?.decision === "accepted" && ["sparse", "likely_blank", "ocr_failed"].includes(r.classification?.state));
const no_critical_integrity_failure = content_pages > 0 && !bad_accept;
const quality_gates_pass = safeguards_implemented && no_critical_integrity_failure;

let status: string;
if (!google_eval_exists) status = "NO_GOOGLE_EVAL";
else if (quality_gates_pass) status = "GOOGLE_APPROVED";
else status = "PENDING_QUALITY";

const provider_decision = {
  provider: PRIMARY,
  status,
  azure_required: false,
  azure_role: "OPTIONAL_BENCHMARK",
  criteria: { google_eval_exists, safeguards_implemented, quality_gates_pass, no_critical_integrity_failure, content_pages },
  note: status === "GOOGLE_APPROVED"
    ? "Google Document AI approved as Path-B2 provider with required guards (table-aware extraction + sparse/empty review routing). Azure is optional benchmarking only."
    : status === "PENDING_QUALITY"
      ? "Google evaluation present but quality gates not satisfied (see criteria). Not a provider selection failure — safeguards or content missing."
      : "No Google evaluation found; run eng-google.ts on the residual set first.",
};

// Optional head-to-head (only if Azure was benchmarked).
const cloudPresent = perProvider.filter((p) => CLOUD.has(p.provider)).map((p) => p.provider);
const head_to_head = azurePresent && cloudPresent.length >= 2
  ? { available: true, providers: cloudPresent, note: "Azure present — optional head-to-head recorded for reference; not required for adoption." }
  : { available: false, note: "Azure not benchmarked (OPTIONAL). Google adoption does not require it." };

const report = {
  kind: "B2-COMPARISON + DECISION (engineering / proxy — not human accuracy)",
  residual_pages: RESIDUAL, providers_present: providers,
  per_provider: perProvider,
  provider_decision,
  azure: { role: "OPTIONAL_BENCHMARK", required_for_adoption: false, support_retained: true },
  head_to_head,
  cost_note: "cost_per_1k is published list pricing, not a quote; override with COST_JSON.",
  metric_notes: {
    hebrew_share: "diagnostic only — NOT a hard gate; bilingual (Hebrew+Latin) pages legitimately score lower.",
    duplication: "semantic bigram duplication AFTER removing structural dot-leaders/rules; canonical OCR text is never altered.",
    produced_text: "reported as pages_with_text / likely_blank_or_sparse / ocr_failed / needs_review — expected blanks are NOT counted as OCR failures.",
  },
  published: 0,
};
mkdirSync(`${EVAL}/report`, { recursive: true });
writeFileSync(`${EVAL}/report/b2-comparison.json`, JSON.stringify(report, null, 2));

process.stdout.write(
  `B2 comparison (${RESIDUAL.length} residual pages) — providers: ${providers.join(", ") || "none"}\n` +
  perProvider.map((p) => `  ${p.provider}: heb ${p.hebrew_share}% · dup(sem) ${p.semantic_duplication}% · accepted ${p.decisions.accepted}/${p.pages} · review ${p.decisions.needs_review} · failed ${p.decisions.failed} · tables ${p.table_pages}p/${p.total_table_cells}c · latency ${p.mean_latency_ms ?? "n/a"}ms`).join("\n") + "\n" +
  `DECISION: ${provider_decision.status} (${PRIMARY}) · Azure=${provider_decision.azure_role} · gates_pass=${quality_gates_pass}\n` +
  `report → ${EVAL}/report/b2-comparison.json\n`,
);

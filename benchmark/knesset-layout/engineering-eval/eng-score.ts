/**
 * ENGINEERING EVAL — scorer. Computes AUTOMATIC/PROXY engineering metrics for
 * every engine present under outputs/, against the objective PDF-text-layer
 * reference + intrinsic signals, aggregated overall and per stratum.
 *
 *   node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-score.ts
 *
 * These are NOT human-ground-truth accuracy and NOT certification (founder rule
 * #6). They drive engineering (engine choice, F1/F2/F3). published=0.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { scorePage, aggregate, glyphs, glyphTotal, type PageMetrics } from "./eng-metrics.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as {
  entries: { id: string; publication_item_id: string; page_number: number; stratum_tentative: string; source_url: string }[];
};
const stratumOf = new Map(manifest.entries.map((e) => [e.id, e.stratum_tentative]));
const readJson = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

const engines = existsSync(`${EVAL}/outputs`) ? readdirSync(`${EVAL}/outputs`).filter((d) => existsSync(`${EVAL}/outputs/${d}`)) : [];
if (!engines.length) { process.stderr.write("no engine outputs found under engineering-eval/outputs/. Run eng-extract.ts (+ candidates) first.\n"); process.exit(2); }

const perEngine: Record<string, { overall: unknown; by_stratum: Record<string, unknown>; rows: PageMetrics[] }> = {};
for (const engine of engines) {
  const rows: PageMetrics[] = [];
  for (const e of manifest.entries) {
    const ref = readJson(`${EVAL}/reference/${e.id}.json`);
    const out = readJson(`${EVAL}/outputs/${engine}/${e.id}.json`);
    if (!ref) continue;
    rows.push(scorePage({
      id: e.id, engine, stratum: e.stratum_tentative,
      reference: { text: ref.text ?? "", has_text_layer: !!ref.has_text_layer },
      output: { text: out?.text ?? "", sections: out?.section_boundaries ?? [], captions: out?.marginal_captions ?? [], unresolved: out?.unresolved ?? (out ? false : true) },
    }));
  }
  const strata = [...new Set(rows.map((r) => r.stratum))].sort();
  perEngine[engine] = {
    overall: aggregate(rows),
    by_stratum: Object.fromEntries(strata.map((s) => [s, aggregate(rows.filter((r) => r.stratum === s))])),
    rows,
  };
}

// Cross-engine triangulation (neither is truth): glyph-multiset Jaccard between
// layout-2 and tesseract-heb on pages with a reliable reference.
function jaccard(a: string, b: string): number {
  const A = glyphs(a), B = glyphs(b); let inter = 0;
  for (const [c, n] of A) inter += Math.min(n, B.get(c) ?? 0);
  const uni = glyphTotal(A) + glyphTotal(B) - inter;
  return uni ? inter / uni : 1;
}
let crossAgreement: number | null = null;
if (engines.includes("layout-2") && engines.includes("tesseract-heb")) {
  const vals: number[] = [];
  for (const e of manifest.entries) {
    const ref = readJson(`${EVAL}/reference/${e.id}.json`);
    if (!ref?.has_text_layer || (ref.hebrew_share ?? 0) < 0.6) continue;
    const a = readJson(`${EVAL}/outputs/layout-2/${e.id}.json`);
    const b = readJson(`${EVAL}/outputs/tesseract-heb/${e.id}.json`);
    if (a && b) vals.push(jaccard(a.text ?? "", b.text ?? ""));
  }
  crossAgreement = vals.length ? +(100 * vals.reduce((x, y) => x + y, 0) / vals.length).toFixed(2) : null;
}

// Failure-class census (engineering, not certification).
const refRows = perEngine[engines[0]].rows;
const noTextLayer = refRows.filter((r) => !r.has_text_layer).map((r) => r.id);
const garbled = refRows.filter((r) => r.has_text_layer && !r.reference_reliable).map((r) => r.id);
const l2 = perEngine["layout-2"]?.rows ?? [];
const l2Unresolved = l2.filter((r) => r.unresolved).map((r) => r.id);
const l2LowHeb = l2.filter((r) => r.hebrew_share < 0.6 && r.engine_chars > 20).map((r) => r.id);

const report = {
  path: "Founder-Approved Engineering Evaluation (SEPARATE from the strict human-ground-truth benchmark)",
  disclaimer: "AUTOMATIC / PROXY engineering metrics measured against the PDF's OWN embedded text layer (order-independent glyph oracle) plus intrinsic signals. These are NOT human-ground-truth accuracy and NOT certification of correctness. The strict 108-page benchmark is preserved unchanged for future independent human annotation. published=0.",
  engines,
  reference_summary: {
    pages: refRows.length,
    no_text_layer_pages: noTextLayer.length,
    garbled_text_layer_pages: garbled.length,
    note: "no_text_layer ⇒ scanned/image page, OCR-only, NO objective text reference (needs human certification). garbled_text_layer ⇒ embedded text is corrupt (F2 glyph); glyph-loss vs it is not meaningful and OCR may legitimately differ.",
  },
  per_engine: Object.fromEntries(Object.entries(perEngine).map(([k, v]) => [k, { overall: v.overall, by_stratum: v.by_stratum }])),
  cross_engine: { layout2_vs_tesseract_glyph_jaccard_pct: crossAgreement, note: "agreement on clean text-layer pages; high ⇒ both engines converge (triangulation), low ⇒ investigate. Neither engine is ground truth." },
  failure_classes: {
    no_text_layer_scanned: noTextLayer,
    garbled_embedded_text_F2: garbled,
    layout2_unresolved_reading_order_F1: l2Unresolved,
    layout2_low_hebrew_share_F2: l2LowHeb,
  },
  published: 0,
};

mkdirSync(`${EVAL}/report`, { recursive: true });
writeFileSync(`${EVAL}/report/eng-eval-report.json`, JSON.stringify(report, null, 2));

// Markdown summary
const md: string[] = [];
md.push(`# Engineering Evaluation — candidate comparison (AUTOMATIC/PROXY metrics)`);
md.push(``, `> **Not human-ground-truth accuracy. Not certification.** Metrics are vs the PDF's own text layer (order-independent glyph oracle) + intrinsic signals. The strict human benchmark is preserved unchanged. \`published = 0\`.`, ``);
md.push(`Reference: ${refRows.length} pages · ${noTextLayer.length} scanned/no-text-layer · ${garbled.length} garbled embedded text (F2).`, ``);
md.push(`Cross-engine glyph agreement (layout-2 vs tesseract-heb, clean pages): **${crossAgreement ?? "n/a"}%**`, ``);
for (const [engine, v] of Object.entries(perEngine)) {
  const o = v.overall as Record<string, unknown>;
  md.push(`## ${engine}`);
  md.push(``, `| metric | value |`, `|---|---|`);
  for (const [k, val] of Object.entries(o)) md.push(`| ${k} | ${val ?? "n/a"} |`);
  md.push(``, `### per stratum`, ``, `| stratum | pages | reliable-ref | text-loss% | dup% | heb% | false-sep% | unresolved% | failure% |`, `|---|---|---|---|---|---|---|---|---|`);
  for (const [s, a] of Object.entries(v.by_stratum as Record<string, Record<string, unknown>>)) {
    md.push(`| ${s} | ${a.pages} | ${a.pages_with_reliable_reference} | ${a.mean_text_loss_pct ?? "n/a"} | ${a.mean_duplication_pct ?? "n/a"} | ${a.mean_hebrew_share ?? "n/a"} | ${a.mean_false_separation_pct ?? "n/a"} | ${a.unresolved_rate_pct ?? "n/a"} | ${a.failure_rate_pct ?? "n/a"} |`);
  }
  md.push(``);
}
md.push(`## Failure classes`, ``);
md.push(`- **Scanned / no text layer** (OCR-only, needs human cert): ${noTextLayer.length} — ${noTextLayer.join(", ") || "none"}`);
md.push(`- **Garbled embedded text (F2 glyph)**: ${garbled.length} — ${garbled.join(", ") || "none"}`);
md.push(`- **layout-2 unresolved reading order (F1)**: ${l2Unresolved.length} — ${l2Unresolved.join(", ") || "none"}`);
md.push(`- **layout-2 low Hebrew share (F2 inherited)**: ${l2LowHeb.length} — ${l2LowHeb.join(", ") || "none"}`);
writeFileSync(`${EVAL}/report/eng-eval-summary.md`, md.join("\n"));

process.stdout.write(
  `scored engines: ${engines.join(", ")}\n` +
  `reference: ${refRows.length} pages · no-text-layer ${noTextLayer.length} · garbled ${garbled.length}\n` +
  Object.entries(perEngine).map(([k, v]) => { const o = v.overall as Record<string, unknown>; return `  ${k}: loss ${o.mean_text_loss_pct ?? "n/a"}% · dup ${o.mean_duplication_pct ?? "n/a"}% · heb ${o.mean_hebrew_share}% · unresolved ${o.unresolved_rate_pct}% · failure ${o.failure_rate_pct}%`; }).join("\n") + "\n" +
  `cross-engine glyph agreement: ${crossAgreement ?? "n/a"}%\n` +
  `report → ${EVAL}/report/eng-eval-report.json + eng-eval-summary.md\n`,
);

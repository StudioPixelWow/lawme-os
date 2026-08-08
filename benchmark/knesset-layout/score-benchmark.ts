/**
 * Phase 2 — benchmark SCORER (built now, but SELF-GATED: it refuses to run until
 * FROZEN-v1.json exists, i.e. until the human ground truth is frozen). It never
 * touches or generates ground truth; it only compares an engine's per-page output
 * to the frozen human ground truth and reports human-anchored metrics.
 *
 *   node --experimental-strip-types benchmark/knesset-layout/score-benchmark.ts <engine-name> <engine-output-dir>
 *
 * <engine-output-dir> holds one <id>.json per benchmark page with at least:
 *   { reading_order_text, marginal_captions?, section_boundaries?, regions? }
 * Engines: layout-2 (deterministic), and each candidate (tesseract-heb, azure,
 * surya, …). Run the scorer once per engine; compare the reports.
 *
 * Reported per engine, per stratum, and overall:
 *   reading_order_accuracy      1 - normalized word-level edit distance vs GT
 *   text_loss_rate              GT chars absent from engine output (per page > 0 => loss)
 *   duplicated_text_rate        engine chars beyond GT (spurious duplication)
 *   caption_body_accuracy       caption set match (engine vs GT marginal_captions)
 *   section_boundary_accuracy   ordered section-number match
 *   hebrew_char_fidelity        Hebrew-only char accuracy vs GT
 *   citation_alignment          printed/gazette page label match (if GT provides)
 * GO thresholds are applied to the HUMAN-anchored scores, never a proxy.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";

const DIR = "benchmark/knesset-layout";
const FROZEN = `${DIR}/FROZEN-v1.json`;
if (!existsSync(FROZEN)) { process.stderr.write("REFUSING TO RUN: FROZEN-v1.json does not exist. Freeze the human ground truth first (Phase 1). No Phase 2 evaluation before freeze.\n"); process.exit(3); }

const engine = process.argv[2];
const outDir = process.argv[3];
if (!engine || !outDir) { process.stderr.write("usage: score-benchmark.ts <engine-name> <engine-output-dir>\n"); process.exit(2); }

const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as { entries: { id: string; stratum_tentative: string }[] };
const frozen = JSON.parse(readFileSync(FROZEN, "utf8")) as { ground_truth_sha256: Record<string, string> };

const norm = (t: string) => (t ?? "").replace(/\s+/g, " ").trim();
const words = (t: string) => norm(t).split(" ").filter(Boolean);
const hebrew = (t: string) => (t.match(/[֐-׿]/g) ?? []).join("");
const charCount = (t: string) => { const m = new Map<string, number>(); for (const c of (t ?? "").replace(/\s/g, "")) m.set(c, (m.get(c) ?? 0) + 1); return m; };

/** Word-level Levenshtein (bounded) → similarity 0..1. */
function wordSim(a: string, b: string): number {
  const A = words(a), B = words(b);
  if (!A.length && !B.length) return 1;
  const n = A.length, m = B.length;
  const dp = new Array(m + 1); for (let j = 0; j <= m; j++) dp[j] = j;
  for (let i = 1; i <= n; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= m; j++) { const tmp = dp[j]; dp[j] = A[i - 1] === B[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]); prev = tmp; }
  }
  return 1 - dp[m] / Math.max(n, m);
}
function missingChars(gt: string, out: string): number { const o = charCount(out); let miss = 0; for (const [c, n] of charCount(gt)) miss += Math.max(0, n - (o.get(c) ?? 0)); return miss; }
function extraChars(gt: string, out: string): number { const g = charCount(gt); let ex = 0; for (const [c, n] of charCount(out)) ex += Math.max(0, n - (g.get(c) ?? 0)); return ex; }
const setEq = (a: string[], b: string[]) => { const A = new Set(a.map(norm)), B = new Set(b.map(norm)); let inter = 0; for (const x of A) if (B.has(x)) inter++; const uni = new Set([...A, ...B]).size; return uni ? inter / uni : 1; };
const orderedMatch = (a: string[], b: string[]) => { const n = Math.max(a.length, b.length); if (!n) return 1; let ok = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (norm(a[i]) === norm(b[i])) ok++; return ok / n; };

interface Row { id: string; stratum: string; ro: number; loss: number; dup: number; cap: number; sec: number; heb: number; cite: number; gtUnresolved: boolean; }
const rows: Row[] = [];
for (const e of manifest.entries) {
  const gt = JSON.parse(readFileSync(`${DIR}/ground-truth/${e.id}.json`, "utf8"));
  const outPath = `${outDir}/${e.id}.json`;
  const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : { reading_order_text: "", marginal_captions: [], section_boundaries: [] };
  const stratum = gt.confirmed_stratum || e.stratum_tentative;
  if (gt.state === "UNRESOLVED") { rows.push({ id: e.id, stratum, ro: NaN, loss: NaN, dup: NaN, cap: NaN, sec: NaN, heb: NaN, cite: NaN, gtUnresolved: true }); continue; }
  const gtText = gt.reading_order_text ?? "", outText = out.reading_order_text ?? "";
  const gtChars = gtText.replace(/\s/g, "").length || 1;
  rows.push({
    id: e.id, stratum, gtUnresolved: false,
    ro: wordSim(gtText, outText),
    loss: missingChars(gtText, outText) / gtChars,
    dup: extraChars(gtText, outText) / gtChars,
    cap: setEq(gt.marginal_captions ?? [], out.marginal_captions ?? []),
    sec: orderedMatch(gt.section_boundaries ?? [], out.section_boundaries ?? []),
    heb: wordSim(hebrew(gtText), hebrew(outText)),
    cite: (() => { const g = gt.page_alignment ?? {}; const o = out.page_alignment ?? {}; if (!g.printed_page_label && !g.gazette_page) return NaN; return (norm(g.printed_page_label ?? "") === norm(o.printed_page_label ?? "") ? 0.5 : 0) + (norm(g.gazette_page ?? "") === norm(o.gazette_page ?? "") ? 0.5 : 0); })(),
  });
}

const scored = rows.filter((r) => !r.gtUnresolved);
const avg = (xs: number[]) => { const v = xs.filter((x) => !Number.isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
const pct = (x: number) => Number.isNaN(x) ? "n/a" : (x * 100).toFixed(1) + "%";
const agg = (rs: Row[]) => ({ pages: rs.length, reading_order: pct(avg(rs.map((r) => r.ro))), text_loss_rate: pct(avg(rs.map((r) => r.loss))), duplicated_text_rate: pct(avg(rs.map((r) => r.dup))), caption_body: pct(avg(rs.map((r) => r.cap))), section_boundary: pct(avg(rs.map((r) => r.sec))), hebrew_fidelity: pct(avg(rs.map((r) => r.heb))), citation_alignment: pct(avg(rs.map((r) => r.cite))) });

const strata = [...new Set(scored.map((r) => r.stratum))].sort();
const report = {
  engine, benchmark: "knesset-layout v1 (frozen human ground truth)",
  scored_pages: scored.length, unresolved_gt_pages: rows.length - scored.length,
  overall: agg(scored),
  by_stratum: Object.fromEntries(strata.map((s) => [s, agg(scored.filter((r) => r.stratum === s))])),
  go_thresholds: { reading_order_ge: "99%", text_loss_rate_eq: "0%", caption_body_ge: "99%", section_boundary_ge: "99%", hebrew_fidelity_ge: "99%", citation_alignment_eq: "100%", note: "human-anchored; accuracy + citation integrity are primary gates" },
};
process.stdout.write(JSON.stringify(report, null, 2) + "\n");

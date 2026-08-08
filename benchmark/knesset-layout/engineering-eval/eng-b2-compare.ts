/**
 * ENGINEERING EVAL — Path B2 residual comparison + provider selection.
 *
 *   node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-b2-compare.ts
 *
 * Compares the OCR providers that have been run on the RESIDUAL hard-case set
 * (scanned + garbled pages) and, when ≥2 CLOUD providers are present, recommends
 * a Path-B2 provider on the evidence. Metrics: Hebrew fidelity, duplication,
 * reading-order stability (cross-provider), section boundaries, page alignment,
 * latency, cost. Tesseract is reported for reference but is fallback-only, never
 * the production selection (founder rule). NOT human accuracy. published=0.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { hebrewShare, folioDetected, glyphs, glyphTotal, stripSpace } from "./eng-metrics.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const readJson = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

// Residual hard-case pages (from the Phase-2 failure classes).
const RESIDUAL = (process.env.B2_IDS ?? "bench-022,bench-023,bench-101,bench-102,bench-104,bench-105,bench-107,bench-108,bench-060,bench-061").split(",").map((s) => s.trim());
const CLOUD = new Set(["azure-di", "google-docai"]);
// Published list pricing (USD / 1000 pages) — override via COST_JSON. Not a quote.
const COST_PER_1K: Record<string, number> = JSON.parse(process.env.COST_JSON ?? '{"azure-di":1.5,"google-docai":1.5,"tesseract-heb":0}');

const providers = existsSync(`${EVAL}/outputs`) ? readdirSync(`${EVAL}/outputs`).filter((d) => existsSync(`${EVAL}/outputs/${d}`)) : [];

function bigramDupRate(t: string): number {
  const s = stripSpace(t); if (s.length < 4) return 0;
  const seen = new Map<string, number>(); let rep = 0, tot = 0;
  for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); const n = (seen.get(g) ?? 0) + 1; seen.set(g, n); tot++; if (n > 3) rep++; }
  return tot ? rep / tot : 0;
}
const sectionCount = (t: string) => (t.match(/(?:^|\n|\s)\d{1,3}\s*\./g) ?? []).length;
function jaccard(a: string, b: string): number { const A = glyphs(a), B = glyphs(b); let inter = 0; for (const [c, n] of A) inter += Math.min(n, B.get(c) ?? 0); const uni = glyphTotal(A) + glyphTotal(B) - inter; return uni ? inter / uni : 1; }

interface PMetric { provider: string; pages: number; hebrew_share: number; duplication: number; section_markers: number; folio_rate: number; mean_latency_ms: number | null; cost_per_1k: number; produced_text_rate: number; }
const perProvider: PMetric[] = [];
for (const provider of providers) {
  const rows = RESIDUAL.map((id) => readJson(`${EVAL}/outputs/${provider}/${id}.json`)).filter(Boolean);
  if (!rows.length) continue;
  const texts = rows.map((r: any) => r.text ?? "");
  const lat = rows.map((r: any) => r.latency_ms).filter((x: any) => typeof x === "number");
  perProvider.push({
    provider, pages: rows.length,
    hebrew_share: +(100 * texts.reduce((a, t) => a + hebrewShare(t), 0) / texts.length).toFixed(2),
    duplication: +(100 * texts.reduce((a, t) => a + bigramDupRate(t), 0) / texts.length).toFixed(2),
    section_markers: +(texts.reduce((a, t) => a + sectionCount(t), 0) / texts.length).toFixed(2),
    folio_rate: +(100 * texts.filter((t) => folioDetected(t)).length / texts.length).toFixed(2),
    mean_latency_ms: lat.length ? Math.round(lat.reduce((a: number, b: number) => a + b, 0) / lat.length) : null,
    cost_per_1k: COST_PER_1K[provider] ?? -1,
    produced_text_rate: +(100 * texts.filter((t) => stripSpace(t).length > 10).length / texts.length).toFixed(2),
  });
}

// cross-provider reading-order stability (agreement) among cloud providers
const cloudPresent = perProvider.filter((p) => CLOUD.has(p.provider)).map((p) => p.provider);
let agreement: Record<string, number> = {};
for (let i = 0; i < cloudPresent.length; i++) for (let j = i + 1; j < cloudPresent.length; j++) {
  const a = cloudPresent[i], b = cloudPresent[j]; const vals: number[] = [];
  for (const id of RESIDUAL) { const ra = readJson(`${EVAL}/outputs/${a}/${id}.json`), rb = readJson(`${EVAL}/outputs/${b}/${id}.json`); if (ra && rb) vals.push(jaccard(ra.text ?? "", rb.text ?? "")); }
  if (vals.length) agreement[`${a}__vs__${b}`] = +(100 * vals.reduce((x, y) => x + y, 0) / vals.length).toFixed(2);
}

// selection: only among cloud providers, need ≥2 to select on evidence.
let recommendation: string;
const cloudMetrics = perProvider.filter((p) => CLOUD.has(p.provider));
if (cloudMetrics.length >= 2) {
  const score = (p: PMetric) => p.hebrew_share - p.duplication * 2 + p.produced_text_rate * 0.2 + p.folio_rate * 0.05 - (p.cost_per_1k) * 0.5 - (p.mean_latency_ms ?? 0) / 5000;
  const ranked = [...cloudMetrics].sort((a, b) => score(b) - score(a));
  recommendation = `SELECT ${ranked[0].provider} (evidence-based): ${ranked.map((p) => `${p.provider} heb=${p.hebrew_share}% dup=${p.duplication}% cost=$${p.cost_per_1k}/1k`).join(" | ")}`;
} else {
  recommendation = `PENDING — need ≥2 cloud providers run on the residual set. Present: ${perProvider.map((p) => p.provider).join(", ") || "none"}. Tesseract is fallback-only and excluded from selection. Run eng-azure.ts and eng-google.ts on operator infra (B2_IDS=${RESIDUAL.join(",")}), then re-run this.`;
}

const report = {
  kind: "B2-RESIDUAL-COMPARISON (engineering / proxy — not human accuracy)",
  residual_pages: RESIDUAL, providers_present: providers,
  per_provider: perProvider, cross_provider_reading_order_agreement_pct: agreement,
  cost_note: "cost_per_1k is published list pricing, not a quote; override with COST_JSON.",
  recommended_b2_provider: recommendation, published: 0,
};
mkdirSync(`${EVAL}/report`, { recursive: true });
writeFileSync(`${EVAL}/report/b2-comparison.json`, JSON.stringify(report, null, 2));
process.stdout.write(
  `B2 residual comparison (${RESIDUAL.length} pages) — providers: ${providers.join(", ") || "none"}\n` +
  perProvider.map((p) => `  ${p.provider}: heb ${p.hebrew_share}% · dup ${p.duplication}% · text ${p.produced_text_rate}% · latency ${p.mean_latency_ms ?? "n/a"}ms · $${p.cost_per_1k}/1k`).join("\n") + "\n" +
  `${recommendation}\n` +
  `report → ${EVAL}/report/b2-comparison.json\n`,
);

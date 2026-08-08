/**
 * ENGINEERING REGRESSION — run the production router over all 108 benchmark pages.
 *
 *   PDFS_DIR=<dir> node --experimental-strip-types \
 *     benchmark/knesset-layout/engineering-eval/run-router.ts
 *
 * Routes each page (A / B1 / B2), runs the Path-B1 layout-only order recovery on
 * unresolved pages (no OCR, glyph-preserving), and reports the routing
 * distribution + proxy metrics per stratum. B2 (OCR) pages are shown as
 * cloud-OCR-pending (Tesseract text used only as a labelled placeholder, never
 * production). Writes report/route-decisions.json (the persistable per-page
 * records) + report/router-regression.{json,md}. published=0.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { reconstructPage, type LayoutItem } from "../../../src/modules/legal-ai-israel/ingestion/legislation/publication/layout-reconstruct.ts";
import { recoverReadingOrder } from "../../../src/modules/legal-ai-israel/ingestion/legislation/publication/layout-order-v3.ts";
import { routePage, ROUTER_VERSION, DEFAULT_ROUTE_CONFIG, type RouteSignals } from "../../../src/modules/legal-ai-israel/ingestion/legislation/publication/extraction-router.ts";
import { glyphs, textLoss, duplication, hebrewShare, folioDetected, stripSpace } from "./eng-metrics.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const PDFS = process.env.PDFS_DIR ?? `${DIR}/pdfs`;
const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as {
  entries: { id: string; publication_item_id: string; page_number: number; stratum_tentative: string; source_url: string }[];
};
const readJson = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (d: Buffer, o?: { pagerender?: (p: unknown) => Promise<string> }) => Promise<{ numpages: number }>;

async function pageItems(pdf: Uint8Array, page: number): Promise<LayoutItem[]> {
  let cur = 0; let found: LayoutItem[] = [];
  await pdfParse(Buffer.from(pdf), { pagerender: async (pageData: unknown): Promise<string> => {
    cur += 1; if (cur !== page) return "";
    const pd = pageData as { getTextContent: (o?: unknown) => Promise<{ items: { str?: string; transform?: number[]; width?: number; height?: number; fontName?: string }[] }> };
    const tc = await pd.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    found = tc.items.filter((it) => it.str && it.transform).map((it) => ({ str: it.str!, x: it.transform![4], y: it.transform![5], width: it.width ?? (it.str!.length * (it.height ?? 6)), height: it.height, fontName: it.fontName }));
    return "";
  } });
  return found;
}

interface Row { id: string; stratum: string; route: string; reason: string; needs_review: boolean; final_text: string; ref_text: string; ref_reliable: boolean; }
const decisions: unknown[] = [];
const rows: Row[] = [];
const pdfCache = new Map<string, Uint8Array>();

for (const e of manifest.entries) {
  const ref = readJson(`${EVAL}/reference/${e.id}.json`) ?? { text: "", has_text_layer: false, hebrew_share: 0 };
  const l2 = readJson(`${EVAL}/outputs/layout-2/${e.id}.json`) ?? { unresolved: true, reading_order_text: "", columnType: "unknown" };
  const sig: RouteSignals = { has_text_layer: !!ref.has_text_layer, hebrew_share: ref.hebrew_share ?? 0, layout2_unresolved: !!l2.unresolved };

  let finalText = "";
  let b1Resolved: boolean | undefined;
  const pre = routePage(sig, DEFAULT_ROUTE_CONFIG);
  if (pre.route === "A") {
    finalText = l2.text ?? l2.reading_order_text ?? ""; // body + marginal captions (all glyphs)
  } else if (pre.route === "B1") {
    // Path B1: re-derive order on the SAME glyph stream (no OCR).
    const pdfPath = `${PDFS}/${e.publication_item_id}.pdf`;
    if (existsSync(pdfPath)) {
      let pdf = pdfCache.get(e.publication_item_id); if (!pdf) { pdf = new Uint8Array(readFileSync(pdfPath)); pdfCache.set(e.publication_item_id, pdf); }
      const items = await pageItems(pdf, e.page_number);
      // sanity: layout-2 could reconstruct glyphs; v3 re-orders them
      void reconstructPage; const rec = recoverReadingOrder(items);
      finalText = rec.reading_order_text; b1Resolved = rec.resolved && rec.lossless;
    } else { b1Resolved = false; }
  } else {
    // Path B2: cloud OCR pending; use tesseract placeholder ONLY for display.
    const ocr = readJson(`${EVAL}/outputs/tesseract-heb/${e.id}.json`);
    finalText = ocr?.text ?? "";
  }
  const decision = routePage({ ...sig, b1_resolved: b1Resolved }, DEFAULT_ROUTE_CONFIG);
  decisions.push({ id: e.id, publication_item_id: e.publication_item_id, page_number: e.page_number, source_url: e.source_url, stratum: e.stratum_tentative, ...decision });
  rows.push({ id: e.id, stratum: e.stratum_tentative, route: decision.route, reason: decision.route_reason, needs_review: decision.needs_review, final_text: finalText, ref_text: ref.text ?? "", ref_reliable: !!ref.has_text_layer && (ref.hebrew_share ?? 0) >= 0.6 });
}

function agg(rs: Row[]) {
  const A = rs.filter((r) => r.route === "A"), B1 = rs.filter((r) => r.route === "B1"), B2 = rs.filter((r) => r.route === "B2");
  const clean = rs.filter((r) => r.route !== "B2" && r.ref_reliable); // A + B1 with reliable reference
  const loss = clean.map((r) => textLoss(glyphs(r.ref_text), glyphs(r.final_text)));
  const dup = clean.map((r) => duplication(glyphs(r.ref_text), glyphs(r.final_text)));
  const heb = rs.filter((r) => stripSpace(r.final_text).length > 20).map((r) => hebrewShare(r.final_text));
  const folio = rs.map((r) => (folioDetected(r.final_text) ? 1 : 0));
  const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  const pct = (x: number | null) => x == null ? null : +(x * 100).toFixed(2);
  return {
    pages: rs.length,
    pct_path_A: pct(A.length / rs.length), pct_path_B1_layout_only: pct(B1.length / rs.length), pct_path_B2_ocr: pct(B2.length / rs.length),
    unresolved_pct: pct(rs.filter((r) => r.route === "B1" && r.needs_review).length / rs.length),
    needs_review_pct: pct(rs.filter((r) => r.needs_review).length / rs.length),
    glyph_loss_proxy_pct_A_B1: pct(mean(loss)),
    duplication_pct_A_B1: pct(mean(dup)),
    hebrew_share_pct: pct(mean(heb)),
    citation_alignment_pct: pct(mean(folio)),
  };
}

const strata = [...new Set(rows.map((r) => r.stratum))].sort();
const report = {
  kind: "ROUTER-REGRESSION (engineering, proxy metrics — NOT human accuracy)",
  router_version: ROUTER_VERSION, route_config: DEFAULT_ROUTE_CONFIG,
  overall: agg(rows),
  by_stratum: Object.fromEntries(strata.map((s) => [s, agg(rows.filter((r) => r.stratum === s))])),
  b1_pages: rows.filter((r) => r.route === "B1").map((r) => ({ id: r.id, resolved: !r.needs_review })),
  b2_pages: rows.filter((r) => r.route === "B2").map((r) => r.id),
  note: "Path A = layout-2 (unchanged → no regression on clean classes). Path B1 = layout-order-v3 re-orders the SAME glyphs (glyph-loss stays ~0). Path B2 = cloud OCR PENDING operator run; tesseract shown as placeholder only. published=0.",
};
mkdirSync(`${EVAL}/report`, { recursive: true });
writeFileSync(`${EVAL}/report/router-regression.json`, JSON.stringify(report, null, 2));
writeFileSync(`${EVAL}/report/route-decisions.json`, JSON.stringify(decisions, null, 2));

const o = report.overall;
const md = [
  `# Router regression — all 108 benchmark pages (engineering / proxy)`,
  ``, `> Not human-ground-truth accuracy. Path A untouched; B1 re-orders same glyphs; B2 OCR pending operator run. published=0.`, ``,
  `- **Path A (deterministic):** ${o.pct_path_A}%`,
  `- **Path B1 (layout-only recovery):** ${o.pct_path_B1_layout_only}%`,
  `- **Path B2 (OCR):** ${o.pct_path_B2_ocr}%`,
  `- **unresolved (B1 not fixable):** ${o.unresolved_pct}%   ·   **needs_review:** ${o.needs_review_pct}%`,
  `- **glyph-loss proxy (A+B1):** ${o.glyph_loss_proxy_pct_A_B1}%   ·   **duplication (A+B1):** ${o.duplication_pct_A_B1}%`,
  `- **Hebrew-share:** ${o.hebrew_share_pct}%   ·   **citation alignment:** ${o.citation_alignment_pct}%`,
  ``, `## Per stratum`, ``,
  `| stratum | pages | %A | %B1 | %B2 | unresolved% | glyph-loss% | dup% | heb% | citation% |`,
  `|---|---|---|---|---|---|---|---|---|---|`,
  ...strata.map((s) => { const a = report.by_stratum[s]; return `| ${s} | ${a.pages} | ${a.pct_path_A} | ${a.pct_path_B1_layout_only} | ${a.pct_path_B2_ocr} | ${a.unresolved_pct} | ${a.glyph_loss_proxy_pct_A_B1 ?? "n/a"} | ${a.duplication_pct_A_B1 ?? "n/a"} | ${a.hebrew_share_pct ?? "n/a"} | ${a.citation_alignment_pct} |`; }),
  ``, `## Path B1 pages (layout-only order recovery, no OCR)`, ``,
  ...report.b1_pages.map((p) => `- ${p.id}: ${p.resolved ? "resolved losslessly ✓" : "STILL unresolved → needs_review"}`),
  ``, `## Path B2 pages (OCR — cloud provider pending)`, ``, `- ${report.b2_pages.join(", ")}`,
].join("\n");
writeFileSync(`${EVAL}/report/router-regression.md`, md);

process.stdout.write(
  `ROUTER REGRESSION (108 pages)\n` +
  `Path A ${o.pct_path_A}% · B1 layout-only ${o.pct_path_B1_layout_only}% · B2 OCR ${o.pct_path_B2_ocr}%\n` +
  `unresolved ${o.unresolved_pct}% · needs_review ${o.needs_review_pct}% · glyph-loss(A+B1) ${o.glyph_loss_proxy_pct_A_B1}% · dup ${o.duplication_pct_A_B1}% · heb ${o.hebrew_share_pct}% · citation ${o.citation_alignment_pct}%\n` +
  `B1 resolved: ${report.b1_pages.filter((p) => p.resolved).length}/${report.b1_pages.length} · B2 pages: ${report.b2_pages.length}\n` +
  `report → ${EVAL}/report/router-regression.{json,md} + route-decisions.json\n`,
);

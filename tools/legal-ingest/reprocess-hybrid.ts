/**
 * Production hybrid reprocessing (operator, networked) — DRY-RUN by default.
 *
 *   PDFS_DIR=<local pdfs OR pulled-from-Object-Storage> \
 *   node --experimental-strip-types tools/legal-ingest/reprocess-hybrid.ts [--commit]
 *
 * For each page it routes (A / B1 / B2) and produces a NEW machine-derived
 * extraction record carrying: engine, engine_version, route_reason, confidence,
 * machine_derived, needs_review, order_version. It NEVER overwrites the raw
 * extraction, reprocesses ONLY from PDFs already in Object Storage (no Knesset
 * re-download), and keeps published=0.
 *
 * SAFETY: dry-run prints the plan and writes staging JSON only. `--commit` is
 * intentionally gated: it REFUSES unless a real Path-B2 provider is selected
 * (B2_PROVIDER != pending) AND the DB extraction-layer migration is in place —
 * the actual DB write + migration are approval-gated (see infra guardrails) and
 * are deliberately left as the operator's explicit step. This script's job is the
 * deterministic routing + Path-A/B1 extraction and the record shape.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { reconstructPage, type LayoutItem } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/layout-reconstruct.ts";
import { recoverReadingOrder } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/layout-order-v3.ts";
import { routePage, ROUTER_VERSION, DEFAULT_ROUTE_CONFIG, type RouteSignals } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/extraction-router.ts";

const COMMIT = process.argv.includes("--commit");
const B2_PROVIDER = process.env.B2_PROVIDER ?? "pending";
const PDFS = process.env.PDFS_DIR;
const WORKLIST = process.env.WORKLIST; // JSON [{publication_item_id, page_number}] ; defaults to benchmark manifest for demo
const OUT = process.env.STAGING_DIR ?? "tools/legal-ingest/.staging-hybrid";
if (!PDFS) { process.stderr.write("reprocess-hybrid: PDFS_DIR required (PDFs pulled from Object Storage; no Knesset re-download).\n"); process.exit(2); }

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (d: Buffer, o?: { pagerender?: (p: unknown) => Promise<string> }) => Promise<{ numpages: number }>;
const hebrewShare = (t: string) => { let l = 0, h = 0; for (const c of t ?? "") if (/\p{L}/u.test(c)) { l++; if (/[֐-׿]/.test(c)) h++; } return l ? h / l : 0; };

async function pageItems(pdf: Uint8Array, page: number): Promise<LayoutItem[]> {
  let cur = 0; let found: LayoutItem[] = [];
  await pdfParse(Buffer.from(pdf), { pagerender: async (pd0: unknown): Promise<string> => {
    cur += 1; if (cur !== page) return "";
    const pd = pd0 as { getTextContent: (o?: unknown) => Promise<{ items: { str?: string; transform?: number[]; width?: number; height?: number; fontName?: string }[] }> };
    const tc = await pd.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    found = tc.items.filter((it) => it.str && it.transform).map((it) => ({ str: it.str!, x: it.transform![4], y: it.transform![5], width: it.width ?? (it.str!.length * (it.height ?? 6)), height: it.height, fontName: it.fontName }));
    return "";
  } });
  return found;
}

function worklist(): { publication_item_id: string; page_number: number }[] {
  if (WORKLIST && existsSync(WORKLIST)) return JSON.parse(readFileSync(WORKLIST, "utf8"));
  const m = JSON.parse(readFileSync("benchmark/knesset-layout/manifest-v1.json", "utf8"));
  return m.entries.map((e: any) => ({ publication_item_id: e.publication_item_id, page_number: e.page_number }));
}

async function main(): Promise<void> {
  if (COMMIT && B2_PROVIDER === "pending") { process.stderr.write("REFUSING --commit: no Path-B2 provider selected (set B2_PROVIDER after eng-b2-compare.ts). DB write + extraction-layer migration are approval-gated.\n"); process.exit(1); }
  if (COMMIT) { process.stderr.write("REFUSING --commit in this build: DB write + migration are approval-gated. Run dry-run, get founder approval + apply the extraction-layer migration, then wire the persist step.\n"); process.exit(1); }
  mkdirSync(OUT, { recursive: true });
  const list = worklist();
  const cache = new Map<string, Uint8Array>();
  const tally = { A: 0, B1: 0, B2: 0, needs_review: 0 };
  for (const w of list) {
    const p = `${PDFS}/${w.publication_item_id}.pdf`;
    if (!existsSync(p)) { process.stderr.write(`  [no-pdf-in-object-storage-cache] ${w.publication_item_id}\n`); continue; }
    let pdf = cache.get(w.publication_item_id); if (!pdf) { pdf = new Uint8Array(readFileSync(p)); cache.set(w.publication_item_id, pdf); }
    const items = await pageItems(pdf, w.page_number);
    const rawText = items.map((i) => i.str).join(" ");
    const has = rawText.replace(/\s+/g, "").length > 0;
    const l2 = reconstructPage(items);
    const sig: RouteSignals = { has_text_layer: has, hebrew_share: hebrewShare(rawText), layout2_unresolved: l2.unresolved };
    const pre = routePage(sig, { ...DEFAULT_ROUTE_CONFIG, b2_provider: B2_PROVIDER });
    let extracted = "", orderVersion = "layout-2", b1Resolved: boolean | undefined;
    if (pre.route === "A") { extracted = l2.bodyText + (l2.marginalCaptions.length ? "\n" + l2.marginalCaptions.map((c) => c.text).join("\n") : ""); }
    else if (pre.route === "B1") { const r = recoverReadingOrder(items); extracted = r.reading_order_text; orderVersion = r.order_version; b1Resolved = r.resolved && r.lossless; }
    else { extracted = ""; /* B2: OCR performed by the selected cloud provider step; raw stays authoritative */ }
    const decision = routePage({ ...sig, b1_resolved: b1Resolved }, { ...DEFAULT_ROUTE_CONFIG, b2_provider: B2_PROVIDER });
    tally[decision.route] += 1; if (decision.needs_review) tally.needs_review += 1;

    const record = {
      publication_item_id: w.publication_item_id, page_number: w.page_number,
      // raw is NEVER overwritten — this is a separate machine-derived layer:
      layer: "structured_reading_order",
      route: decision.route, engine: decision.engine, engine_version: decision.engine_version,
      order_version: decision.route === "B1" ? orderVersion : (decision.route === "A" ? "layout-2" : B2_PROVIDER),
      route_reason: decision.route_reason, confidence: decision.confidence,
      machine_derived: true, needs_review: decision.needs_review, published: 0,
      router_version: ROUTER_VERSION,
      reading_order_text: extracted, // for B2 this is filled by the cloud OCR step
    };
    writeFileSync(`${OUT}/${w.publication_item_id}_p${w.page_number}.extraction.json`, JSON.stringify(record, null, 2));
  }
  process.stdout.write(
    `DRY-RUN hybrid reprocess over ${list.length} pages (staging → ${OUT}/)\n` +
    `Path A ${tally.A} · B1 ${tally.B1} · B2 ${tally.B2} · needs_review ${tally.needs_review}\n` +
    `raw extraction untouched · published=0 · reprocessed only from Object-Storage PDFs.\n` +
    `To go live: (1) select B2 provider (eng-b2-compare), (2) get approval + apply extraction-layer migration, (3) wire the persist step + staged rollout.\n`,
  );
}
main().catch((e) => { process.stderr.write(`reprocess-hybrid failed: ${(e as Error).message}\n`); process.exit(1); });

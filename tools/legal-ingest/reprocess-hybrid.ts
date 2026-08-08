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
import { assembleB2Page, type B2PageAssembly } from "../../benchmark/knesset-layout/engineering-eval/b2-page.ts";
import { ocrPageWithGoogle, googleOcrAvailable, googleOcrConfigFromEnv } from "../../benchmark/knesset-layout/engineering-eval/b2-ocr.ts";
import { computeReprocessMetrics, type ReprocessPageRecord } from "./reprocess-metrics.ts";

const COMMIT = process.argv.includes("--commit");
const B2_PROVIDER = process.env.B2_PROVIDER ?? "pending";
const PDFS = process.env.PDFS_DIR;
const WORKLIST = process.env.WORKLIST; // JSON [{publication_item_id, page_number}] ; defaults to benchmark manifest for demo
const OUT = process.env.STAGING_DIR ?? "tools/legal-ingest/.staging-hybrid";
if (!PDFS) { process.stderr.write("reprocess-hybrid: PDFS_DIR required (PDFs pulled from Object Storage; no Knesset re-download).\n"); process.exit(2); }

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (d: Buffer, o?: { pagerender?: (p: unknown) => Promise<string> }) => Promise<{ numpages: number }>;
const hebrewShare = (t: string) => { let l = 0, h = 0; for (const c of t ?? "") if (/\p{L}/u.test(c)) { l++; if (/[֐-׿]/.test(c)) h++; } return l ? h / l : 0; };
// Proxy metric helpers (glyph multiset vs the page's own text layer — order-independent).
const glyphs = (t: string) => { const m = new Map<string, number>(); for (const c of (t ?? "").replace(/\s+/g, "")) m.set(c, (m.get(c) ?? 0) + 1); return m; };
const glyphTotal = (m: Map<string, number>) => { let n = 0; for (const v of m.values()) n += v; return n; };
function glyphLoss(refText: string, outText: string): number { const R = glyphs(refText), O = glyphs(outText); const tot = glyphTotal(R); if (!tot) return 0; let miss = 0; for (const [c, n] of R) miss += Math.max(0, n - (O.get(c) ?? 0)); return miss / tot; }
function glyphDup(refText: string, outText: string): number { const R = glyphs(refText), O = glyphs(outText); const tot = glyphTotal(R); if (!tot) return 0; let ex = 0; for (const [c, n] of O) ex += Math.max(0, n - (R.get(c) ?? 0)); return ex / tot; }

async function pageItems(pdf: Uint8Array, page: number): Promise<{ items: LayoutItem[]; numpages: number }> {
  let cur = 0; let found: LayoutItem[] = [];
  const r = await pdfParse(Buffer.from(pdf), { pagerender: async (pd0: unknown): Promise<string> => {
    cur += 1; if (cur !== page) return "";
    const pd = pd0 as { getTextContent: (o?: unknown) => Promise<{ items: { str?: string; transform?: number[]; width?: number; height?: number; fontName?: string }[] }> };
    const tc = await pd.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    found = tc.items.filter((it) => it.str && it.transform).map((it) => ({ str: it.str!, x: it.transform![4], y: it.transform![5], width: it.width ?? (it.str!.length * (it.height ?? 6)), height: it.height, fontName: it.fontName }));
    return "";
  } });
  return { items: found, numpages: r.numpages };
}

function worklist(): { publication_item_id: string; page_number: number }[] {
  if (WORKLIST && existsSync(WORKLIST)) return JSON.parse(readFileSync(WORKLIST, "utf8"));
  const m = JSON.parse(readFileSync("benchmark/knesset-layout/manifest-v1.json", "utf8"));
  return m.entries.map((e: any) => ({ publication_item_id: e.publication_item_id, page_number: e.page_number }));
}

const ALLOW_GEOMETRY = (process.env.B2_TABLE_GEOMETRY_FALLBACK ?? "true") !== "false";
const OCR_CFG = googleOcrConfigFromEnv();

async function main(): Promise<void> {
  if (COMMIT && B2_PROVIDER === "pending") { process.stderr.write("REFUSING --commit: no Path-B2 provider selected (set B2_PROVIDER after eng-b2-compare.ts). DB write + extraction-layer migration are approval-gated.\n"); process.exit(1); }
  if (COMMIT) { process.stderr.write("REFUSING --commit in this build: DB write + migration are approval-gated. Run dry-run, get founder approval + apply the extraction-layer migration, then wire the persist step.\n"); process.exit(1); }
  mkdirSync(OUT, { recursive: true });
  const list = worklist();
  const cache = new Map<string, Uint8Array>();
  const pubs = new Set<string>();
  const records: ReprocessPageRecord[] = [];
  const b2Live = B2_PROVIDER === "google-docai" && googleOcrAvailable(OCR_CFG);
  if (B2_PROVIDER === "google-docai" && !b2Live) process.stderr.write("[b2] google-docai selected but OCR credentials absent — B2 pages will be quarantined (needs_review), not OCR'd. Run in CI (OIDC) for live B2.\n");

  for (const w of list) {
    pubs.add(w.publication_item_id);
    const p = `${PDFS}/${w.publication_item_id}.pdf`;
    if (!existsSync(p)) {
      process.stderr.write(`  [no-pdf-in-object-storage-cache] ${w.publication_item_id}\n`);
      records.push({ publication_item_id: w.publication_item_id, page_number: w.page_number, route: "B2", needs_review: true, physical_page_alignment: false, provenance_complete: false, published: 0, raw_overwritten: false, extraction_failure: true, google_call: false, object_storage_anomaly: true, b2: null });
      continue;
    }
    let pdf = cache.get(w.publication_item_id); if (!pdf) { pdf = new Uint8Array(readFileSync(p)); cache.set(w.publication_item_id, pdf); }
    const { items, numpages } = await pageItems(pdf, w.page_number);
    const rawText = items.map((i) => i.str).join(" ");
    const has = rawText.replace(/\s+/g, "").length > 0;
    const l2 = reconstructPage(items);
    const sig: RouteSignals = { has_text_layer: has, hebrew_share: hebrewShare(rawText), layout2_unresolved: l2.unresolved };
    let extracted = "", orderVersion = "layout-2", b1Resolved: boolean | undefined;
    const pre = routePage(sig, { ...DEFAULT_ROUTE_CONFIG, b2_provider: B2_PROVIDER });
    if (pre.route === "A") { extracted = l2.bodyText + (l2.marginalCaptions.length ? "\n" + l2.marginalCaptions.map((c) => c.text).join("\n") : ""); }
    else if (pre.route === "B1") { const r = recoverReadingOrder(items); extracted = r.reading_order_text; orderVersion = r.order_version; b1Resolved = r.resolved && r.lossless; }
    const decision = routePage({ ...sig, b1_resolved: b1Resolved }, { ...DEFAULT_ROUTE_CONFIG, b2_provider: B2_PROVIDER });

    const physical_ok = w.page_number >= 1 && w.page_number <= numpages;
    const provenance_complete = !!w.publication_item_id && w.page_number >= 1 && physical_ok;
    const glyph = (decision.route === "A" || decision.route === "B1") ? glyphLoss(rawText, extracted) : null;
    const dupAb1 = (decision.route === "A" || decision.route === "B1") ? glyphDup(rawText, extracted) : null;
    const hebAb1 = (decision.route === "A" || decision.route === "B1") ? hebrewShare(extracted) : null;
    const extractionFailure = (decision.route === "A" || decision.route === "B1") && has && extracted.replace(/\s+/g, "").length === 0;

    // ---- Path B2: live Google Document AI OCR + shared B2 assembly ----
    let b2: B2PageAssembly | null = null; let googleCall = false; let b2Latency: number | null = null;
    let b2Confidence: number | null = null; let b2GoogleError = false;
    if (decision.route === "B2") {
      if (b2Live) {
        googleCall = true; // an OCR call is attempted; success/failure tracked separately
        try { const ocr = await ocrPageWithGoogle(p, w.page_number, OCR_CFG); b2Latency = ocr.latency_ms; b2Confidence = ocr.mean_confidence ?? null; b2 = assembleB2Page({ text: ocr.text, layout: ocr.layout, mean_confidence: ocr.mean_confidence, token_count: ocr.token_count, line_count: ocr.line_count, block_count: ocr.block_count, allowGeometryFallback: ALLOW_GEOMETRY }); }
        catch (err) { process.stderr.write(`  [b2-ocr-fail] ${w.publication_item_id} p${w.page_number}: ${(err as Error).message}\n`); b2GoogleError = true; b2Confidence = 0; b2 = assembleB2Page({ text: "", layout: { text: "", pages: [] }, mean_confidence: 0, ocr_error: true, allowGeometryFallback: ALLOW_GEOMETRY }); }
      } else {
        // No OCR credentials in this environment: quarantine, never fabricate OCR text.
        b2 = assembleB2Page({ text: "", layout: { text: "", pages: [] }, mean_confidence: 0, ocr_error: true, allowGeometryFallback: ALLOW_GEOMETRY });
      }
    }

    const needsReview = decision.route === "B2" ? (b2?.verdict.decision === "needs_review" || b2?.verdict.decision === "failed") : decision.needs_review;
    records.push({
      publication_item_id: w.publication_item_id, page_number: w.page_number, route: decision.route,
      needs_review: needsReview, physical_page_alignment: physical_ok, provenance_complete, published: 0,
      raw_overwritten: false, extraction_failure: extractionFailure, google_call: googleCall, latency_ms: b2Latency,
      glyph_loss: glyph, duplication_ab1: dupAb1, hebrew_share_ab1: hebAb1,
      b2: b2 ? { decision: b2.verdict.decision, state: b2.classification.state, ocr_state: b2.ocr_state, chars: b2.chars, hebrew_share: b2.hebrew_share, duplication: b2.duplication, numeric_ratio: b2.numeric_ratio, table_count: b2.table_count, table_source: b2.table_source, reason_codes: b2.verdict.reason_codes, mean_confidence: b2Confidence, google_error: b2GoogleError } : null,
    });

    const record = {
      publication_item_id: w.publication_item_id, page_number: w.page_number,
      pdf_page_index: w.page_number, physical_page_alignment: physical_ok,
      layer: "structured_reading_order",  // raw is NEVER overwritten — separate machine-derived layer
      route: decision.route, engine: decision.route === "B2" ? (b2Live ? "google-docai" : "cloud-ocr:pending") : decision.engine,
      engine_version: decision.engine_version, processor_id: decision.route === "B2" && b2Live ? OCR_CFG.processor : undefined,
      order_version: decision.route === "B1" ? orderVersion : (decision.route === "A" ? "layout-2" : B2_PROVIDER),
      route_reason: decision.route_reason, confidence: decision.confidence,
      machine_derived: true, needs_review: needsReview, published: 0, router_version: ROUTER_VERSION,
      provenance: { publication_item_id: w.publication_item_id, page_number: w.page_number, source_url: (w as { source_url?: string }).source_url, source: "object_storage_pdf", machine_derived: true },
      reading_order_text: decision.route === "B2" ? (b2?.text ?? "") : extracted,
      b2: decision.route === "B2" ? { ocr_state: b2?.ocr_state, chars: b2?.chars, hebrew_share: b2?.hebrew_share, duplication: b2?.duplication, table_count: b2?.table_count, table_source: b2?.table_source, decision: b2?.verdict.decision, reason_codes: b2?.verdict.reason_codes, tables: b2?.tables } : undefined,
    };
    writeFileSync(`${OUT}/${w.publication_item_id}_p${w.page_number}.extraction.json`, JSON.stringify(record, null, 2));
  }

  // Full-corpus inventory (written by fetch-cohort-from-storage). If present, it
  // carries the eligible-publication count and the fetch-time object-storage
  // anomalies (pubs eligible in the corpus but with no retrievable object).
  const INVENTORY = process.env.CORPUS_INVENTORY ?? "tools/legal-ingest/.corpus-inventory.json";
  let eligiblePublications = pubs.size; let objectStorageAnomaliesBaseline = 0;
  if (existsSync(INVENTORY)) {
    try {
      const inv = JSON.parse(readFileSync(INVENTORY, "utf8")) as { total_eligible_publications?: number; missing_objects?: number };
      if (typeof inv.total_eligible_publications === "number") eligiblePublications = inv.total_eligible_publications;
      if (typeof inv.missing_objects === "number") objectStorageAnomaliesBaseline = inv.missing_objects;
    } catch { /* inventory optional — fall back to worklist-derived counts */ }
  }
  const metrics = computeReprocessMetrics(records, pubs.size, { eligiblePublications, objectStorageAnomaliesBaseline });
  writeFileSync(`${OUT}/_reprocess-metrics.json`, JSON.stringify(metrics, null, 2));
  process.stdout.write(
    `DRY-RUN hybrid reprocess — ${metrics.publications_completed}/${metrics.publications_attempted} publications, ${metrics.total_pages} pages (staging → ${OUT}/)\n` +
    `Path A ${metrics.path_A_pct}% · B1 ${metrics.path_B1_pct}% · B2 ${metrics.path_B2_pct}% · accepted ${metrics.accepted_pages} · needs_review ${metrics.needs_review_pages} · ocr_fail ${metrics.ocr_failures}\n` +
    `tables ${metrics.table_pages} (geom ${metrics.geometry_table_pages}, native ${metrics.native_table_pages}; accepted ${metrics.table_pages_accepted}, review ${metrics.table_pages_needs_review}) · sparse ${metrics.sparse_pages} · blank ${metrics.likely_blank_pages}\n` +
    `physical-align ${metrics.physical_page_alignment_pct}% · provenance ${metrics.provenance_complete_pct}% · raw_overwrite ${metrics.raw_overwrite_count} · published ${metrics.published_count} · dup ${metrics.duplicate_extractions} · google_calls ${metrics.google_b2_call_count}\n` +
    `failure_classes: ${metrics.newly_discovered_failure_classes.join(", ") || "none"} · from Object-Storage PDFs.\n` +
    `metrics → ${OUT}/_reprocess-metrics.json\n`,
  );
}
main().catch((e) => { process.stderr.write(`reprocess-hybrid failed: ${(e as Error).message}\n`); process.exit(1); });

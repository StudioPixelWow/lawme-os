/**
 * ENGINEERING EVAL — cloud candidate adapter: Google Document AI (OPERATOR-RUN).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=<sa.json> GCP_PROJECT=<id> GCP_LOCATION=eu \
 *   GCP_DOCAI_PROCESSOR=<processor-id> PDFS_DIR=<dir> \
 *   node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-google.ts
 *
 * This sandbox has no GCP credentials or egress, so it refuses cleanly. Run on
 * operator infra (needs `@google-cloud/documentai`). Processes only the single
 * benchmark page (split locally), keeps provenance, writes outputs/google-docai/
 * <id>.json in the shared schema (raw text + structured B2 layer). No fabricated
 * numbers. published=0.
 *
 * Uses the SHARED B2 modules (b2-ocr + b2-page) so the eval and the production
 * hybrid reprocess produce identical B2 records.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { ocrPageWithGoogle, googleOcrAvailable, googleOcrConfigFromEnv } from "./b2-ocr.ts";
import { assembleB2Page } from "./b2-page.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const PDFS = process.env.PDFS_DIR ?? `${DIR}/pdfs`;
const ALLOW_GEOMETRY = (process.env.B2_TABLE_GEOMETRY_FALLBACK ?? "true") !== "false";
const CFG = googleOcrConfigFromEnv();

if (!googleOcrAvailable(CFG)) {
  process.stderr.write(
    "eng-google: REFUSING — missing GCP_PROJECT / GCP_LOCATION / GCP_DOCAI_PROCESSOR / GOOGLE_APPLICATION_CREDENTIALS (and this sandbox has no GCP egress).\n" +
    "On operator infra: npm i @google-cloud/documentai, then set the four env vars and\n" +
    "  PDFS_DIR=... node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-google.ts\n" +
    "Output schema: outputs/google-docai/<id>.json { engine, text, tables, table_detection, classification, verdict, layout, provenance }.\n",
  );
  process.exit(3);
}

interface ManifestEntry { id: string; publication_item_id: string; page_number: number; source_url: string }
const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as { entries: ManifestEntry[] };
const only = (process.env.B2_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function baseRecord(e: ManifestEntry) {
  return {
    id: e.id, engine: "google-docai", engine_kind: "cloud-ocr", engine_detail: `Document AI ${CFG.processor}`, processor_id: CFG.processor,
    provenance: { publication_item_id: e.publication_item_id, page_number: e.page_number, source_url: e.source_url, machine_derived: true },
  };
}

async function main(): Promise<void> {
  mkdirSync(`${EVAL}/outputs/google-docai`, { recursive: true });
  let done = 0, fail = 0, review = 0;
  for (const e of manifest.entries) {
    if (only.length && !only.includes(e.id)) continue;
    const src = `${PDFS}/${e.publication_item_id}.pdf`;
    if (!existsSync(src)) {
      process.stderr.write(`  [no-pdf] ${e.id}\n`);
      const a = assembleB2Page({ text: "", layout: { text: "", pages: [] }, mean_confidence: 0, ocr_error: true, allowGeometryFallback: ALLOW_GEOMETRY });
      writeFileSync(`${EVAL}/outputs/google-docai/${e.id}.json`, JSON.stringify({ ...baseRecord(e), reading_order_text: "", latency_ms: null, error_message: "pdf_not_found_in_object_storage_cache", ...a, layout: { text: "", pages: [] }, published: 0 }, null, 2));
      fail++; continue;
    }
    try {
      const ocr = await ocrPageWithGoogle(src, e.page_number, CFG);
      const a = assembleB2Page({ text: ocr.text, layout: ocr.layout, mean_confidence: ocr.mean_confidence, token_count: ocr.token_count, line_count: ocr.line_count, block_count: ocr.block_count, allowGeometryFallback: ALLOW_GEOMETRY });
      writeFileSync(`${EVAL}/outputs/google-docai/${e.id}.json`, JSON.stringify({ ...baseRecord(e), reading_order_text: ocr.text, latency_ms: ocr.latency_ms, ...a, layout: ocr.layout, published: 0 }, null, 2));
      if (a.verdict.decision === "needs_review") review++;
      done++;
    } catch (err) {
      process.stderr.write(`  [google-fail] ${e.id}: ${(err as Error).message}\n`);
      const a = assembleB2Page({ text: "", layout: { text: "", pages: [] }, mean_confidence: 0, ocr_error: true, allowGeometryFallback: ALLOW_GEOMETRY });
      writeFileSync(`${EVAL}/outputs/google-docai/${e.id}.json`, JSON.stringify({ ...baseRecord(e), reading_order_text: "", latency_ms: null, error_message: (err as Error).message, ...a, layout: { text: "", pages: [] }, published: 0 }, null, 2));
      fail++;
    }
  }
  process.stdout.write(`google-docai: ${done} pages (${fail} failed, ${review} needs_review). Now run eng-b2-compare.ts / b2-retest.ts.\n`);
}
main().catch((e) => { process.stderr.write(`eng-google failed: ${(e as Error).message}\n`); process.exit(1); });

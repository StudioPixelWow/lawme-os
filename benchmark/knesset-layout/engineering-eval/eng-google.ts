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
 * <id>.json in the shared schema. Then re-run eng-b2-compare.ts / eng-score.ts.
 * No fabricated numbers. published=0.
 *
 * §3–§12 enrichment: in addition to the canonical `.text` (RAW, authoritative,
 * never altered) each record now carries a STRUCTURED layer — Document AI table
 * objects → canonical tables + deterministic table text, page classification
 * (content / sparse / likely_blank / ocr_failed), machine-readable reason codes,
 * and a B2 verdict (accepted / needs_review / failed). Provider HTTP success is
 * never by itself sufficient to accept a page.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractTables, tableDetection, tableToText, type DocaiDocument } from "./b2-tables.ts";
import { classifyPage, assessTables, decideB2, numericRatio, type B2PageSignals } from "./b2-quality.ts";
import { stripSpace } from "./eng-metrics.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const PDFS = process.env.PDFS_DIR ?? `${DIR}/pdfs`;
const ALLOW_GEOMETRY = (process.env.B2_TABLE_GEOMETRY_FALLBACK ?? "true") !== "false";
const { GCP_PROJECT, GCP_LOCATION, GCP_DOCAI_PROCESSOR, GOOGLE_APPLICATION_CREDENTIALS } = process.env;

if (!GCP_PROJECT || !GCP_LOCATION || !GCP_DOCAI_PROCESSOR || !GOOGLE_APPLICATION_CREDENTIALS) {
  process.stderr.write(
    "eng-google: REFUSING — missing GCP_PROJECT / GCP_LOCATION / GCP_DOCAI_PROCESSOR / GOOGLE_APPLICATION_CREDENTIALS (and this sandbox has no GCP egress).\n" +
    "On operator infra: npm i @google-cloud/documentai, then set the four env vars and\n" +
    "  PDFS_DIR=... node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-google.ts\n" +
    "Output schema: outputs/google-docai/<id>.json { engine, text, tables, table_detection, classification, verdict, layout, provenance }.\n",
  );
  process.exit(3);
}

const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as {
  entries: { id: string; publication_item_id: string; page_number: number; source_url: string }[];
};
const only = (process.env.B2_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const require = createRequire(import.meta.url);

function onePage(src: string, page: number): Buffer {
  const out = join(tmpdir(), `g-${process.pid}-${page}.pdf`);
  execFileSync("pdftk", [src, "cat", String(page), "output", out]); // or qpdf; see RUNBOOK
  const b = readFileSync(out); try { execFileSync("rm", ["-f", out]); } catch { /**/ }
  return b;
}

/** Trim the Document AI response to the fields the structured layer needs, so
 *  the persisted layout stays auditable but bounded. RAW text is preserved. */
function trimLayout(document: any): DocaiDocument {
  return {
    text: document?.text ?? "",
    pages: (document?.pages ?? []).map((p: any) => ({
      pageNumber: p.pageNumber,
      dimension: p.dimension ? { width: p.dimension.width, height: p.dimension.height } : undefined,
      tables: p.tables ?? [],
      tokens: (p.tokens ?? []).map((t: any) => ({
        layout: {
          textAnchor: t.layout?.textAnchor,
          confidence: t.layout?.confidence,
          boundingPoly: t.layout?.boundingPoly
            ? { vertices: t.layout.boundingPoly.vertices, normalizedVertices: t.layout.boundingPoly.normalizedVertices }
            : undefined,
        },
      })),
    })),
  };
}

function buildRecord(e: { id: string; publication_item_id: string; page_number: number; source_url: string }, document: any, meanConf: number, latency: number) {
  const text: string = document?.text ?? "";
  const layout = trimLayout(document);
  const tables = extractTables(layout, { allowGeometryFallback: ALLOW_GEOMETRY });
  const det = tableDetection(tables);
  const tokenCount = (document?.pages ?? []).reduce((a: number, p: any) => a + (p.tokens?.length ?? 0), 0);
  const lineCount = (document?.pages ?? []).reduce((a: number, p: any) => a + (p.lines?.length ?? 0), 0);
  const blockCount = (document?.pages ?? []).reduce((a: number, p: any) => a + (p.blocks?.length ?? 0), 0);
  const sig: B2PageSignals = {
    char_count: stripSpace(text).length, token_count: tokenCount, line_count: lineCount, block_count: blockCount,
    mean_confidence: meanConf, ocr_error: false, image_decoded: true,
  };
  const cls = classifyPage(sig);
  const tbl = assessTables(tables, { numeric_ratio: numericRatio(text), has_flattened_text: stripSpace(text).length > 0 });
  const verdict = decideB2(cls, tbl);
  const normalized = [text, ...tables.map(tableToText)].filter(Boolean).join("\n\n");
  return {
    id: e.id, engine: "google-docai", engine_kind: "cloud-ocr", engine_detail: `Document AI ${GCP_DOCAI_PROCESSOR}`,
    provenance: { publication_item_id: e.publication_item_id, page_number: e.page_number, source_url: e.source_url, machine_derived: true },
    text, reading_order_text: text,                 // RAW canonical — unchanged
    normalized_text: normalized,                    // text + deterministic table text (RAG)
    mean_confidence: +meanConf.toFixed(2), latency_ms: latency,
    unresolved: stripSpace(text).length === 0,
    token_count: tokenCount, line_count: lineCount, block_count: blockCount, ocr_error: false,
    table_detection: det, tables,
    classification: cls, table_assessment: tbl, verdict,
    layout,
    published: 0,
  };
}

function errorRecord(e: { id: string; publication_item_id: string; page_number: number; source_url: string }, message: string) {
  const sig: B2PageSignals = { char_count: 0, mean_confidence: 0, ocr_error: true, image_decoded: false };
  const cls = classifyPage(sig);
  const tbl = assessTables([], { numeric_ratio: 0, has_flattened_text: false });
  return {
    id: e.id, engine: "google-docai", engine_kind: "cloud-ocr", engine_detail: `Document AI ${GCP_DOCAI_PROCESSOR}`,
    provenance: { publication_item_id: e.publication_item_id, page_number: e.page_number, source_url: e.source_url, machine_derived: true },
    text: "", reading_order_text: "", normalized_text: "", mean_confidence: 0, latency_ms: null,
    unresolved: true, token_count: 0, line_count: 0, block_count: 0, ocr_error: true, error_message: message,
    table_detection: { table_detected: false, number_of_tables: 0, total_cells: 0, source: "none" }, tables: [],
    classification: cls, table_assessment: tbl, verdict: decideB2(cls, tbl), layout: { text: "", pages: [] },
    published: 0,
  };
}

async function main(): Promise<void> {
  const { DocumentProcessorServiceClient } = require("@google-cloud/documentai").v1;
  // Regional endpoint is required for non-US locations (e.g. eu).
  const apiEndpoint = GCP_LOCATION && GCP_LOCATION !== "us" ? `${GCP_LOCATION}-documentai.googleapis.com` : undefined;
  const client = new DocumentProcessorServiceClient(apiEndpoint ? { apiEndpoint } : {});
  const name = `projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/processors/${GCP_DOCAI_PROCESSOR}`;
  mkdirSync(`${EVAL}/outputs/google-docai`, { recursive: true });
  let done = 0, fail = 0, review = 0;
  for (const e of manifest.entries) {
    if (only.length && !only.includes(e.id)) continue;
    const src = `${PDFS}/${e.publication_item_id}.pdf`;
    if (!existsSync(src)) { process.stderr.write(`  [no-pdf] ${e.id}\n`); writeFileSync(`${EVAL}/outputs/google-docai/${e.id}.json`, JSON.stringify(errorRecord(e, "pdf_not_found_in_object_storage_cache"), null, 2)); fail++; continue; }
    try {
      const t0 = Date.now();
      const [res] = await client.processDocument({ name, rawDocument: { content: onePage(src, e.page_number).toString("base64"), mimeType: "application/pdf" } });
      const latency = Date.now() - t0;
      const doc = res.document ?? {};
      const toks = (doc.pages ?? []).flatMap((p: any) => p.tokens ?? []);
      const conf = toks.length ? toks.reduce((a: number, t: any) => a + (t.layout?.confidence ?? 0), 0) / toks.length * 100 : 0;
      const rec = buildRecord(e, doc, conf, latency);
      writeFileSync(`${EVAL}/outputs/google-docai/${e.id}.json`, JSON.stringify(rec, null, 2));
      if (rec.verdict.decision === "needs_review") review++;
      done++;
    } catch (err) {
      process.stderr.write(`  [google-fail] ${e.id}: ${(err as Error).message}\n`);
      writeFileSync(`${EVAL}/outputs/google-docai/${e.id}.json`, JSON.stringify(errorRecord(e, (err as Error).message), null, 2));
      fail++;
    }
  }
  process.stdout.write(`google-docai: ${done} pages (${fail} failed, ${review} needs_review). Now run eng-b2-compare.ts / b2-retest.ts.\n`);
}
main().catch((e) => { process.stderr.write(`eng-google failed: ${(e as Error).message}\n`); process.exit(1); });

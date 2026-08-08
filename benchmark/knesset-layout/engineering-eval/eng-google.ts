/**
 * ENGINEERING EVAL — cloud candidate adapter: Google Document AI (OPERATOR-RUN).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=<sa.json> GCP_PROJECT=<id> GCP_LOCATION=us \
 *   GCP_DOCAI_PROCESSOR=<processor-id> PDFS_DIR=<dir> \
 *   node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-google.ts
 *
 * This sandbox has no GCP credentials or egress, so it refuses cleanly. Run on
 * operator infra (needs `@google-cloud/documentai`). Processes only the single
 * benchmark page (split locally), keeps provenance, writes outputs/google-docai/
 * <id>.json in the shared schema. Then re-run eng-b2-compare.ts / eng-score.ts.
 * No fabricated numbers. published=0.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const PDFS = process.env.PDFS_DIR ?? `${DIR}/pdfs`;
const { GCP_PROJECT, GCP_LOCATION, GCP_DOCAI_PROCESSOR, GOOGLE_APPLICATION_CREDENTIALS } = process.env;

if (!GCP_PROJECT || !GCP_LOCATION || !GCP_DOCAI_PROCESSOR || !GOOGLE_APPLICATION_CREDENTIALS) {
  process.stderr.write(
    "eng-google: REFUSING — missing GCP_PROJECT / GCP_LOCATION / GCP_DOCAI_PROCESSOR / GOOGLE_APPLICATION_CREDENTIALS (and this sandbox has no GCP egress).\n" +
    "On operator infra: npm i @google-cloud/documentai, then set the four env vars and\n" +
    "  PDFS_DIR=... node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-google.ts\n" +
    "Output schema: outputs/google-docai/<id>.json { engine, text, reading_order_text, mean_confidence, provenance }.\n",
  );
  process.exit(3);
}

const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as {
  entries: { id: string; publication_item_id: string; page_number: number; source_url: string }[];
};
// Only the residual hard-case pages need B2, but the adapter will process whatever
// ids are passed via B2_IDS (comma-sep) or default to all.
const only = (process.env.B2_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const require = createRequire(import.meta.url);

function onePage(src: string, page: number): Buffer {
  const out = join(tmpdir(), `g-${process.pid}-${page}.pdf`);
  execFileSync("pdftk", [src, "cat", String(page), "output", out]); // or qpdf; see RUNBOOK
  const b = readFileSync(out); try { execFileSync("rm", ["-f", out]); } catch { /**/ }
  return b;
}

async function main(): Promise<void> {
  const { DocumentProcessorServiceClient } = require("@google-cloud/documentai").v1;
  const client = new DocumentProcessorServiceClient();
  const name = `projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/processors/${GCP_DOCAI_PROCESSOR}`;
  mkdirSync(`${EVAL}/outputs/google-docai`, { recursive: true });
  let done = 0, fail = 0;
  for (const e of manifest.entries) {
    if (only.length && !only.includes(e.id)) continue;
    const src = `${PDFS}/${e.publication_item_id}.pdf`;
    if (!existsSync(src)) { fail++; continue; }
    try {
      const t0 = Date.now();
      const [res] = await client.processDocument({ name, rawDocument: { content: onePage(src, e.page_number).toString("base64"), mimeType: "application/pdf" } });
      const latency = Date.now() - t0;
      const text = res.document?.text ?? "";
      const toks = res.document?.pages?.flatMap((p: any) => p.tokens ?? []) ?? [];
      const conf = toks.length ? toks.reduce((a: number, t: any) => a + (t.layout?.confidence ?? 0), 0) / toks.length * 100 : 0;
      writeFileSync(`${EVAL}/outputs/google-docai/${e.id}.json`, JSON.stringify({
        id: e.id, engine: "google-docai", engine_kind: "cloud-ocr", engine_detail: `Document AI ${GCP_DOCAI_PROCESSOR}`,
        provenance: { publication_item_id: e.publication_item_id, page_number: e.page_number, source_url: e.source_url, machine_derived: true },
        text, reading_order_text: text, mean_confidence: +conf.toFixed(2), latency_ms: latency, unresolved: text.replace(/\s+/g, "").length === 0,
      }, null, 2));
      done++;
    } catch (err) { process.stderr.write(`  [google-fail] ${e.id}: ${(err as Error).message}\n`); fail++; }
  }
  process.stdout.write(`google-docai: ${done} pages (${fail} failed). Now run eng-b2-compare.ts.\n`);
}
main().catch((e) => { process.stderr.write(`eng-google failed: ${(e as Error).message}\n`); process.exit(1); });

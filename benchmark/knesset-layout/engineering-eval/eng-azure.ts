/**
 * ENGINEERING EVAL — cloud candidate adapter: Azure AI Document Intelligence.
 *
 *   AZURE_DI_ENDPOINT=https://<res>.cognitiveservices.azure.com \
 *   AZURE_DI_KEY=<key> PDFS_DIR=<dir> \
 *   node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-azure.ts
 *
 * OPERATOR-RUN: this session has no Azure credentials or network egress to Azure,
 * so it CANNOT run here — it refuses cleanly if creds are absent. Run it on your
 * infra; it writes outputs/azure-di/<id>.json in the shared engine schema, then
 * re-run eng-score.ts to fold Azure into the comparison. No fabricated numbers.
 *
 * Uses the prebuilt-read model (OCR + reading order) via the REST analyze/poll
 * flow. Sends only the single benchmark page (split out locally) — never the
 * whole document — and keeps provenance. published=0.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const PDFS = process.env.PDFS_DIR ?? `${DIR}/pdfs`;
const ENDPOINT = process.env.AZURE_DI_ENDPOINT;
const KEY = process.env.AZURE_DI_KEY;
const API = process.env.AZURE_DI_API_VERSION ?? "2024-11-30";
const MODEL = process.env.AZURE_DI_MODEL ?? "prebuilt-read";

if (!ENDPOINT || !KEY) {
  process.stderr.write(
    "eng-azure: REFUSING — no AZURE_DI_ENDPOINT / AZURE_DI_KEY in env (and this sandbox has no Azure egress).\n" +
    "Run on operator infra:\n" +
    "  AZURE_DI_ENDPOINT=... AZURE_DI_KEY=... PDFS_DIR=... node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-azure.ts\n" +
    "Output schema: outputs/azure-di/<id>.json { engine, text, reading_order_text, mean_confidence, provenance }.\n" +
    "Then: node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-score.ts\n",
  );
  process.exit(3);
}

const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as {
  entries: { id: string; publication_item_id: string; page_number: number; source_url: string }[];
};

/** Extract the single benchmark page to its own PDF so we never send the whole doc. */
function onePage(src: string, page: number): Buffer {
  const out = join(tmpdir(), `az-${process.pid}-${page}.pdf`);
  execFileSync("pdftk", [src, "cat", String(page), "output", out]).toString(); // or qpdf; see RUNBOOK if pdftk absent
  const b = readFileSync(out); try { execFileSync("rm", ["-f", out]); } catch { /**/ }
  return b;
}

async function analyze(pdf: Buffer): Promise<{ text: string; conf: number }> {
  const url = `${ENDPOINT!.replace(/\/$/, "")}/documentintelligence/documentModels/${MODEL}:analyze?api-version=${API}`;
  const post = await fetch(url, { method: "POST", headers: { "Ocp-Apim-Subscription-Key": KEY!, "Content-Type": "application/pdf" }, body: new Uint8Array(pdf) });
  if (post.status !== 202) throw new Error(`analyze HTTP ${post.status}: ${await post.text()}`);
  const op = post.headers.get("operation-location");
  if (!op) throw new Error("no operation-location header");
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const g = await fetch(op, { headers: { "Ocp-Apim-Subscription-Key": KEY! } });
    const j = await g.json() as any;
    if (j.status === "succeeded") {
      const text = j.analyzeResult?.content ?? "";
      const words = (j.analyzeResult?.pages ?? []).flatMap((p: any) => p.words ?? []);
      const conf = words.length ? words.reduce((a: number, w: any) => a + (w.confidence ?? 0), 0) / words.length * 100 : 0;
      return { text, conf };
    }
    if (j.status === "failed") throw new Error(`analyze failed: ${JSON.stringify(j.error ?? {})}`);
  }
  throw new Error("analyze timed out");
}

async function main(): Promise<void> {
  mkdirSync(`${EVAL}/outputs/azure-di`, { recursive: true });
  let done = 0, fail = 0;
  for (const e of manifest.entries) {
    const src = `${PDFS}/${e.publication_item_id}.pdf`;
    if (!existsSync(src)) { fail++; continue; }
    try {
      const { text, conf } = await analyze(onePage(src, e.page_number));
      writeFileSync(`${EVAL}/outputs/azure-di/${e.id}.json`, JSON.stringify({
        id: e.id, engine: "azure-di", engine_kind: "cloud-ocr", engine_detail: `Azure DI ${MODEL} ${API}`,
        provenance: { publication_item_id: e.publication_item_id, page_number: e.page_number, source_url: e.source_url, machine_derived: true },
        text, reading_order_text: text, mean_confidence: +conf.toFixed(2), unresolved: text.replace(/\s+/g, "").length === 0,
      }, null, 2));
      done++;
    } catch (err) { process.stderr.write(`  [azure-fail] ${e.id}: ${(err as Error).message}\n`); fail++; }
  }
  process.stdout.write(`azure-di: ${done} pages (${fail} failed). Now run eng-score.ts.\n`);
}
main().catch((e) => { process.stderr.write(`eng-azure failed: ${(e as Error).message}\n`); process.exit(1); });

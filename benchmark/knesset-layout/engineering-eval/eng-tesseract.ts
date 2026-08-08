/**
 * ENGINEERING EVAL — self-hosted OCR candidate: Tesseract 4 + Hebrew (operator/local).
 *
 *   PDFS_DIR=<dir> node --experimental-strip-types \
 *     benchmark/knesset-layout/engineering-eval/eng-tesseract.ts
 *
 * Rasterizes each benchmark page (pdftoppm, 300dpi) and runs `tesseract -l heb`.
 * Writes outputs/tesseract-heb/<id>.json {text, mean_confidence, provenance}.
 * Fully open, deterministic-enough (fixed engine + dpi + psm). No network, no
 * ground truth, published=0. This is an ENGINEERING candidate, not certification.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const PDFS = process.env.PDFS_DIR ?? `${DIR}/pdfs`;
const DPI = process.env.OCR_DPI ?? "300";
const PSM = process.env.OCR_PSM ?? "3";
const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as {
  entries: { id: string; publication_item_id: string; page_number: number; source_url: string }[];
};

function ocrPage(pdfPath: string, page: number): { text: string; conf: number } {
  const base = join(tmpdir(), `eng-${process.pid}-${page}`);
  execFileSync("pdftoppm", ["-png", "-r", DPI, "-f", String(page), "-l", String(page), "-singlefile", pdfPath, base], { stdio: "ignore" });
  const png = `${base}.png`;
  // TSV gives per-word confidence; reconstruct text from it (order-independent
  // metrics don't need perfect order; grouping by line keeps it readable).
  const tsv = execFileSync("tesseract", [png, "stdout", "-l", "heb", "--psm", PSM, "tsv"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const lines = tsv.split("\n").slice(1);
  const byLine = new Map<string, { conf: number; w: string }[]>();
  let confSum = 0, confN = 0;
  for (const row of lines) {
    const c = row.split("\t"); if (c.length < 12) continue;
    const conf = parseFloat(c[10]); const word = c[11];
    if (!word || !word.trim()) continue;
    if (Number.isFinite(conf) && conf >= 0) { confSum += conf; confN += 1; }
    const key = `${c[2]}-${c[3]}-${c[4]}`; // block-par-line
    (byLine.get(key) ?? byLine.set(key, []).get(key)!).push({ conf, w: word });
  }
  const text = [...byLine.values()].map((ws) => ws.map((x) => x.w).join(" ")).join("\n");
  try { execFileSync("rm", ["-f", png]); } catch { /* ignore */ }
  return { text, conf: confN ? confSum / confN : 0 };
}

function main(): void {
  mkdirSync(`${EVAL}/outputs/tesseract-heb`, { recursive: true });
  let done = 0, fail = 0;
  for (const e of manifest.entries) {
    const outPath = `${EVAL}/outputs/tesseract-heb/${e.id}.json`;
    if (existsSync(outPath) && !process.env.OCR_FORCE) { done++; continue; } // resumable
    const pdfPath = `${PDFS}/${e.publication_item_id}.pdf`;
    if (!existsSync(pdfPath)) { fail++; continue; }
    let text = "", conf = 0;
    try { const r = ocrPage(pdfPath, e.page_number); text = r.text; conf = r.conf; }
    catch (err) { process.stderr.write(`  [ocr-fail] ${e.id}: ${(err as Error).message}\n`); fail++; }
    writeFileSync(`${EVAL}/outputs/tesseract-heb/${e.id}.json`, JSON.stringify({
      id: e.id, engine: "tesseract-heb", engine_kind: "self-hosted-ocr",
      engine_detail: `tesseract 4 + heb, ${DPI}dpi, psm ${PSM}`,
      provenance: { publication_item_id: e.publication_item_id, page_number: e.page_number, source_url: e.source_url, machine_derived: true },
      text, reading_order_text: text, mean_confidence: +conf.toFixed(2),
      unresolved: text.replace(/\s+/g, "").length === 0,
    }, null, 2));
    done++;
    if (done % 20 === 0) process.stderr.write(`  ...${done}/${manifest.entries.length} (last conf ${conf.toFixed(1)})\n`);
  }
  process.stdout.write(`tesseract-heb: ${done} pages OCR'd (${fail} failed/missing).\n`);
}
main();

/**
 * ENGINEERING EVAL — self-hosted layout/OCR candidate adapter: Surya.
 *
 *   PDFS_DIR=<dir> node --experimental-strip-types \
 *     benchmark/knesset-layout/engineering-eval/eng-surya.ts
 *
 * OPERATOR-RUN: Surya needs a GPU and model weights whose licence is restricted
 * for orgs over the revenue threshold (see docs/ingestion/knesset-layout-ocr-
 * evaluation.md) — verify licence before use. This sandbox has neither GPU nor
 * weights, so the adapter refuses cleanly if `surya_ocr` is not on PATH. When you
 * run it on suitable infra it writes outputs/surya/<id>.json in the shared schema;
 * then re-run eng-score.ts. No fabricated numbers. published=0.
 *
 * Surya's CLI/JSON evolves across versions — treat the parse below as a template
 * to adjust to your installed version (see RUNBOOK.md).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const PDFS = process.env.PDFS_DIR ?? `${DIR}/pdfs`;

function have(bin: string): boolean { try { execFileSync("bash", ["-lc", `command -v ${bin}`], { stdio: "ignore" }); return true; } catch { return false; } }
if (!have("surya_ocr")) {
  process.stderr.write(
    "eng-surya: REFUSING — `surya_ocr` not on PATH (and this sandbox has no GPU/weights).\n" +
    "On operator infra: pip install surya-ocr (verify licence), then\n" +
    "  PDFS_DIR=... node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-surya.ts\n" +
    "Output schema: outputs/surya/<id>.json { engine, text, reading_order_text, provenance }. Then run eng-score.ts.\n",
  );
  process.exit(3);
}

const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as {
  entries: { id: string; publication_item_id: string; page_number: number; source_url: string }[];
};

function suryaPage(pdf: string, page: number): string {
  const base = join(tmpdir(), `surya-${process.pid}-${page}`);
  execFileSync("pdftoppm", ["-png", "-r", "300", "-f", String(page), "-l", String(page), "-singlefile", pdf, base], { stdio: "ignore" });
  const png = `${base}.png`; const outDir = `${base}-out`;
  execFileSync("surya_ocr", [png, "--langs", "he", "--output_dir", outDir], { stdio: "ignore" });
  // Surya writes results.json under outDir/<image_stem>/results.json (version-dependent).
  let text = "";
  try {
    const res = JSON.parse(execFileSync("bash", ["-lc", `cat ${outDir}/*/results.json`], { encoding: "utf8" }));
    const first = Object.values(res)[0] as any;
    const lines = (first?.[0]?.text_lines ?? first?.text_lines ?? []) as { text?: string }[];
    text = lines.map((l) => l.text ?? "").join("\n");
  } catch { /* leave empty; adjust parse to your surya version */ }
  try { execFileSync("bash", ["-lc", `rm -rf ${png} ${outDir}`]); } catch { /**/ }
  return text;
}

function main(): void {
  mkdirSync(`${EVAL}/outputs/surya`, { recursive: true });
  let done = 0, fail = 0;
  for (const e of manifest.entries) {
    const src = `${PDFS}/${e.publication_item_id}.pdf`;
    if (!existsSync(src)) { fail++; continue; }
    let text = "";
    try { text = suryaPage(src, e.page_number); } catch (err) { process.stderr.write(`  [surya-fail] ${e.id}: ${(err as Error).message}\n`); fail++; }
    writeFileSync(`${EVAL}/outputs/surya/${e.id}.json`, JSON.stringify({
      id: e.id, engine: "surya", engine_kind: "self-hosted-layout-ocr",
      provenance: { publication_item_id: e.publication_item_id, page_number: e.page_number, source_url: e.source_url, machine_derived: true },
      text, reading_order_text: text, unresolved: text.replace(/\s+/g, "").length === 0,
    }, null, 2));
    done++;
  }
  process.stdout.write(`surya: ${done} pages (${fail} failed). Now run eng-score.ts.\n`);
}
main();

/**
 * ENGINEERING EVAL — hard-case side-by-side artifacts (operator/local).
 *
 *   PDFS_DIR=<dir> node --experimental-strip-types \
 *     benchmark/knesset-layout/engineering-eval/eng-artifacts.ts
 *
 * For the difficult strata (old_font, complex_modern, modern_two_column,
 * doubled_text_layer, image_partial) it renders sample pages and lays the
 * authoritative page image beside each engine's text + the objective metrics,
 * so a human can eyeball where each engine wins/breaks. One self-contained HTML:
 * artifacts/hard-cases.html. Machine-derived, proxy, published=0.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scorePage, type PageMetrics } from "./eng-metrics.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const PDFS = process.env.PDFS_DIR ?? `${DIR}/pdfs`;
const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as {
  entries: { id: string; publication_item_id: string; page_number: number; stratum_tentative: string; source_url: string }[];
};
const readJson = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const esc = (s: string) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

const HARD = ["old_font", "complex_modern", "modern_two_column", "doubled_text_layer", "image_partial"];
const PER = Number(process.env.SAMPLES_PER_STRATUM ?? 2);

function pageImage(pdf: string, page: number): string {
  const base = join(tmpdir(), `art-${process.pid}-${page}`);
  try {
    execFileSync("pdftoppm", ["-png", "-r", "130", "-f", String(page), "-l", String(page), "-singlefile", pdf, base], { stdio: "ignore" });
    const b = readFileSync(`${base}.png`); try { execFileSync("rm", ["-f", `${base}.png`]); } catch { /**/ }
    return `data:image/png;base64,${b.toString("base64")}`;
  } catch { return ""; }
}

const cards: string[] = [];
for (const stratum of HARD) {
  const picks = manifest.entries.filter((e) => e.stratum_tentative === stratum).slice(0, PER);
  for (const e of picks) {
    const ref = readJson(`${EVAL}/reference/${e.id}.json`) ?? { text: "", has_text_layer: false };
    const l2 = readJson(`${EVAL}/outputs/layout-2/${e.id}.json`) ?? {};
    const ocr = readJson(`${EVAL}/outputs/tesseract-heb/${e.id}.json`) ?? {};
    const m2 = scorePage({ id: e.id, engine: "layout-2", stratum, reference: { text: ref.text, has_text_layer: ref.has_text_layer }, output: { text: l2.text ?? "", sections: l2.section_boundaries, captions: l2.marginal_captions, unresolved: l2.unresolved } });
    const mo = scorePage({ id: e.id, engine: "tesseract-heb", stratum, reference: { text: ref.text, has_text_layer: ref.has_text_layer }, output: { text: ocr.text ?? "", unresolved: ocr.unresolved } });
    const img = pageImage(`${PDFS}/${e.publication_item_id}.pdf`, e.page_number);
    const mrow = (m: PageMetrics) => `loss ${m.text_loss_rate == null ? "n/a" : (m.text_loss_rate * 100).toFixed(1) + "%"} · dup ${m.duplication_rate == null ? "n/a" : (m.duplication_rate * 100).toFixed(1) + "%"} · heb ${(m.hebrew_share * 100).toFixed(0)}% · unresolved ${m.unresolved} · failure ${m.failure}`;
    cards.push(`<section>
      <h3>${e.id} — <span class="strat">${stratum}</span> · pub ${e.publication_item_id} p${e.page_number} · ref ${ref.has_text_layer ? "text-layer" : "NO text-layer (scanned)"} ${ref.has_text_layer && (ref.hebrew_share ?? 1) < 0.6 ? "· <b class=warn>garbled (F2)</b>" : ""}</h3>
      <div class="grid">
        <div class="col"><h4>Authoritative page</h4>${img ? `<img src="${img}">` : "<i>image unavailable</i>"}</div>
        <div class="col"><h4>PDF text-layer (reference)</h4><pre dir="rtl">${esc((ref.text ?? "").slice(0, 1600))}</pre></div>
        <div class="col"><h4>layout-2 <span class=mm>${esc(mrow(m2))}</span></h4><pre dir="rtl">${esc((l2.reading_order_text ?? "").slice(0, 1600))}</pre></div>
        <div class="col"><h4>tesseract-heb <span class=mm>${esc(mrow(mo))}</span></h4><pre dir="rtl">${esc((ocr.text ?? "").slice(0, 1600))}</pre></div>
      </div></section>`);
  }
}

const html = `<!doctype html><html lang="he"><head><meta charset="utf-8"><title>LAW ME — Engineering Eval: hard cases</title>
<style>
 body{font:13px/1.5 -apple-system,Segoe UI,Arial;background:#0f1115;color:#e6e6e6;margin:0;padding:16px}
 h1{font-size:18px} .note{color:#8a94a3;max-width:70ch}
 section{border:1px solid #2a2f3a;border-radius:8px;margin:14px 0;padding:10px;background:#161a22}
 h3{margin:.2em 0} .strat{color:#4c8dff} .warn{color:#ffb454}
 .grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px}
 .col{min-width:0} h4{margin:.3em 0;color:#8a94a3;font-size:12px} .mm{color:#ffe08a;font-weight:400}
 img{max-width:100%;border:1px solid #2a2f3a;border-radius:4px;background:#fff}
 pre{white-space:pre-wrap;word-break:break-word;background:#12151c;border:1px solid #2a2f3a;border-radius:6px;padding:8px;max-height:420px;overflow:auto;font:12px/1.5 inherit}
</style></head><body>
<h1>Engineering Evaluation — hard-case side-by-side</h1>
<p class="note"><b>Automatic / proxy engineering artifacts. NOT human-ground-truth accuracy, NOT certification.</b> The page image is the authoritative source; the "PDF text-layer" column is the PDF's own embedded text (a glyph oracle, not truth); layout-2 and tesseract-heb are the machine candidates. Metrics per card are order-independent glyph loss/dup vs the reference + Hebrew-share. published=0.</p>
${cards.join("\n")}
</body></html>`;
mkdirSync(`${EVAL}/artifacts`, { recursive: true });
writeFileSync(`${EVAL}/artifacts/hard-cases.html`, html);
process.stdout.write(`wrote ${EVAL}/artifacts/hard-cases.html (${cards.length} hard-case pages).\n`);

/**
 * ENGINEERING EVAL — extract the objective reference + run layout-2 (operator/local).
 *
 *   PDFS_DIR=<dir with <publication_item_id>.pdf> \
 *   node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-extract.ts
 *
 * For each of the 108 benchmark pages, from the AUTHORITATIVE PDF (no re-download):
 *  1. reference/<id>.json — the PDF's OWN embedded text layer for that page
 *     (order-independent glyph oracle; machine-derived; labelled). has_text_layer
 *     is false for scanned pages.
 *  2. outputs/layout-2/<id>.json — the deterministic layout-2 reconstruction.
 *
 * Reads only the strict-benchmark manifest (membership unchanged) + PDFs. Writes
 * only under engineering-eval/. No ground truth, no freeze, published=0.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { reconstructPage, type LayoutItem } from "../../../src/modules/legal-ai-israel/ingestion/legislation/publication/layout-reconstruct.ts";
import { hebrewShare, stripSpace } from "./eng-metrics.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const EVAL = `${DIR}/engineering-eval`;
const PDFS = process.env.PDFS_DIR ?? `${DIR}/pdfs`;
const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as {
  entries: { id: string; publication_item_id: string; page_number: number; stratum_tentative: string; source_url: string }[];
};
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (d: Buffer, o?: { pagerender?: (p: unknown) => Promise<string> }) => Promise<{ numpages: number }>;

async function pageItems(pdf: Uint8Array, page: number): Promise<LayoutItem[]> {
  let cur = 0; let found: LayoutItem[] = [];
  const pagerender = async (pageData: unknown): Promise<string> => {
    cur += 1;
    if (cur !== page) return "";
    const pd = pageData as { getTextContent: (o?: unknown) => Promise<{ items: { str?: string; transform?: number[]; width?: number; height?: number; fontName?: string }[] }> };
    const tc = await pd.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    found = tc.items.filter((it) => it.str && it.transform).map((it) => ({ str: it.str!, x: it.transform![4], y: it.transform![5], width: it.width ?? (it.str!.length * (it.height ?? 6)), height: it.height, fontName: it.fontName }));
    return "";
  };
  await pdfParse(Buffer.from(pdf), { pagerender });
  return found;
}
const sectionMarkers = (t: string): string[] => (t.match(/(?:^|\n)\s*(\d{1,4}[א-ת]{0,3})\s*\./g) ?? []).map((s) => s.trim().replace(/\.$/, ""));

async function main(): Promise<void> {
  mkdirSync(`${EVAL}/reference`, { recursive: true });
  mkdirSync(`${EVAL}/outputs/layout-2`, { recursive: true });
  const cache = new Map<string, Uint8Array>();
  let done = 0, noText = 0, fail = 0;
  for (const e of manifest.entries) {
    const pdfPath = `${PDFS}/${e.publication_item_id}.pdf`;
    if (!existsSync(pdfPath)) { process.stderr.write(`  [no-pdf] ${e.id} (${e.publication_item_id})\n`); fail++; continue; }
    let pdf = cache.get(e.publication_item_id);
    if (!pdf) { pdf = new Uint8Array(readFileSync(pdfPath)); cache.set(e.publication_item_id, pdf); }
    let items: LayoutItem[] = [];
    try { items = await pageItems(pdf, e.page_number); } catch (err) { process.stderr.write(`  [parse-fail] ${e.id}: ${(err as Error).message}\n`); }

    // Objective reference = the page's embedded text layer (order-independent use).
    const refText = items.map((it) => it.str).join(" ");
    const has_text_layer = stripSpace(refText).length > 0;
    if (!has_text_layer) noText++;
    writeFileSync(`${EVAL}/reference/${e.id}.json`, JSON.stringify({
      id: e.id, publication_item_id: e.publication_item_id, page_number: e.page_number,
      stratum_tentative: e.stratum_tentative,
      source: "PDF embedded text layer (authoritative PDF) — machine-derived; used only as an order-independent glyph oracle, NOT human ground truth",
      source_url: e.source_url,
      has_text_layer, text: refText, char_count: stripSpace(refText).length, hebrew_share: +hebrewShare(refText).toFixed(3),
    }, null, 2));

    // layout-2 output.
    let r;
    try { r = reconstructPage(items); } catch (err) { r = null; process.stderr.write(`  [layout2-fail] ${e.id}: ${(err as Error).message}\n`); }
    const bodyText = r?.bodyText ?? "";
    const captions = (r?.marginalCaptions ?? []).map((c) => c.text);
    writeFileSync(`${EVAL}/outputs/layout-2/${e.id}.json`, JSON.stringify({
      id: e.id, engine: "layout-2", engine_kind: "deterministic-geometry",
      provenance: { publication_item_id: e.publication_item_id, page_number: e.page_number, source_url: e.source_url, machine_derived: true },
      text: bodyText + (captions.length ? "\n" + captions.join("\n") : ""),
      reading_order_text: bodyText,
      marginal_captions: captions,
      section_boundaries: sectionMarkers(bodyText),
      columnType: r?.columnType ?? "unknown",
      unresolved: r?.unresolved ?? true,
      lossless: r?.lossless ?? null,
      layout_confidence: r?.layoutConfidence ?? null,
    }, null, 2));
    done++;
    if (done % 25 === 0) process.stderr.write(`  ...${done}/${manifest.entries.length}\n`);
  }
  process.stdout.write(`extracted reference + layout-2 for ${done}/${manifest.entries.length} pages (no-text-layer ${noText}, pdf/parse fails ${fail}).\n`);
}
main().catch((e) => { process.stderr.write(`eng-extract failed: ${(e as Error).message}\n`); process.exit(1); });

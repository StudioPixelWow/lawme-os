/**
 * F1 evaluation (operator) — run the deterministic layout reconstruction over a
 * stratified sample of real ספר החוקים pages from Object Storage (NO Knesset
 * re-download) and report the metrics the F1 GO gate needs. Read-only: NO writes,
 * NO published changes. Writes artifacts/knesset-layout-eval.json.
 *
 *   node --experimental-strip-types tools/legal-ingest/eval-layout.ts [--pages 60]
 *
 * Metrics: pages evaluated · single vs two-column · marginal-caption detection
 * (count + sample for manual check) · reading-order well-formedness · text-loss
 * rate · caption contamination rate · section-boundary agreement · false-removal
 * count · fallback pages · confidence distribution.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseStorageClient } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/object-storage-supabase.ts";
import { reconstructDocument, type LayoutItem } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/layout-reconstruct.ts";

function loadDotEnv(): void {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, "utf8").split("\n")) {
      const line = raw.trim(); if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("="); if (eq === -1) continue;
      const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  }
}
loadDotEnv();
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { process.stderr.write("eval-layout: SUPABASE_URL + secret/service-role key required\n"); process.exit(2); }
const BUCKET = "legal-source-files";
const pagesEq = process.argv.find((a) => a.startsWith("--pages="))?.split("=")[1];
const pagesIdx = process.argv.indexOf("--pages");
const TARGET_PAGES = Number(pagesEq ?? (pagesIdx >= 0 ? process.argv[pagesIdx + 1] : undefined) ?? "60");
// Cap pages taken per document so the sample spans MANY documents (variety:
// single/two-column, short corrections, long omnibus) rather than one big doc.
const MAX_PAGES_PER_DOC = 6;

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (data: Buffer, opts?: { pagerender?: (p: unknown) => Promise<string> }) => Promise<{ numpages: number }>;

/** Extract per-page geometry items via pdf.js text layer (through pdf-parse). */
async function extractPages(pdf: Uint8Array): Promise<LayoutItem[][]> {
  const pages: LayoutItem[][] = [];
  const pagerender = async (pageData: unknown): Promise<string> => {
    const pd = pageData as { getTextContent: (o?: unknown) => Promise<{ items: { str?: string; transform?: number[]; width?: number; height?: number; fontName?: string }[] }> };
    const tc = await pd.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    const items: LayoutItem[] = [];
    for (const it of tc.items) {
      if (!it.str || !it.transform) continue;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width ?? (it.str.length * (it.height ?? 6)), height: it.height, fontName: it.fontName });
    }
    pages.push(items);
    return "";
  };
  await pdfParse(Buffer.from(pdf), { pagerender });
  return pages;
}

const glyphMultiset = (s: string): Map<string, number> => {
  const m = new Map<string, number>();
  for (const ch of s.replace(/\s/g, "")) m.set(ch, (m.get(ch) ?? 0) + 1);
  return m;
};
/** Count glyphs present in `a` but missing from `b` (false removals). */
function missingGlyphs(a: string, b: string): number {
  const bm = glyphMultiset(b); let miss = 0;
  for (const [ch, n] of glyphMultiset(a)) miss += Math.max(0, n - (bm.get(ch) ?? 0));
  return miss;
}
/** Section-number markers: tokens like "12." / "12א." starting a clause. */
const sectionMarkers = (t: string): string[] => (t.match(/(?:^|\s)(\d{1,4}[א-ת]{0,3})\s*\./gm) ?? []).map((s) => s.trim());

async function main(): Promise<void> {
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, { db: { schema: "legalai" }, auth: { persistSession: false } });
  const storage = createSupabaseStorageClient(supabase);

  // Stratified sample: spread across page sizes (interleave large/small) for a mix
  // of single-page corrections, multi-page laws, and long omnibus documents.
  const { data: cand } = await supabase
    .from("law_publications")
    .select("publication_canonical_id, publication_item_id, publication_type, page_count, pdf_object_key")
    .eq("content_level", "full_text").not("pdf_object_key", "is", null)
    .order("page_count", { ascending: false }).limit(400);
  const rows = (cand ?? []).filter((r) => r.pdf_object_key);
  const interleaved: typeof rows = [];
  for (let i = 0, j = rows.length - 1; i <= j; i++, j--) { interleaved.push(rows[i]); if (i !== j) interleaved.push(rows[j]); }

  // Representative real pages captured for a committed regression fixture test.
  const fixtures: { label: string; pub: string; page: number; items: LayoutItem[] }[] = [];
  const conf = { "lt_0.34": 0, "0.34_0.6": 0, "0.6_0.8": 0, "0.8_1.0": 0 };
  let pagesEval = 0, single = 0, twoCol = 0, fallback = 0, textLossPages = 0, falseRemovals = 0;
  let contamPages = 0, twoColContamDenom = 0, wellFormed = 0, secAgreeNum = 0, secAgreeDen = 0, captionsTotal = 0, docsEval = 0, pageNumberMargins = 0;
  const captionSample: { pub: string; page: number; caption: string }[] = [];

  for (const r of interleaved) {
    if (pagesEval >= TARGET_PAGES) break;
    let bytes: Uint8Array | null = null;
    try { bytes = await storage.get(BUCKET, r.pdf_object_key as string); } catch { continue; }
    if (!bytes) continue;
    let pages: LayoutItem[][]; try { pages = await extractPages(bytes); } catch { continue; }
    if (pages.length === 0) continue;
    docsEval += 1;

    const doc = reconstructDocument(pages);
    let perDoc = 0;
    for (let p = 0; p < doc.pages.length; p++) {
      if (pagesEval >= TARGET_PAGES || perDoc >= MAX_PAGES_PER_DOC) break;
      const pg = doc.pages[p];
      pagesEval += 1; perDoc += 1;
      if (pg.columnType === "two_column") twoCol += 1; else single += 1;
      if (pg.fallbackUsed) fallback += 1;

      // Raw flat text for this page (all items, y↓ then x↓) for loss + section compare.
      const rawText = pages[p].map((i) => i.str).join(" ");
      const outText = pg.bodyText + " " + pg.marginalCaptions.map((c) => c.text).join(" ");
      const miss = missingGlyphs(rawText, outText);
      if (!pg.lossless || miss > 0) { textLossPages += 1; falseRemovals += miss; }

      // Separate REAL section captions (contain Hebrew) from margin noise (running
      // page numbers / footnote refs). Contamination + caption accuracy use real ones.
      const realCaps = pg.marginalCaptions.filter((c) => /[֐-׿]/.test(c.text) && c.text.replace(/\s/g, "").length >= 4);
      const noiseCaps = pg.marginalCaptions.length - realCaps.length;
      const contamThisPage = pg.columnType === "two_column" && realCaps.some((c) => pg.bodyText.includes(c.text));
      if (pg.columnType === "two_column") {
        twoColContamDenom += 1;
        if (contamThisPage) contamPages += 1;
        captionsTotal += realCaps.length;
        pageNumberMargins += noiseCaps;
        for (const c of realCaps.slice(0, 1)) if (captionSample.length < 25) captionSample.push({ pub: r.publication_item_id as string, page: p + 1, caption: c.text });
      }

      // Reading-order well-formedness: lossless AND (single OR no real-caption contamination).
      if (pg.lossless && miss === 0 && !contamThisPage) wellFormed += 1;

      // Section reading-order signal: in a correct reading order the primary
      // section numbers should be non-decreasing. (Comparing to raw PDF-item order
      // is meaningless — that stream is not a reading order.)
      const layNums = sectionMarkers(pg.bodyText).map((s) => parseInt(s, 10)).filter((v) => !Number.isNaN(v));
      for (let k = 1; k < layNums.length; k++) { secAgreeDen += 1; if (layNums[k] >= layNums[k - 1]) secAgreeNum += 1; }

      const c = pg.layoutConfidence;
      if (c < 0.34) conf["lt_0.34"] += 1; else if (c < 0.6) conf["0.34_0.6"] += 1; else if (c < 0.8) conf["0.6_0.8"] += 1; else conf["0.8_1.0"] += 1;

      // Capture real geometry for the regression fixture: one of each page kind,
      // AND up to 6 CONTAMINATED pages (the failure cases) for offline iteration.
      const want = contamThisPage ? "contaminated" : pg.columnType === "two_column" ? "two_column" : pg.fallbackUsed ? "fallback" : "single";
      const contamCount = fixtures.filter((f) => f.label === "contaminated").length;
      const wantContam = want === "contaminated" && contamCount < 6;
      if ((wantContam || !fixtures.some((f) => f.label === want)) && pages[p].length > 0 && pages[p].length < 500) {
        fixtures.push({ label: want, pub: r.publication_item_id as string, page: p + 1, items: pages[p] });
      }
    }
    if (docsEval % 5 === 0) process.stderr.write(`  ...${pagesEval}/${TARGET_PAGES} pages, ${docsEval} docs\n`);
  }

  const pct = (a: number, b: number) => (b ? Number(((a / b) * 100).toFixed(2)) : 100);
  const result = {
    run_at_note: "timestamp added by operator/report",
    layout_version: "layout-1",
    docs_evaluated: docsEval,
    pages_evaluated: pagesEval,
    single_column_pages: single,
    two_column_pages: twoCol,
    marginal_captions_detected: captionsTotal,
    page_number_margins_filtered: pageNumberMargins,
    marginal_caption_detection: "real captions (Hebrew) only; page-number/running-header margins counted separately. TRUE accuracy requires manual label of the sample (no silent ground truth)",
    reading_order_wellformed_pct: pct(wellFormed, pagesEval),
    text_loss_rate_pct: pct(textLossPages, pagesEval),
    false_removal_glyph_count: falseRemovals,
    caption_contamination_rate_pct: pct(contamPages, twoColContamDenom),
    section_number_monotonic_pct: pct(secAgreeNum, secAgreeDen),
    fallback_pages: fallback,
    confidence_distribution: conf,
    go_gate: {
      text_loss_zero: textLossPages === 0 && falseRemovals === 0,
      caption_contamination_le_1pct: pct(contamPages, twoColContamDenom) <= 1,
      reading_order_ge_99pct: pct(wellFormed, pagesEval) >= 99,
      section_number_monotonic_ge_99pct: pct(secAgreeNum, secAgreeDen) >= 99,
      no_high_confidence_false_removals: falseRemovals === 0,
    },
    caption_sample: captionSample,
  };
  writeFileSync("artifacts/knesset-layout-eval.json", JSON.stringify(result, null, 2));
  if (fixtures.length) writeFileSync("artifacts/knesset-layout-fixtures.json", JSON.stringify(fixtures, null, 2));
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.stderr.write(`\nwrote artifacts/knesset-layout-eval.json` + (fixtures.length ? ` + artifacts/knesset-layout-fixtures.json (${fixtures.length} real pages)\n` : `\n`));
}
main().catch((e) => { process.stderr.write(`eval-layout failed: ${(e as Error).message}\n`); process.exit(1); });

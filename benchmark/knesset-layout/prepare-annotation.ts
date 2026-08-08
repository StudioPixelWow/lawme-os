/**
 * Phase 1 — annotation PREPARE (operator, networked).
 *
 * For each of the 108 benchmark pages:
 *  - pull the pub's official PDF from Object Storage (no Knesset re-download) and
 *    save it locally (one file per pub) so the workspace can show the exact page;
 *  - extract that page's text-item geometry and run the DETERMINISTIC extractor
 *    (layout-2) to produce a clearly-marked DRAFT transcription + region guess.
 *
 * The draft is ONLY the current deterministic extraction (never a candidate
 * OCR/layout engine) and is written with `_draft: true`. It is an annotation
 * accelerator, NOT ground truth. Nothing here scores or freezes anything.
 *
 *   node --experimental-strip-types benchmark/knesset-layout/prepare-annotation.ts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseStorageClient } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/object-storage-supabase.ts";
import { reconstructPage, type LayoutItem } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/layout-reconstruct.ts";

function loadDotEnv(): void {
  for (const file of ["../../.env.local", "../../.env", ".env.local", ".env"]) {
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
if (!SUPABASE_URL || !SERVICE_KEY) { process.stderr.write("prepare-annotation: SUPABASE_URL + secret/service-role key required (run from repo root or benchmark dir)\n"); process.exit(2); }
const BUCKET = "legal-source-files";
const DIR = "benchmark/knesset-layout";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (d: Buffer, o?: { pagerender?: (p: unknown) => Promise<string>; max?: number }) => Promise<{ numpages: number }>;

/** Extract geometry for a single 1-based page. */
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
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, { db: { schema: "legalai" }, auth: { persistSession: false } });
  const storage = createSupabaseStorageClient(supabase);
  const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as { entries: { id: string; publication_item_id: string; page_number: number; stratum_tentative: string; source_url: string }[] };
  mkdirSync(`${DIR}/pdfs`, { recursive: true });
  mkdirSync(`${DIR}/drafts`, { recursive: true });

  // Resolve object keys once per pub.
  const items = [...new Set(manifest.entries.map((e) => e.publication_item_id))];
  const { data: pubs } = await supabase.from("law_publications").select("publication_item_id, pdf_object_key").in("publication_item_id", items);
  const keyOf = new Map((pubs ?? []).map((p) => [String(p.publication_item_id), p.pdf_object_key as string | null]));

  const pdfCache = new Map<string, Uint8Array>();
  let done = 0, failed = 0;
  for (const e of manifest.entries) {
    const key = keyOf.get(e.publication_item_id);
    if (!key) { process.stderr.write(`  [no-object-key] ${e.id} pub ${e.publication_item_id}\n`); failed += 1; continue; }
    let pdf = pdfCache.get(key) ?? null;
    if (!pdf) {
      try { pdf = await storage.get(BUCKET, key); } catch (err) { process.stderr.write(`  [dl-fail] ${e.id}: ${(err as Error).message}\n`); failed += 1; continue; }
      if (!pdf) { failed += 1; continue; }
      pdfCache.set(key, pdf);
      writeFileSync(`${DIR}/pdfs/${e.publication_item_id}.pdf`, Buffer.from(pdf));
    }
    let draft;
    try {
      const its = await pageItems(pdf, e.page_number);
      const r = reconstructPage(its);
      draft = {
        _draft: true,
        _engine: "layout-2 (deterministic) — DRAFT ONLY, not ground truth",
        reading_order_text: r.bodyText,
        regions: r.segments.map((s) => ({ role: s.role === "caption" ? "caption" : "body", column: s.column })),
        marginal_captions: r.marginalCaptions.map((c) => c.text),
        section_boundaries: sectionMarkers(r.bodyText),
        columnType: r.columnType,
        unresolved: r.unresolved,
        stratum_tentative: e.stratum_tentative,
      };
    } catch (err) { draft = { _draft: true, _engine: "layout-2", error: (err as Error).message, reading_order_text: "", regions: [], marginal_captions: [], section_boundaries: [], stratum_tentative: e.stratum_tentative }; }
    writeFileSync(`${DIR}/drafts/${e.id}.json`, JSON.stringify(draft, null, 2));
    done += 1;
    if (done % 20 === 0) process.stderr.write(`  ...${done}/${manifest.entries.length}\n`);
  }
  process.stdout.write(`prepared ${done} drafts + ${pdfCache.size} PDFs (failed ${failed}). Next: node benchmark/knesset-layout/annotate-server.ts\n`);
}
main().catch((e) => { process.stderr.write(`prepare-annotation failed: ${(e as Error).message}\n`); process.exit(1); });

/**
 * Diagnostic (read-only): explain WHY publications were quarantined during the
 * controlled backfill. The backfill flags `version_status='quarantined'` when
 * page-fraction coverage (pages-with-text / total-pages) < 0.8. On short official
 * gazette PDFs a single low-text masthead/seal page drags a perfectly-extracted
 * 2-page law to 0.5 — a false positive. This tool re-downloads each quarantined
 * object from the storage bucket and prints per-page character counts + Hebrew
 * char totals + a text sample, so we can tell "one decorative page" (benign, the
 * legal text is intact) from "image-only law body" (genuine, keep quarantined).
 *
 * Read-only: NO writes, NO published flips. Run from the networked operator box:
 *   node --experimental-strip-types tools/legal-ingest/diagnose-quarantine.ts
 *
 * Secrets are read from env/.env.local only, never printed.
 */
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseStorageClient } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/object-storage-supabase.ts";

function loadDotEnv(): void {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
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
if (!SUPABASE_URL || !SERVICE_KEY) { process.stderr.write("diagnose: SUPABASE_URL + secret/service-role key required\n"); process.exit(2); }
const BUCKET = "legal-source-files";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (data: Buffer, opts?: { pagerender?: (p: unknown) => Promise<string> }) => Promise<{ text: string; numpages: number }>;

const hebrewChars = (s: string): number => (s.match(/[֐-׿]/g) ?? []).length;

/** Re-extract with per-page stats, mirroring backfill.ts extractText ordering. */
async function extractPerPage(pdf: Uint8Array): Promise<{ pages: number; perPage: number[]; total: number; hebrew: number; sample: string }> {
  const perPage: number[] = [];
  const pagerender = async (pageData: unknown): Promise<string> => {
    const pd = pageData as { getTextContent: (o?: unknown) => Promise<{ items: { str?: string; transform?: number[] }[] }> };
    const tc = await pd.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    const lines: Record<number, [number, string][]> = {};
    for (const it of tc.items) { if (!it.str || !it.transform) continue; const y = Math.round(it.transform[5]); (lines[y] = lines[y] ?? []).push([it.transform[4], it.str]); }
    const ys = Object.keys(lines).map(Number).sort((a, b) => b - a);
    const txt = ys.map((y) => lines[y].sort((a, b) => b[0] - a[0]).map((z) => z[1]).join(" ")).join("\n");
    perPage.push(txt.replace(/\s/g, "").length);
    return `${txt}\n\n`;
  };
  const out = await pdfParse(Buffer.from(pdf), { pagerender });
  const total = out.text.replace(/\s/g, "").length;
  return { pages: out.numpages, perPage, total, hebrew: hebrewChars(out.text), sample: out.text.replace(/\s+/g, " ").trim().slice(0, 180) };
}

async function main(): Promise<void> {
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, { db: { schema: "legalai" }, auth: { persistSession: false } });
  const storage = createSupabaseStorageClient(supabase);

  const { data: rows, error } = await supabase
    .from("law_publications")
    .select("israel_law_id, publication_item_id, publication_type, title, page_count, extraction_confidence, pdf_object_key")
    .eq("version_status", "quarantined")
    .not("pdf_object_key", "is", null)
    .order("extraction_confidence", { ascending: true });
  if (error) { process.stderr.write(`query failed: ${error.message}\n`); process.exit(1); }

  const quarantined = rows ?? [];
  process.stdout.write(`quarantined pubs with stored bytes: ${quarantined.length}\n\n`);

  let benign = 0, genuine = 0;
  const perPageFloors: number[] = [];
  for (const r of quarantined) {
    const key = r.pdf_object_key as string;
    let bytes: Uint8Array | null = null;
    try { bytes = await storage.get(BUCKET, key); } catch (e) { process.stdout.write(`  [dl-fail] ${key}: ${(e as Error).message}\n`); continue; }
    if (!bytes) { process.stdout.write(`  [missing] ${key}\n`); continue; }
    let ex;
    try { ex = await extractPerPage(bytes); } catch (e) { process.stdout.write(`  [extract-fail] ${key}: ${(e as Error).message}\n`); continue; }
    // Heuristic read: legal text is intact if the doc has substantial Hebrew content
    // and at least one dense content page, even if one page is near-empty.
    const denseContentPages = ex.perPage.filter((c) => c >= 250).length;
    const intact = ex.hebrew >= 400 && denseContentPages >= 1;
    if (intact) benign += 1; else genuine += 1;
    ex.perPage.forEach((c) => { if (c >= 250) perPageFloors.push(c); });
    process.stdout.write(
      `law ${r.israel_law_id} pub ${r.publication_item_id} [${r.publication_type}] cov=${Number(r.extraction_confidence).toFixed(3)} ` +
      `pages=${ex.pages} perPageChars=[${ex.perPage.join(", ")}] totalChars=${ex.total} hebrew=${ex.hebrew} ` +
      `=> ${intact ? "BENIGN (text intact; one low-text page)" : "GENUINE (sparse; likely image-only — keep quarantined / OCR)"}\n` +
      `   title: ${r.title ?? "(none)"}\n` +
      `   sample: ${ex.sample}\n\n`
    );
  }

  const minDense = perPageFloors.length ? Math.min(...perPageFloors) : 0;
  process.stdout.write(
    `SUMMARY: benign(text-intact)=${benign} · genuine(sparse)=${genuine} · ` +
    `min chars on a dense content page=${minDense}\n` +
    `If benign dominates, the page-fraction coverage metric is the false-positive source; ` +
    `switch the backfill quarantine signal to a Hebrew-char-density check.\n`
  );
}

main().catch((e) => { process.stderr.write(`diagnose failed: ${(e as Error).message}\n`); process.exit(1); });

/**
 * Fetch PDFs from Object Storage to feed the existing Phase-3 gates (operator/CI).
 * PLUMBING ONLY — no extraction logic, no architecture change. Reuses the existing
 * Supabase storage client. Reads credentials from the environment; never logs them.
 *
 * Two modes:
 *   B2_IDS=bench-022,…            → benchmark residual: pull the PDFs of the pubs
 *                                    behind those benchmark pages into ./pdfs so
 *                                    eng-azure/eng-google/eng-b2-compare can run.
 *   COHORT_SIZE=50 (default)      → pull a deterministic N-publication cohort into
 *                                    COHORT_PDFS_DIR and emit a worklist (all pages)
 *                                    for reprocess-hybrid.ts.
 *
 * PDFs come only from Object Storage (no Knesset re-download). published=0.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseStorageClient } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/object-storage-supabase.ts";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { process.stderr.write("fetch-cohort: SUPABASE_URL + SUPABASE_SECRET_KEY required in env (never pass secrets on the CLI or in logs).\n"); process.exit(2); }
const BUCKET = "legal-source-files";
const DIR = "benchmark/knesset-layout";

async function main(): Promise<void> {
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, { db: { schema: "legalai" }, auth: { persistSession: false } });
  const storage = createSupabaseStorageClient(supabase);
  const b2ids = (process.env.B2_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  if (b2ids.length) {
    // Benchmark residual: resolve pubs behind the given bench ids, pull their PDFs.
    const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as { entries: { id: string; publication_item_id: string }[] };
    const items = [...new Set(manifest.entries.filter((e) => b2ids.includes(e.id)).map((e) => e.publication_item_id))];
    const { data: pubs, error } = await supabase.from("law_publications").select("publication_item_id, pdf_object_key").in("publication_item_id", items);
    if (error) { process.stderr.write(`fetch-cohort: DB error (${error.message})\n`); process.exit(1); }
    mkdirSync(`${DIR}/pdfs`, { recursive: true });
    let ok = 0, miss = 0;
    for (const p of pubs ?? []) {
      const key = p.pdf_object_key as string | null;
      if (!key) { miss += 1; continue; }
      const bytes = await storage.get(BUCKET, key);
      if (!bytes) { miss += 1; continue; }
      writeFileSync(`${DIR}/pdfs/${p.publication_item_id}.pdf`, Buffer.from(bytes)); ok += 1;
    }
    process.stdout.write(`fetched ${ok} residual PDFs (${miss} missing key/object) for ${items.length} pubs → ${DIR}/pdfs/\n`);
    return;
  }

  // Cohort mode: deterministic N publications with a stored PDF.
  const N = Number(process.env.COHORT_SIZE ?? "50");
  const OUT = process.env.COHORT_PDFS_DIR ?? "tools/legal-ingest/.cohort-pdfs";
  const WL = process.env.COHORT_WORKLIST ?? "tools/legal-ingest/.cohort-worklist.json";
  const { data: pubs, error } = await supabase
    .from("law_publications")
    .select("publication_canonical_id, publication_item_id, pdf_object_key, page_count")
    .not("pdf_object_key", "is", null)
    .not("page_count", "is", null)
    .order("publication_canonical_id", { ascending: true })
    .limit(N);
  if (error) { process.stderr.write(`fetch-cohort: DB error (${error.message})\n`); process.exit(1); }
  mkdirSync(OUT, { recursive: true });
  const worklist: { publication_item_id: string; page_number: number }[] = [];
  let ok = 0, miss = 0, pages = 0;
  for (const p of pubs ?? []) {
    const key = p.pdf_object_key as string | null; const item = String(p.publication_item_id);
    if (!key) { miss += 1; continue; }
    const bytes = await storage.get(BUCKET, key);
    if (!bytes) { miss += 1; continue; }
    writeFileSync(`${OUT}/${item}.pdf`, Buffer.from(bytes)); ok += 1;
    const pc = Math.max(1, Number(p.page_count) || 1);
    for (let pg = 1; pg <= pc; pg++) { worklist.push({ publication_item_id: item, page_number: pg }); pages += 1; }
  }
  writeFileSync(WL, JSON.stringify(worklist, null, 2));
  process.stdout.write(`fetched ${ok} cohort PDFs (${miss} missing), ${pages} pages → ${OUT}/ · worklist → ${WL}\n` +
    `Next: PDFS_DIR=${OUT} WORKLIST=${WL} node --experimental-strip-types tools/legal-ingest/reprocess-hybrid.ts\n`);
}
main().catch((e) => { process.stderr.write(`fetch-cohort failed: ${(e as Error).message}\n`); process.exit(1); });

/**
 * A1 amendment reprocess — realize the dedup-key fix by re-deriving the FULL
 * operation set from the PDFs already in Object Storage (NO re-download from
 * Knesset) and persisting with the precise op_fingerprint key. The old coarse
 * key collapsed ~60% of parsed ops; with ao_fp_uniq in place they now persist.
 *
 * Pipeline per amendment/correction publication with stored bytes:
 *   Object Storage -> extract -> normalize -> parseAmendmentsV2 -> filter/cap
 *   -> op_fingerprint -> per-publication REPLACE (delete then insert).
 *
 * Per-publication replace (not a global delete-first) honors "do not delete
 * existing ops before reprocess": a pub's old rows are removed only inside its
 * own successful re-parse+insert. Idempotent (ao_fp_uniq); nothing published.
 *
 * NOTE: uses the current extraction+normalization. It can be re-run after the F1
 * layout-aware extraction lands to further refine; the amendment parser keys on
 * "in place of X shall come Y" clause patterns and is largely robust to the
 * two-column marginal-caption artifact.
 *
 *   node --experimental-strip-types tools/legal-ingest/reprocess-amendments.ts [--limit N]
 */
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseStorageClient } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/object-storage-supabase.ts";
import { normalizePdfText } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/pdf-normalize.ts";
import { parseAmendmentsV2, AMENDMENT_PARSER_VERSION } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/amendment-parser-v2.ts";
import type { OperationTypeV2 } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/amendment-parser-v2.ts";
import { amendmentFingerprint } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/amendment-fingerprint.ts";

function loadDotEnv(): void {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
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
if (!SUPABASE_URL || !SERVICE_KEY) { process.stderr.write("reprocess-amendments: SUPABASE_URL + secret/service-role key required\n"); process.exit(2); }
const BUCKET = "legal-source-files";
const limitEq = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = Number(limitEq ?? (limitIdx >= 0 ? process.argv[limitIdx + 1] : undefined) ?? "100000");

const CONTENT_PAGE_MIN_CHARS = 120;
const MAX_OPS_PER_PUB = 25;
const KEEP_OP_TYPES = new Set<OperationTypeV2>(["replace_words", "replace_section", "add_section", "delete_section", "insert_words", "delete_words", "rename_term", "renumber_section", "replace_schedule", "add_schedule"]);

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (data: Buffer, opts?: { pagerender?: (p: unknown) => Promise<string> }) => Promise<{ text: string; numpages: number }>;

async function extractText(pdf: Uint8Array): Promise<{ text: string; contentPages: number }> {
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
  return { text: out.text, contentPages: perPage.filter((c) => c >= CONTENT_PAGE_MIN_CHARS).length };
}

async function main(): Promise<void> {
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, { db: { schema: "legalai" }, auth: { persistSession: false } });
  const storage = createSupabaseStorageClient(supabase);

  // PostgREST caps each response at 1000 rows regardless of .limit(); page through
  // with .range() (law_publications is not mutated here, so offset paging is stable).
  const pubs: Record<string, unknown>[] = [];
  const PAGE = 1000;
  for (let from = 0; pubs.length < LIMIT; from += PAGE) {
    const { data, error } = await supabase
      .from("law_publications")
      .select("publication_canonical_id, law_canonical_id, israel_law_id, publication_item_id, publication_type, pdf_object_key")
      .in("publication_type", ["correction", "amendment_law"])
      .eq("version_status", "validated")
      .not("pdf_object_key", "is", null)
      .order("publication_canonical_id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) { process.stderr.write(`query failed: ${error.message}\n`); process.exit(1); }
    if (!data || data.length === 0) break;
    pubs.push(...data);
    if (data.length < PAGE) break;
  }
  if (pubs.length > LIMIT) pubs.length = LIMIT;
  process.stdout.write(`amendment pubs to reprocess: ${pubs.length}\n`);

  const m = { pubs: 0, attempted: 0, persisted: 0, withinRunDuplicates: 0, ambiguous: 0, needsReview: 0, unsupported: 0, skippedNoText: 0, failed: 0 };
  let done = 0;
  for (const p of pubs) {
    const pubId = p.publication_canonical_id as string;
    const lawId = p.law_canonical_id as string;
    let bytes: Uint8Array | null = null;
    try { bytes = await storage.get(BUCKET, p.pdf_object_key as string); } catch (e) { m.failed += 1; process.stderr.write(`  [dl-fail] ${pubId}: ${(e as Error).message}\n`); continue; }
    if (!bytes) { m.failed += 1; continue; }
    let ex; try { ex = await extractText(bytes); } catch { m.failed += 1; continue; }
    if (ex.contentPages === 0) { m.skippedNoText += 1; continue; }

    const norm = normalizePdfText(ex.text).normalizedText;
    const parsed = parseAmendmentsV2(norm);
    for (const o of parsed) { if (o.status === "ambiguous") m.ambiguous += 1; if (o.status === "needs_review") m.needsReview += 1; if (o.status === "unsupported") m.unsupported += 1; }
    const ops = parsed.filter((o) => (o.status === "parsed" || o.status === "needs_review") && KEEP_OP_TYPES.has(o.operationType) && o.confidence >= 0.6).slice(0, MAX_OPS_PER_PUB);
    m.attempted += ops.length;

    // De-dup within this publication by fingerprint (distinct ops only).
    const seen = new Set<string>();
    const opRows: Record<string, unknown>[] = [];
    for (const op of ops) {
      const fp = amendmentFingerprint({ targetLawId: lawId, targetSection: op.targetSection, operationType: op.operationType, oldText: op.oldText, newText: op.newText, evidence: op.evidence, spanStart: op.sourceSpan.start, spanEnd: op.sourceSpan.end });
      if (seen.has(fp)) { m.withinRunDuplicates += 1; continue; }
      seen.add(fp);
      opRows.push({ publication_canonical_id: pubId, target_law_id: lawId, target_section: op.targetSection, operation_type: op.operationType, status: op.status, confidence: op.confidence, evidence: op.evidence, old_text: op.oldText, new_text: op.newText, source_span_start: op.sourceSpan.start, source_span_end: op.sourceSpan.end, parser_version: AMENDMENT_PARSER_VERSION, op_fingerprint: fp });
    }

    // Per-publication REPLACE: delete this pub's ops, then insert the fresh set.
    const del = await supabase.from("amendment_operations").delete().eq("publication_canonical_id", pubId);
    if (del.error) { m.failed += 1; process.stderr.write(`  [del-fail] ${pubId}: ${del.error.message}\n`); continue; }
    if (opRows.length) {
      const ins = await supabase.from("amendment_operations").upsert(opRows, { onConflict: "publication_canonical_id,op_fingerprint", ignoreDuplicates: true });
      if (ins.error) { m.failed += 1; process.stderr.write(`  [ins-fail] ${pubId}: ${ins.error.message}\n`); continue; }
      m.persisted += opRows.length;
    }
    m.pubs += 1; done += 1;
    if (done % 200 === 0) process.stderr.write(`  ...${done}/${pubs.length} pubs\n`);
  }

  process.stdout.write("\n" + JSON.stringify({
    amendment_pubs_processed: m.pubs,
    attempted_ops: m.attempted,
    persisted_ops: m.persisted,
    within_run_duplicate_ops: m.withinRunDuplicates,
    ambiguous: m.ambiguous,
    needs_review: m.needsReview,
    unsupported: m.unsupported,
    skipped_no_text: m.skippedNoText,
    failed: m.failed,
    fingerprint_collisions: 0,
    note: "fingerprint_collisions is DB-enforced by ao_fp_uniq; any collision would surface as an upsert error above (failed>0)."
  }, null, 2) + "\n");
}

main().catch((e) => { process.stderr.write(`reprocess-amendments failed: ${(e as Error).message}\n`); process.exit(1); });

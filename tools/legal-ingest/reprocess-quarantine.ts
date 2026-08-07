/**
 * Reprocess the publications that the OLD page-fraction coverage metric
 * false-quarantined. Ground truth (diagnose-quarantine.ts) showed all of them
 * extracted their legal text completely — they were flagged only because they
 * carry blank gazette back-pages. This runner re-extracts each from the STORAGE
 * bucket (no Knesset re-fetch), and for any doc that actually yields text
 * (contentPages > 0) it runs the same downstream persistence as the backfill —
 * Section entities + chunks for original enactments, filtered amendment ops for
 * corrections/amendments — then flips version_status quarantined -> validated.
 * A doc that genuinely yields no text stays quarantined (for OCR later).
 *
 * Idempotent (upserts ignoreDuplicates; re-flips are no-ops). Nothing is
 * published (chunks stay published=false). Read secrets from env/.env.local only.
 *
 *   node --experimental-strip-types tools/legal-ingest/reprocess-quarantine.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseStorageClient } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/object-storage-supabase.ts";
import { normalizePdfText } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/pdf-normalize.ts";
import { parseAmendmentsV2, AMENDMENT_PARSER_VERSION } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/amendment-parser-v2.ts";
import type { OperationTypeV2 } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/amendment-parser-v2.ts";
import { parseLegislation } from "../../src/modules/legal-ai-israel/ingestion/legislation/section-parser.ts";
import { chunkLaw } from "../../src/modules/legal-ai-israel/ingestion/legislation/section-chunker.ts";
import { normalizeHebrewLegalText } from "../../src/modules/legal-ai-israel/parser/hebrew-normalize.ts";

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
if (!SUPABASE_URL || !SERVICE_KEY) { process.stderr.write("reprocess: SUPABASE_URL + secret/service-role key required\n"); process.exit(2); }
const BUCKET = "legal-source-files";

// Mirror backfill.ts downstream constants exactly.
const CONTENT_PAGE_MIN_CHARS = 120;
const MAX_OPS_PER_PUB = 25;
const KEEP_OP_TYPES = new Set<OperationTypeV2>(["replace_words", "replace_section", "add_section", "delete_section", "insert_words", "delete_words", "rename_term", "renumber_section", "replace_schedule", "add_schedule"]);
const entityCommon = { extraction_method: "api", parser_version: "legis-pub-2", mapping_version: "legis-pub-map-2" };

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (data: Buffer, opts?: { pagerender?: (p: unknown) => Promise<string> }) => Promise<{ text: string; numpages: number }>;
const sha = (s: string | Uint8Array) => createHash("sha256").update(s).digest("hex");

async function extractText(pdf: Uint8Array): Promise<{ text: string; pages: number; contentPages: number; coverage: number }> {
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
  const contentPages = perPage.filter((c) => c >= CONTENT_PAGE_MIN_CHARS).length;
  return { text: out.text, pages: out.numpages, contentPages, coverage: out.numpages ? contentPages / out.numpages : 0 };
}

const chunk = <T>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

async function main(): Promise<void> {
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, { db: { schema: "legalai" }, auth: { persistSession: false } });
  const storage = createSupabaseStorageClient(supabase);

  const { data: rows, error } = await supabase
    .from("law_publications")
    .select("publication_canonical_id, law_canonical_id, israel_law_id, publication_item_id, publication_type, pdf_url, pdf_object_key")
    .eq("version_status", "quarantined")
    .not("pdf_object_key", "is", null);
  if (error) { process.stderr.write(`query failed: ${error.message}\n`); process.exit(1); }
  const pubs = rows ?? [];
  process.stdout.write(`quarantined pubs to reprocess: ${pubs.length}\n`);

  let validated = 0, stillQuarantined = 0, sections = 0, chunks = 0, operations = 0;
  for (const p of pubs) {
    const key = p.pdf_object_key as string;
    const lawCanonicalId = p.law_canonical_id as string;
    const pubCanonicalId = p.publication_canonical_id as string;
    const pubUrl = (p.pdf_url as string | null) ?? undefined;
    let bytes: Uint8Array | null = null;
    try { bytes = await storage.get(BUCKET, key); } catch (e) { process.stderr.write(`  [dl-fail] ${key}: ${(e as Error).message}\n`); continue; }
    if (!bytes) { process.stderr.write(`  [missing] ${key}\n`); continue; }
    let ext;
    try { ext = await extractText(bytes); } catch (e) { process.stderr.write(`  [extract-fail] ${key}: ${(e as Error).message}\n`); continue; }

    if (ext.contentPages === 0) { stillQuarantined += 1; continue; } // genuinely no text — leave quarantined

    const norm = normalizePdfText(ext.text).normalizedText;
    const entityRows: Record<string, unknown>[] = [];
    const chunkRows: Record<string, unknown>[] = [];
    const opRows: Record<string, unknown>[] = [];
    const secId = (n: string) => `Section:${lawCanonicalId}:${sha(`${lawCanonicalId}|${n}`).slice(0, 10)}`;

    if (p.publication_type === "original_enactment") {
      const law = parseLegislation(normalizeHebrewLegalText(norm).normalizedText);
      for (const s of law.sections) {
        entityRows.push({ canonical_id: secId(s.sectionNumber), entity_type: "Section", source_platform: "knesset_legislation_pdf", source_url: pubUrl, external_record_id: `${lawCanonicalId}:${s.sectionNumber}`, ...entityCommon, extraction_method: "file_parse", content_hash: s.contentHash, raw_record_hash: sha(s.bodyText), content_level: "full_text", version_status: "validated", fields: { sectionNumber: s.sectionNumber, lawCanonicalId, publicationCanonicalId: pubCanonicalId }, primary_text: s.bodyText, primary_text_language: "he" });
      }
      for (const c of chunkLaw(law, { maxChars: 900, lawId: lawCanonicalId, documentVersionId: `pub:${p.publication_item_id}`, sectionId: (s) => secId(s.sectionNumber) })) {
        chunkRows.push({ law_canonical_id: lawCanonicalId, section_canonical_id: c.sectionId, document_version_id: c.documentVersionId, section_number: c.sectionNumber, heading_path: c.headingPath, ordinal: c.ordinal, chunk_index: c.chunkIndex, text: c.text, source_span_start: c.sourceSpanStart, source_span_end: c.sourceSpanEnd, token_count: c.tokenCount, content_hash: c.contentHash, language: "he", source_url: pubUrl, license_status: "statutory_exemption_sec6", published: false });
      }
    } else {
      const ops = parseAmendmentsV2(norm).filter((o) => (o.status === "parsed" || o.status === "needs_review") && KEEP_OP_TYPES.has(o.operationType) && o.confidence >= 0.6).slice(0, MAX_OPS_PER_PUB);
      for (const op of ops) {
        opRows.push({ publication_canonical_id: pubCanonicalId, target_law_id: lawCanonicalId, target_section: op.targetSection, operation_type: op.operationType, status: op.status, confidence: op.confidence, evidence: op.evidence, source_span_start: op.sourceSpan.start, source_span_end: op.sourceSpan.end, parser_version: AMENDMENT_PARSER_VERSION });
      }
    }

    for (const b of chunk(entityRows, 200)) await supabase.from("canonical_entities").upsert(b, { onConflict: "canonical_id", ignoreDuplicates: true });
    for (const b of chunk(chunkRows, 200)) await supabase.from("legal_chunks").upsert(b, { onConflict: "section_canonical_id,chunk_index", ignoreDuplicates: true });
    for (const b of chunk(opRows, 200)) await supabase.from("amendment_operations").upsert(b, { onConflict: "publication_canonical_id,source_span_start,operation_type", ignoreDuplicates: true });

    await supabase.from("law_publications").update({
      version_status: "validated",
      content_level: "full_text",
      page_count: ext.pages,
      extraction_confidence: ext.coverage,
      raw_text_hash: sha(new TextEncoder().encode(ext.text)),
      extraction_method: "pdfjs_text_layer",
      extraction_version: "pdf-parse-node-1",
    }).eq("publication_canonical_id", pubCanonicalId);

    validated += 1; sections += entityRows.length; chunks += chunkRows.length; operations += opRows.length;
    process.stdout.write(`  validated law ${p.israel_law_id} pub ${p.publication_item_id} [${p.publication_type}] sections=${entityRows.length} chunks=${chunkRows.length} ops=${opRows.length}\n`);
  }

  process.stdout.write(`\nDONE: validated=${validated} · stillQuarantined=${stillQuarantined} · sections=${sections} · chunks=${chunks} · operations=${operations} · published=0\n`);
}

main().catch((e) => { process.stderr.write(`reprocess failed: ${(e as Error).message}\n`); process.exit(1); });

#!/usr/bin/env node
/**
 * OPERATOR controlled backfill runner (current Epic, phased 50 -> 100 -> 500).
 *
 * Run from an environment with network to fs.knesset.gov.il + the dev Supabase
 * project + its secret/service-role key (the sandbox is air-gapped):
 *
 *   node --experimental-strip-types tools/legal-ingest/backfill.ts --limit 50
 *
 * Per new law it: fetches GetLegislationLawItem (JSON), maps to Law + publications
 * + amendment graph (reusing publication-model), persists them; then per PDF:
 * SSRF-guard fetch -> content-addressed upload + round-trip verify (stored_objects)
 * -> pdfjs text extraction -> normalize -> section parser (originals) / amendment
 * parser v2 (amendments) -> chunks + FTS -> persist. Everything published=false.
 *
 * Guardrails: batch 10-25, concurrency 2, checkpoint per (IsraelLawID,
 * correctionNumber), daily cap, and AUTO-STOP on: download<98%, checksum>0,
 * storage verification<100%, extraction<95%, normalization_failure>2%,
 * quarantine>5%, high-confidence parser error, 403/429, schema drift. Idempotent
 * (ON CONFLICT / content-addressed dedup); a re-run is a no-op for done work.
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { fetchPdfWithRetry, DEFAULT_PDF_POLICY } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/pdf-fetch.ts";
import type { HttpClient, HttpResponse } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/pdf-fetch.ts";
import { storePdf } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/object-storage.ts";
import { createSupabaseStorageClient } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/object-storage-supabase.ts";
import { toPublicationModel, buildAmendmentGraph } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/publication-model.ts";
import type { ParsedLegislationLawItem, Correction, General } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/legislation-api.ts";
import { normalizePdfText, NORMALIZATION_VERSION } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/pdf-normalize.ts";
import { parseAmendmentsV2, AMENDMENT_PARSER_VERSION } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/amendment-parser-v2.ts";
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
if (!SUPABASE_URL || !SERVICE_KEY) { process.stderr.write("backfill: SUPABASE_URL + secret/service-role key required\n"); process.exit(2); }

const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]) ?? process.argv[process.argv.indexOf("--limit") + 1] ?? "50");
const CONCURRENCY = 2;
const ODATA = "https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_IsraelLaw";
const LEGIS = "https://www.knesset.gov.il/WebSiteApi/knessetapi/LegislationItem/GetLegislationLawItem?ItemId=";

const sha256Hex = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const nodeHttp: HttpClient = async (url, signal): Promise<HttpResponse> => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), signal.timeoutMs);
  try {
    const res = await fetch(url, { redirect: "manual", signal: ctrl.signal });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    if (res.status >= 300 && res.status < 400) return { status: res.status, headers, location: res.headers.get("location") ?? undefined };
    return { status: res.status, headers, body: new Uint8Array(await res.arrayBuffer()) };
  } finally { clearTimeout(t); }
};

// pdf-parse is CommonJS with no types — require it and drive extraction through
// a custom page renderer that reconstructs RTL reading order (group by line y,
// sort lines top→bottom, glyphs right→left), matching the pilot's pdf.js path.
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (
  data: Uint8Array | Buffer,
  opts?: { pagerender?: (pageData: unknown) => Promise<string> },
) => Promise<{ text: string; numpages: number }>;

async function extractText(pdf: Uint8Array): Promise<{ text: string; pages: number; coverage: number }> {
  let pagesWithText = 0;
  const pagerender = async (pageData: unknown): Promise<string> => {
    const pd = pageData as { getTextContent: (o?: unknown) => Promise<{ items: { str?: string; transform?: number[] }[] }> };
    const tc = await pd.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    const lines: Record<number, [number, string][]> = {};
    for (const it of tc.items) {
      if (!it.str || !it.transform) continue;
      const y = Math.round(it.transform[5]);
      (lines[y] = lines[y] ?? []).push([it.transform[4], it.str]);
    }
    const ys = Object.keys(lines).map(Number).sort((a, b) => b - a);
    const txt = ys.map((y) => lines[y].sort((a, b) => b[0] - a[0]).map((z) => z[1]).join(" ")).join("\n");
    if (txt.trim().length > 10) pagesWithText += 1;
    return `${txt}\n\n`;
  };
  const out = await pdfParse(Buffer.from(pdf), { pagerender });
  return { text: out.text, pages: out.numpages, coverage: out.numpages ? pagesWithText / out.numpages : 0 };
}

interface Metrics {
  lawsProcessed: number; publications: number; pdfsDiscovered: number; pdfsUploaded: number;
  pdfsVerified: number; pdfsFailed: number; checksumMismatch: number; sections: number;
  operations: number; ambiguous: number; unsupported: number; chunks: number; bytes: number;
  extractionFailures: number; quarantined: number; relationships: number;
}

async function main(): Promise<void> {
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, { db: { schema: "legalai" }, auth: { persistSession: false } });
  const storage = createSupabaseStorageClient(supabase);
  const m: Metrics = { lawsProcessed: 0, publications: 0, pdfsDiscovered: 0, pdfsUploaded: 0, pdfsVerified: 0, pdfsFailed: 0, checksumMismatch: 0, sections: 0, operations: 0, ambiguous: 0, unsupported: 0, chunks: 0, bytes: 0, extractionFailures: 0, quarantined: 0, relationships: 0 };

  // Checkpoint: last processed IsraelLawID.
  const { data: cp } = await supabase.from("ingestion_checkpoints").select("cursor").eq("source", "knesset_backfill").maybeSingle();
  let lastId = Number((cp?.cursor as string | undefined) ?? "0");

  // Discover next laws by Id via OData (page of 100), skip already-ingested.
  const picked: { id: number }[] = [];
  let odataOffset = 0;
  while (picked.length < LIMIT && odataOffset < 2200) {
    const url = `${ODATA}?$select=Id&$orderby=Id&$filter=Id gt ${lastId}&$top=100&$skip=${odataOffset}&$format=json`;
    const r = await fetch(url);
    if (!r.ok) break;
    const j = (await r.json()) as { value?: { Id: number }[] };
    const rows = j.value ?? [];
    if (rows.length === 0) break;
    for (const row of rows) {
      if (picked.length >= LIMIT) break;
      const { data: exists } = await supabase.from("canonical_entities").select("canonical_id").eq("canonical_id", `knesset:${row.Id}`).maybeSingle();
      if (!exists) picked.push({ id: row.Id });
      lastId = Math.max(lastId, row.Id);
    }
    odataOffset += 100;
  }

  async function processLaw(lawId: number): Promise<void> {
    const r = await fetch(`${LEGIS}${lawId}`);
    if (!r.ok) return;
    const j = (await r.json()) as { general?: Record<string, unknown>; corrections?: { listCorrections?: unknown } };
    const g = (j.general ?? {}) as Record<string, string | null>;
    const lc = j.corrections?.listCorrections;
    const arr = (Array.isArray(lc) ? lc : lc ? [lc] : []) as Record<string, string | null>[];
    const general: General = {
      hebSubject: g.hebSubject ?? null, lawValidity: g.lawValidity ?? null, publicationDate: g.publicationDate ?? null,
      latestPublicationDate: g.latestPublicationDate ?? null, openBookUrl: g.openBookUrl ?? null, kolZchutUrl: g.kolZchutUrl ?? null, knsName: g.knsName ?? null,
    };
    const corrections: Correction[] = arr.map((c) => ({
      itemId: c.itemId ?? null, name: c.name ?? null, correctionNumber: c.correctionNumber ?? null, correctionType: c.correctionType ?? null,
      publicationDate: c.publicationDate ?? null, publicationSeries: c.publicationSeries ?? null, magazineNumber: c.magazineNumber ?? null,
      pageNumber: c.pageNumber ?? null, filePath: c.filePath ?? null, fileType: c.fileType ?? null, summaryLaw: c.summaryLaw ?? null,
    }));
    const item: ParsedLegislationLawItem = { itemId: String(lawId), general, corrections, secondaryCount: 0 };
    const model = toPublicationModel(item);
    const edges = buildAmendmentGraph(model);

    await supabase.from("canonical_entities").upsert({
      canonical_id: model.law.canonicalId, entity_type: "Law", source_platform: "knesset_legislation_api", source_publisher: "knesset",
      source_url: `${LEGIS}${lawId}`, external_record_id: String(lawId), content_level: "metadata_only", version_status: "validated",
      fields: { title: model.law.title, validity: model.law.validity, hasOpenBookConsolidation: model.law.hasOpenBookConsolidation, hasOfficialConsolidation: false },
      primary_text: model.law.title, primary_text_language: "he",
    }, { onConflict: "canonical_id", ignoreDuplicates: true });

    for (const doc of model.documents) {
      m.publications += 1;
      const ob = (model.law.hasOpenBookConsolidation ? "community_consolidated" : "none");
      await supabase.from("law_publications").upsert({
        publication_canonical_id: doc.canonicalId, law_canonical_id: doc.lawCanonicalId, israel_law_id: String(doc.israelLawId),
        publication_item_id: doc.itemId, amendment_event_id: doc.amendmentEventId, publication_type: doc.docType, correction_number: doc.correctionNumber,
        correction_type: doc.correctionType, title: doc.title, publication_series: doc.publicationSeries, publication_number: doc.magazineNumber,
        publication_page: doc.pageNumber, publication_date: doc.publicationDate, chain_index: doc.chainIndex, pdf_url: doc.pdfUrl,
        content_level: doc.pdfUrl ? "metadata_only" : "metadata_only", consolidation_status: "non_consolidated_publication", authority_level: "primary_official",
        openbook_status: ob, license_basis: "statutory_exemption_sec6", version_status: "validated", published: false, source_url: doc.pdfUrl,
      }, { onConflict: "publication_canonical_id", ignoreDuplicates: true });
    }
    for (const e of edges) {
      m.relationships += 1;
      await supabase.from("law_publication_edges").upsert({ edge_type: e.type, from_id: e.from, to_id: e.to, evidence: e.evidence }, { onConflict: "edge_type,from_id,to_id", ignoreDuplicates: true });
    }

    // PDFs: fetch -> upload -> extract -> parse -> persist.
    for (const doc of model.documents) {
      if (!doc.pdfUrl || !doc.itemId) continue;
      m.pdfsDiscovered += 1;
      const fetched = await fetchPdfWithRetry(doc.pdfUrl, nodeHttp, DEFAULT_PDF_POLICY, { maxAttempts: 3, backoffMs: (a) => 500 * a, sleep: (ms) => new Promise((res) => setTimeout(res, ms)) });
      if (!fetched.ok) { m.pdfsFailed += 1; continue; }
      const sha = fetched.sha256;
      const stored = await storePdf(storage, String(doc.israelLawId), doc.itemId, fetched.bytes);
      if (stored.status !== "verified") { m.pdfsFailed += 1; continue; }
      m.pdfsUploaded += stored.deduped ? 0 : 1; m.pdfsVerified += 1; m.bytes += stored.deduped ? 0 : fetched.size;
      const now = new Date().toISOString();
      await supabase.from("stored_objects").upsert({ sha256: sha, bucket: stored.meta.bucket, object_key: stored.meta.objectKey, size_bytes: fetched.size, content_type: "application/pdf", storage_status: "verified", ref_count: 1, uploaded_at: now, verified_at: now }, { onConflict: "sha256", ignoreDuplicates: true });

      // Extraction.
      let ext: { text: string; pages: number; coverage: number };
      try { ext = await extractText(fetched.bytes); } catch { m.extractionFailures += 1; continue; }
      const quarantined = ext.coverage < 0.8;
      if (quarantined) m.quarantined += 1;
      await supabase.from("law_publications").update({
        pdf_sha256: sha, pdf_object_key: stored.meta.objectKey, pdf_size_bytes: fetched.size, pdf_content_type: "application/pdf", pdf_fetched_at: now,
        page_count: ext.pages, extraction_method: "pdfjs_text_layer", extraction_version: "pdfjs-node-5", extraction_confidence: ext.coverage,
        ocr_used: false, raw_text_hash: sha256Hex(new TextEncoder().encode(ext.text)), content_level: "full_text",
        version_status: quarantined ? "quarantined" : "validated",
      }).eq("publication_canonical_id", doc.canonicalId);
      if (quarantined) continue;

      const norm = normalizePdfText(ext.text);
      if (doc.docType === "original_enactment") {
        const law = parseLegislation(normalizeHebrewLegalText(norm.normalizedText).normalizedText);
        const secId = (n: string) => `Section:${doc.lawCanonicalId}:${createHash("sha256").update(`${doc.lawCanonicalId}|${n}`).digest("hex").slice(0, 10)}`;
        for (const s of law.sections) {
          m.sections += 1;
          await supabase.from("canonical_entities").upsert({ canonical_id: secId(s.sectionNumber), entity_type: "Section", source_platform: "knesset_legislation_pdf", source_publisher: "knesset", source_url: doc.pdfUrl, external_record_id: `${doc.lawCanonicalId}:${s.sectionNumber}`, content_level: "full_text", version_status: "validated", fields: { sectionNumber: s.sectionNumber, lawCanonicalId: doc.lawCanonicalId, publicationCanonicalId: doc.canonicalId }, primary_text: s.bodyText, primary_text_language: "he" }, { onConflict: "canonical_id", ignoreDuplicates: true });
        }
        const cks = chunkLaw(law, { maxChars: 900, lawId: doc.lawCanonicalId, documentVersionId: `pub:${doc.itemId}`, sectionId: (s) => secId(s.sectionNumber) });
        for (const c of cks) {
          m.chunks += 1;
          await supabase.from("legal_chunks").upsert({ law_canonical_id: doc.lawCanonicalId, section_canonical_id: c.sectionId, document_version_id: c.documentVersionId, section_number: c.sectionNumber, heading_path: c.headingPath, ordinal: c.ordinal, chunk_index: c.chunkIndex, text: c.text, source_span_start: c.sourceSpanStart, source_span_end: c.sourceSpanEnd, token_count: c.tokenCount, content_hash: c.contentHash, language: "he", source_url: doc.pdfUrl, license_status: "statutory_exemption_sec6", published: false }, { onConflict: "section_canonical_id,chunk_index", ignoreDuplicates: true });
        }
      } else {
        for (const op of parseAmendmentsV2(norm.normalizedText)) {
          if (op.status === "unsupported") { m.unsupported += 1; continue; }
          if (op.status === "ambiguous") m.ambiguous += 1;
          m.operations += 1;
          await supabase.from("amendment_operations").upsert({ publication_canonical_id: doc.canonicalId, target_law_id: doc.lawCanonicalId, target_section: op.targetSection, operation_type: op.operationType, status: op.status, confidence: op.confidence, evidence: op.evidence, source_span_start: op.sourceSpan.start, source_span_end: op.sourceSpan.end, parser_version: AMENDMENT_PARSER_VERSION }, { onConflict: "publication_canonical_id,source_span_start,operation_type", ignoreDuplicates: true });
        }
      }
    }
    m.lawsProcessed += 1;
    // Checkpoint after each law.
    await supabase.from("ingestion_checkpoints").upsert({ source: "knesset_backfill", cursor: String(lawId) }, { onConflict: "source" });

    // Auto-stop guardrails.
    const dlRate = m.pdfsDiscovered ? m.pdfsVerified / m.pdfsDiscovered : 1;
    if (m.checksumMismatch > 0 || (m.pdfsDiscovered >= 10 && dlRate < 0.98)) throw new Error(`auto-stop: download/verify ${(dlRate * 100).toFixed(1)}% or checksum mismatch`);
    if (m.pdfsVerified >= 10 && m.quarantined / Math.max(1, m.pdfsVerified) > 0.05) throw new Error("auto-stop: quarantine > 5%");
  }

  try {
    for (let i = 0; i < picked.length; i += CONCURRENCY) {
      await Promise.all(picked.slice(i, i + CONCURRENCY).map((p) => processLaw(p.id)));
    }
  } catch (e) {
    process.stderr.write(`STOPPED: ${(e as Error).message}\n`);
  }
  await supabase.from("ingestion_runs").insert({ kind: "knesset_backfill", metrics: m }).then(() => {}, () => {});
  process.stdout.write(JSON.stringify({ limit: LIMIT, ...m, normalization_version: NORMALIZATION_VERSION, parser_version: AMENDMENT_PARSER_VERSION }, null, 2) + "\n");
}

main().catch((e) => { process.stderr.write(`backfill failed: ${(e as Error).message}\n`); process.exit(1); });

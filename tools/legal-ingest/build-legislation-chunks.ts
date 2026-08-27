#!/usr/bin/env node
/**
 * LAW ME — Phase 1: build servable section-chunks from the SAFE legislation pages.
 *
 * Reuses the EXISTING parser/chunker (no fork): for each SAFE publication we
 * concatenate its accepted pages in physical order, normalize, parse into
 * sections, chunk by section, and upsert legal_chunks. Each chunk is gated
 * through the real citation contract (gateChunkForServing); only citation-complete
 * chunks are published=true. Provision/section identity is carried on the chunk
 * (section_canonical_id + section_number + heading_path), tied to law + publication.
 *
 *   Stored SAFE pages → publication text → sections → chunks → citation gate → publish
 *
 * The authority stays the official PDF; these chunks are the machine-derived,
 * non-consolidated representation of the publication as published.
 *
 * DRY-RUN by default (builds + reports, no DB write). `--commit` upserts via the
 * service role (CI). published stays false on any chunk that fails the gate.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { normalizeHebrewLegalText } from "../../src/modules/legal-ai-israel/parser/hebrew-normalize.ts";
import { parseLegislation } from "../../src/modules/legal-ai-israel/ingestion/legislation/section-parser.ts";
import { chunkLaw, type LegalChunk } from "../../src/modules/legal-ai-israel/ingestion/legislation/section-chunker.ts";
import { gateChunkForServing, type ServableChunk } from "../../src/modules/legal-ai-israel/ingestion/legislation/citation-contract.ts";
import { classifyPage, type PageGateRecord } from "./publication-gate.ts";

const hash10 = (s: string): string => createHash("sha256").update(s).digest("hex").slice(0, 10);
const sha = (s: string): string => createHash("sha256").update(s).digest("hex");

export interface SafePage { publication_canonical_id: string; pdf_page_index: number; structured_text: string | null; official_pdf_url: string | null }
export interface PublicationMeta { publication_canonical_id: string; law_canonical_id: string; israel_law_id: string; title: string | null; pdf_url: string | null }

/** ordered concatenation of a publication's page texts (physical reading order) */
export function concatPublicationText(pages: readonly { pdf_page_index: number; structured_text: string | null }[]): string {
  return [...pages]
    .sort((a, b) => a.pdf_page_index - b.pdf_page_index)
    .map((p) => (p.structured_text ?? "").trim())
    .filter((t) => t.length > 0)
    .join("\n\n");
}

/** section-canonical id scoped to the PUBLICATION (publication-as-published, not consolidated) */
export function sectionCanonicalId(publicationId: string, sectionNumber: string): string {
  return `Section:${publicationId}:${hash10(sectionNumber)}`;
}

/** Build the ServableChunk the citation gate evaluates. */
export function toServableChunk(chunk: LegalChunk, meta: PublicationMeta, sourceUrl: string | null, nowISO: string): ServableChunk {
  const chunkId = sha(`${chunk.sectionId}#${chunk.chunkIndex}`);
  const url = sourceUrl ?? meta.pdf_url ?? "";
  const citationComplete = !!(meta.title && chunk.sectionNumber && meta.publication_canonical_id && url);
  return {
    chunkId,
    published: true,                 // publishing the SAFE subset...
    licenseAllowed: true,            // official Knesset publication — statutory_exemption_sec6
    provenanceComplete: citationComplete,
    quarantined: false,
    isCurrentVersion: true,          // the publication as published is the served record
    citation: citationComplete
      ? { lawTitle: meta.title!, sectionNumber: chunk.sectionNumber, version: meta.publication_canonical_id,
          sourceUrl: url, sourceDocumentId: meta.publication_canonical_id, lastVerified: nowISO, chunkId,
          sourceSpan: { start: chunk.sourceSpanStart, end: chunk.sourceSpanEnd } }
      : null,
  };
}

export interface ChunkRow {
  law_canonical_id: string; section_canonical_id: string; document_version_id: string;
  section_number: string; heading_path: string; ordinal: number; chunk_index: number;
  text: string; source_span_start: number; source_span_end: number; token_count: number;
  content_hash: string; language: string; source_url: string; license_status: string; published: boolean;
}

export function toChunkRow(chunk: LegalChunk, meta: PublicationMeta, sourceUrl: string | null, published: boolean): ChunkRow {
  return {
    law_canonical_id: meta.law_canonical_id,
    section_canonical_id: chunk.sectionId,
    document_version_id: meta.publication_canonical_id,
    section_number: chunk.sectionNumber,
    heading_path: chunk.headingPath,
    ordinal: chunk.ordinal,
    chunk_index: chunk.chunkIndex,
    text: chunk.text,
    source_span_start: chunk.sourceSpanStart,
    source_span_end: chunk.sourceSpanEnd,
    token_count: chunk.tokenCount,
    content_hash: chunk.contentHash,
    language: "he",
    source_url: sourceUrl ?? meta.pdf_url ?? "",
    license_status: "statutory_exemption_sec6",
    published,
  };
}

/** Pure per-publication build: text → sections → chunks → gated rows. */
export function buildPublicationChunks(meta: PublicationMeta, pages: readonly SafePage[], nowISO: string): { rows: ChunkRow[]; sections: number; held: number } {
  const text = concatPublicationText(pages);
  if (!text) return { rows: [], sections: 0, held: 0 };
  const norm = normalizeHebrewLegalText(text).normalizedText;
  const law = parseLegislation(norm);
  const sourceUrl = pages.find((p) => p.official_pdf_url)?.official_pdf_url ?? meta.pdf_url ?? null;
  const chunks = chunkLaw(law, {
    maxChars: 900,
    lawId: meta.law_canonical_id,
    documentVersionId: meta.publication_canonical_id,
    sectionId: (s) => sectionCanonicalId(meta.publication_canonical_id, s.sectionNumber),
  });
  let held = 0;
  const rows = chunks.map((c) => {
    const servable = gateChunkForServing(toServableChunk(c, meta, sourceUrl, nowISO)).servable;
    if (!servable) held++;
    return toChunkRow(c, meta, sourceUrl, servable);
  });
  return { rows, sections: law.sections.length, held };
}

// ---- CI runner ----
async function main(): Promise<void> {
  const COMMIT = process.argv.includes("--commit");
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) { process.stderr.write("build-chunks: SUPABASE_URL + SUPABASE_SECRET_KEY required.\n"); process.exit(2); }
  const OUT = process.env.GATE_OUT ?? "tools/legal-ingest/.staging-hybrid";
  const NOW = process.env.BUILD_NOW_ISO ?? "2026-08-09T00:00:00+03:00"; // deterministic; overridable
  const { createClient } = await import("@supabase/supabase-js");
  const supa = createClient(url, key, { auth: { persistSession: false } });

  // 1) read pages, classify, keep SAFE
  type PRow = PageGateRecord & { id: number; structured_extraction_ref: string | null };
  const pages: PRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supa.schema("legalai").from("publication_page_extraction")
      .select("id, publication_canonical_id, pdf_page_index, extraction_status, needs_review, structured_text, official_pdf_url, structured_extraction_ref")
      .order("id", { ascending: true }).range(from, from + 999);
    if (error) { process.stderr.write(`read pages failed: ${error.message}\n`); process.exit(1); }
    const p = (data ?? []) as PRow[]; pages.push(...p); if (p.length < 1000) break;
  }
  const keeper = new Map<string, number>();
  for (const r of pages) if (r.structured_extraction_ref) { const c = keeper.get(r.structured_extraction_ref); if (c === undefined || r.id < c) keeper.set(r.structured_extraction_ref, r.id); }
  const safe = pages.filter((r) => classifyPage({ ...r, is_content_duplicate: !!r.structured_extraction_ref && keeper.get(r.structured_extraction_ref!) !== r.id }).bucket === "SAFE_TO_PUBLISH");

  // 2) publication metadata
  const metas = new Map<string, PublicationMeta>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supa.schema("legalai").from("law_publications")
      .select("publication_canonical_id, law_canonical_id, israel_law_id, title, pdf_url").range(from, from + 999);
    if (error) { process.stderr.write(`read pubs failed: ${error.message}\n`); process.exit(1); }
    const rows = (data ?? []) as PublicationMeta[]; for (const m of rows) metas.set(m.publication_canonical_id, m); if (rows.length < 1000) break;
  }

  // 3) group SAFE pages by publication
  const byPub = new Map<string, SafePage[]>();
  for (const p of safe) {
    if (!p.publication_canonical_id) continue;
    (byPub.get(p.publication_canonical_id) ?? byPub.set(p.publication_canonical_id, []).get(p.publication_canonical_id)!)
      .push({ publication_canonical_id: p.publication_canonical_id, pdf_page_index: p.pdf_page_index ?? 0, structured_text: p.structured_text, official_pdf_url: p.official_pdf_url });
  }

  // 4) build chunks per publication
  const allRows: ChunkRow[] = [];
  let pubsProcessed = 0, sectionsTotal = 0, heldTotal = 0, noMeta = 0;
  for (const [pubId, pgs] of byPub) {
    const meta = metas.get(pubId);
    if (!meta) { noMeta++; continue; }
    const { rows, sections, held } = buildPublicationChunks(meta, pgs, NOW);
    allRows.push(...rows); pubsProcessed++; sectionsTotal += sections; heldTotal += held;
  }
  const published = allRows.filter((r) => r.published).length;
  const summary = {
    kind: "LEGISLATION CHUNK BUILD (section-grade, gated by citation contract)",
    safe_pages: safe.length, publications_processed: pubsProcessed, publications_missing_meta: noMeta,
    sections_parsed: sectionsTotal, chunks_total: allRows.length,
    chunks_published: published, chunks_held_incomplete_citation: heldTotal,
    distinct_published_publications: new Set(allRows.filter((r) => r.published).map((r) => r.document_version_id)).size,
    committed: COMMIT,
  };
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/_chunk-build.json`, JSON.stringify(summary, null, 2));
  process.stdout.write(`CHUNK BUILD — ${allRows.length} chunks (${published} published / ${heldTotal} held) from ${pubsProcessed} publications · ${sectionsTotal} sections\n`);

  if (!COMMIT) { process.stdout.write(`DRY-RUN — no DB write. summary → ${OUT}/_chunk-build.json\n`); return; }

  // 5) upsert legal_chunks (text_search filled by DB trigger). published carried per gate.
  const CH = 500; let written = 0;
  for (let i = 0; i < allRows.length; i += CH) {
    const batch = allRows.slice(i, i + CH);
    const { error } = await supa.schema("legalai").from("legal_chunks")
      .upsert(batch, { onConflict: "section_canonical_id,chunk_index", ignoreDuplicates: false });
    if (error) { process.stderr.write(`upsert chunks ${i} failed: ${error.message}\n`); process.exit(1); }
    written += batch.length; process.stdout.write(`  upserted ${written}/${allRows.length}\n`);
  }
  process.stdout.write(`COMMIT — ${written} legal_chunks upserted (${published} published).\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { process.stderr.write(`build-legislation-chunks failed: ${(e as Error).message}\n`); process.exit(1); });
}

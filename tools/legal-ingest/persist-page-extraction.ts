#!/usr/bin/env node
/**
 * LAW ME — Phase 2: persist the hybrid-router page extraction layer to DEV.
 *
 * Reads the per-page records written by reprocess-hybrid.ts (STAGING_DIR/*.extraction.json)
 * and upserts them into legalai.publication_page_extraction. ADDITIVE ONLY:
 *   - raw/normalized extraction is NEVER overwritten (this is a separate structured layer);
 *   - published is hard-locked false (DB CHECK + code) — publishing is Phase 10, separately gated;
 *   - accepted vs needs_review is preserved verbatim from the router verdict;
 *   - the physical pdf_page_index citation anchor is required and carried through;
 *   - idempotent: ON CONFLICT (publication, physical page, router build) DO UPDATE, so a
 *     re-run over the same staging produces zero duplicate rows.
 *
 * DRY-RUN by default (prints a plan + sample, writes no DB). `--commit` writes to DEV via
 * SUPABASE_URL + SUPABASE_SECRET_KEY (service role, bypasses RLS) — intended to run in CI,
 * in the same job as the full-corpus reprocess, where the staging data and the credentials
 * both live. It REFUSES to commit without both env vars.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

export interface StagingPageRecord {
  publication_item_id: string;
  page_number: number;
  pdf_page_index: number;
  physical_page_alignment: boolean;
  route: "A" | "B1" | "B2";
  route_reason: string;
  engine: string;
  engine_version: string;
  order_version?: string | null;
  router_version: string;
  confidence?: number | null;
  needs_review: boolean;
  published: 0 | number;
  provenance?: { source_url?: string | null; [k: string]: unknown } | null;
  reading_order_text?: string | null;
  b2?: { decision?: "accepted" | "needs_review" | "failed"; reason_codes?: string[] } | null;
}

export interface ExtractionRow {
  publication_canonical_id: string;
  pdf_page_index: number;
  official_pdf_url: string | null;
  source_span_start: number | null;
  source_span_end: number | null;
  printed_page_label: string | null;
  gazette_page_number: string | null;
  route: "A" | "B1" | "B2";
  route_reason: string;
  engine: string;
  engine_version: string;
  order_version: string | null;
  router_version: string;
  confidence: number | null;
  machine_derived: true;
  needs_review: boolean;
  raw_extraction_ref: string | null;
  normalized_extraction_ref: string | null;
  structured_extraction_ref: string | null;
  extraction_status: "extracted" | "needs_review" | "failed";
  published: false;
  provenance: Record<string, unknown>;
  structured_text: string | null;
}

const sha256 = (s: string): string => "sha256:" + createHash("sha256").update(s, "utf8").digest("hex");
const clamp01 = (n: number | null | undefined): number | null =>
  typeof n === "number" && !Number.isNaN(n) ? Math.max(0, Math.min(1, n)) : null;

/**
 * Pure, deterministic mapping from a router staging record to a DB row.
 * published is ALWAYS false; extraction_status derives from the verdict:
 *   B2 failed OCR → 'failed'; any needs_review → 'needs_review'; else 'extracted' (accepted).
 */
export function toExtractionRow(r: StagingPageRecord): ExtractionRow {
  const failed = r.b2?.decision === "failed";
  const status: ExtractionRow["extraction_status"] = failed
    ? "failed"
    : r.needs_review
      ? "needs_review"
      : "extracted";
  const text = r.reading_order_text ?? "";
  return {
    publication_canonical_id: `knesset:publication:${r.publication_item_id}`,
    pdf_page_index: r.pdf_page_index,
    official_pdf_url: (r.provenance?.source_url as string | undefined) ?? null,
    source_span_start: null,
    source_span_end: null,
    printed_page_label: null,       // absent ⇒ null, never a guessed folio
    gazette_page_number: null,
    route: r.route,
    route_reason: r.route_reason,
    engine: r.engine,
    engine_version: r.engine_version,
    order_version: r.order_version ?? null,
    router_version: r.router_version,
    confidence: clamp01(r.confidence),
    machine_derived: true,
    needs_review: !!r.needs_review,
    raw_extraction_ref: null,       // raw is authoritative-adjacent and never overwritten
    normalized_extraction_ref: null,
    structured_extraction_ref: text ? sha256(text) : null,
    extraction_status: status,
    published: false,               // HARD-LOCKED — publishing is Phase 10
    provenance: (r.provenance as Record<string, unknown>) ?? {},
    structured_text: text ? text : null,  // inline machine-derived page text (null when blank)
  };
}

export function summarize(rows: ExtractionRow[]) {
  const byStatus: Record<string, number> = { extracted: 0, needs_review: 0, failed: 0 };
  for (const r of rows) byStatus[r.extraction_status]++;
  return {
    total_rows: rows.length,
    accepted: byStatus.extracted,
    needs_review: byStatus.needs_review,
    failed: byStatus.failed,
    published: rows.filter((r) => (r.published as unknown) !== false).length, // must be 0
    physical_anchor_present: rows.filter((r) => Number.isInteger(r.pdf_page_index) && r.pdf_page_index >= 1).length,
    distinct_publications: new Set(rows.map((r) => r.publication_canonical_id)).size,
  };
}

// ---- runner (only when executed directly) ----
async function main(): Promise<void> {
  const COMMIT = process.argv.includes("--commit");
  const STAGING = process.env.STAGING_DIR ?? "tools/legal-ingest/.staging-hybrid";
  const OUT = process.env.PERSIST_OUT ?? "tools/legal-ingest/.staging-hybrid";
  if (!existsSync(STAGING)) { process.stderr.write(`persist: STAGING_DIR not found: ${STAGING}\n`); process.exit(2); }

  const files = readdirSync(STAGING).filter((f) => f.endsWith(".extraction.json"));
  const rows: ExtractionRow[] = [];
  for (const f of files) {
    const rec = JSON.parse(readFileSync(`${STAGING}/${f}`, "utf8")) as StagingPageRecord;
    rows.push(toExtractionRow(rec));
  }
  const summary = summarize(rows);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/_persist-plan.json`, JSON.stringify({ kind: "PAGE-EXTRACTION PERSIST PLAN (DEV; additive; published=false)", ...summary }, null, 2));

  if (summary.published !== 0) { process.stderr.write("REFUSING: a row has published != false. Abort.\n"); process.exit(1); }

  if (!COMMIT) {
    process.stdout.write(`DRY-RUN persist — ${summary.total_rows} rows (${summary.accepted} accepted / ${summary.needs_review} needs_review / ${summary.failed} failed), ${summary.distinct_publications} pubs. No DB write. plan → ${OUT}/_persist-plan.json\n`);
    return;
  }

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) { process.stderr.write("REFUSING --commit: SUPABASE_URL and SUPABASE_SECRET_KEY required (service role; CI only).\n"); process.exit(1); }
  const { createClient } = await import("@supabase/supabase-js");
  const supa = createClient(url, key, { auth: { persistSession: false } });

  // Resolve official_pdf_url from law_publications (single source of truth) and
  // inject it onto each row. Paginated to cover the whole eligible set.
  const urlByPub = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supa.schema("legalai").from("law_publications")
      .select("publication_canonical_id, pdf_url, source_url").range(from, from + 999);
    if (error) { process.stderr.write(`persist: law_publications url fetch failed: ${error.message}\n`); process.exit(1); }
    const rowsPage = (data ?? []) as { publication_canonical_id: string; pdf_url: string | null; source_url: string | null }[];
    for (const p of rowsPage) { const u = p.pdf_url ?? p.source_url; if (u) urlByPub.set(p.publication_canonical_id, u); }
    if (rowsPage.length < 1000) break;
  }
  let urlFilled = 0;
  for (const r of rows) { const u = urlByPub.get(r.publication_canonical_id); if (u) { r.official_pdf_url = u; urlFilled++; } }
  process.stdout.write(`resolved official_pdf_url for ${urlFilled}/${rows.length} rows from law_publications\n`);

  const CHUNK = 500; let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const { error } = await supa
      .schema("legalai")
      .from("publication_page_extraction")
      .upsert(batch, { onConflict: "publication_canonical_id,pdf_page_index,router_version,engine_version", ignoreDuplicates: false });
    if (error) { process.stderr.write(`persist batch ${i}-${i + batch.length} failed: ${error.message}\n`); process.exit(1); }
    written += batch.length;
    process.stdout.write(`  upserted ${written}/${rows.length}\n`);
  }
  process.stdout.write(`COMMIT persist — ${written} rows upserted (idempotent). published=false enforced by DB CHECK.\n`);
}

// Only run when invoked as a script (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { process.stderr.write(`persist-page-extraction failed: ${(e as Error).message}\n`); process.exit(1); });
}

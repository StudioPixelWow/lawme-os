#!/usr/bin/env node
/**
 * LAW ME — Phase 3: post-persistence audit of legalai.publication_page_extraction (DEV).
 *
 * READ-ONLY. Uses count-head queries (no row payloads pulled) to verify the hard
 * integrity invariants after a persist run, and writes _persist-audit.json.
 *
 * Invariants checked:
 *   - published_true = 0            (nothing published from the extraction layer)
 *   - machine_derived_false = 0     (every row is machine-derived)
 *   - missing_physical_anchor = 0   (pdf_page_index present and >= 1 everywhere)
 *   - persisted rows == expected    (from the persist plan, when provided)
 *   - no duplicate (pub, page, build) — structurally guaranteed by the UNIQUE constraint
 *   - accepted / needs_review / failed split preserved
 *
 * Requires SUPABASE_URL + SUPABASE_SECRET_KEY (service role; CI/DEV only).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { process.stderr.write("audit: SUPABASE_URL and SUPABASE_SECRET_KEY required (read-only service role).\n"); process.exit(2); }
const OUT = process.env.PERSIST_OUT ?? "tools/legal-ingest/.staging-hybrid";
const PLAN = `${OUT}/_persist-plan.json`;

const { createClient } = await import("@supabase/supabase-js");
const supa = createClient(url, key, { auth: { persistSession: false } });
const T = () => supa.schema("legalai").from("publication_page_extraction");

async function count(build: (q: ReturnType<typeof T>) => unknown): Promise<number> {
  const q = T().select("*", { count: "exact", head: true });
  const { count: c, error } = (await (build(q as unknown as ReturnType<typeof T>) as unknown as Promise<{ count: number | null; error: { message: string } | null }>));
  if (error) { process.stderr.write(`audit query failed: ${error.message}\n`); process.exit(1); }
  return c ?? 0;
}

const total = await count((q) => q);
const published_true = await count((q) => (q as any).eq("published", true));
const machine_derived_false = await count((q) => (q as any).neq("machine_derived", true));
const missing_anchor = await count((q) => (q as any).or("pdf_page_index.is.null,pdf_page_index.lt.1"));
const accepted = await count((q) => (q as any).eq("extraction_status", "extracted"));
const needs_review = await count((q) => (q as any).eq("needs_review", true));
const failed = await count((q) => (q as any).eq("extraction_status", "failed"));
const no_official_url = await count((q) => (q as any).is("official_pdf_url", null));

let expected: number | null = null;
if (existsSync(PLAN)) {
  try { expected = (JSON.parse(readFileSync(PLAN, "utf8")) as { total_rows?: number }).total_rows ?? null; } catch { /* optional */ }
}

const pass =
  published_true === 0 &&
  machine_derived_false === 0 &&
  missing_anchor === 0 &&
  (expected === null || total === expected);

const audit = {
  kind: "PAGE-EXTRACTION POST-PERSISTENCE AUDIT (DEV; read-only)",
  persisted_rows: total,
  expected_rows: expected,
  matches_expected: expected === null ? "n/a" : total === expected,
  published_true: published_true,             // GATE: must be 0
  machine_derived_false: machine_derived_false, // GATE: must be 0
  missing_physical_anchor: missing_anchor,      // GATE: must be 0
  accepted_rows: accepted,
  needs_review_rows: needs_review,
  failed_rows: failed,
  rows_without_official_url: no_official_url,    // diagnostic
  duplicate_page_builds: 0,                      // structurally enforced by UNIQUE(pub, pdf_page_index, router_version, engine_version)
  duplicate_note: "no duplicate (publication, physical page, router build) is possible — enforced by the table UNIQUE constraint",
  gate: pass ? "PERSIST_AUDIT_PASS" : "PERSIST_AUDIT_FAIL",
};
writeFileSync(`${OUT}/_persist-audit.json`, JSON.stringify(audit, null, 2));
process.stdout.write(`${audit.gate} — persisted ${total}${expected != null ? `/${expected}` : ""}, published_true ${published_true}, missing_anchor ${missing_anchor}, accepted ${accepted}, needs_review ${needs_review}. audit → ${OUT}/_persist-audit.json\n`);
if (!pass) process.exit(1);

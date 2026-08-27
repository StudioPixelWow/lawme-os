#!/usr/bin/env node
/**
 * LAW ME — Phase 1: publication gate over legalai.publication_page_extraction.
 *
 * Pure, deterministic classification of every extracted page into one of the
 * founder's publication buckets. Only SAFE_TO_PUBLISH pages feed section
 * chunking + publishing; everything else is held with an explicit reason.
 *
 * Buckets (mutually exclusive, evaluated in priority order):
 *   MALFORMED               — extraction failed, or non-blank page with empty text
 *   NEEDS_HUMAN_REVIEW      — router flagged needs_review (blanks / sparse)
 *   STRUCTURED_TABLE_EXCLUDED — needs_review AND looks like a reconstructed table
 *   INSUFFICIENT_PROVENANCE — missing official PDF url / physical anchor / publication id
 *   DUPLICATE               — exact-identical text already kept on a canonical page
 *   SUPERSEDED              — (publication grain: N/A — see note; opt-in via input flag)
 *   SAFE_TO_PUBLISH         — accepted, provenance-complete, unique, non-empty
 *
 * Note on SUPERSEDED: at the *publication* grain each official publication is the
 * authoritative record of its own enactment (authority policy: an official
 * publication is NOT a consolidated current text). "Superseded" is a
 * consolidation-layer concept, so no page is marked SUPERSEDED here unless the
 * caller explicitly passes `superseded:true` (reserved for a later phase).
 *
 * READ-ONLY. Reads ppe via the service role (CI), writes _publication-gate.json.
 * It never writes to the DB and never sets published (publishing is the chunk step).
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

export const GATE_BUCKETS = [
  "SAFE_TO_PUBLISH",
  "NEEDS_HUMAN_REVIEW",
  "STRUCTURED_TABLE_EXCLUDED",
  "MALFORMED",
  "DUPLICATE",
  "SUPERSEDED",
  "INSUFFICIENT_PROVENANCE",
] as const;
export type GateBucket = (typeof GATE_BUCKETS)[number];

export interface PageGateRecord {
  publication_canonical_id: string | null;
  pdf_page_index: number | null;
  extraction_status: "extracted" | "needs_review" | "failed" | string;
  needs_review: boolean;
  structured_text: string | null;
  official_pdf_url: string | null;
  /** true when this page's exact text is a duplicate of an already-kept canonical page */
  is_content_duplicate?: boolean;
  /** reserved for a later consolidation phase; never inferred here */
  superseded?: boolean;
}

export interface GateVerdict { bucket: GateBucket; reasonHe: string }

/** share of digit characters among non-whitespace characters (0..1) */
export function numericRatio(text: string | null | undefined): number {
  const t = (text ?? "").replace(/\s+/g, "");
  if (!t.length) return 0;
  let d = 0;
  for (const c of t) if (c >= "0" && c <= "9") d++;
  return d / t.length;
}

/** heuristic: a reconstructed statutory/budget table (markers or numeric-heavy) */
export function looksLikeTable(text: string | null | undefined): boolean {
  const t = text ?? "";
  if (t.includes("[טבלה]") || t.includes("[/טבלה]")) return true;
  return numericRatio(t) >= 0.35;
}

const isEmptyText = (t: string | null | undefined): boolean => !t || t.trim().length === 0;
const provComplete = (r: PageGateRecord): boolean =>
  !!r.publication_canonical_id && typeof r.pdf_page_index === "number" && r.pdf_page_index >= 1 && !!r.official_pdf_url;

/** Pure, deterministic single-page classification. */
export function classifyPage(r: PageGateRecord): GateVerdict {
  if (r.extraction_status === "failed") return { bucket: "MALFORMED", reasonHe: "חילוץ נכשל" };
  if (r.superseded === true) return { bucket: "SUPERSEDED", reasonHe: "הוחלף בפרסום מאוחר יותר" };
  if (r.needs_review) {
    return looksLikeTable(r.structured_text)
      ? { bucket: "STRUCTURED_TABLE_EXCLUDED", reasonHe: "טבלה משוחזרת — דורשת אימות מול המקור" }
      : { bucket: "NEEDS_HUMAN_REVIEW", reasonHe: "סומן לבדיקה אנושית (ריק/דליל/לא ודאי)" };
  }
  if (!provComplete(r)) return { bucket: "INSUFFICIENT_PROVENANCE", reasonHe: "חסר קישור PDF רשמי / עוגן עמוד / זהות פרסום" };
  if (isEmptyText(r.structured_text)) return { bucket: "MALFORMED", reasonHe: "עמוד לא־ריק ללא טקסט" };
  if (r.is_content_duplicate) return { bucket: "DUPLICATE", reasonHe: "טקסט זהה לעמוד קנוני שכבר נשמר" };
  return { bucket: "SAFE_TO_PUBLISH", reasonHe: "התקבל · provenance מלא · ייחודי" };
}

export interface GateSummary {
  kind: string;
  total_pages: number;
  counts: Record<GateBucket, number>;
  safe_to_publish: number;
  safe_publications: number;
}

export function summarizeGate(records: (PageGateRecord & { verdict: GateVerdict })[]): GateSummary {
  const counts = Object.fromEntries(GATE_BUCKETS.map((b) => [b, 0])) as Record<GateBucket, number>;
  const safePubs = new Set<string>();
  for (const r of records) {
    counts[r.verdict.bucket]++;
    if (r.verdict.bucket === "SAFE_TO_PUBLISH" && r.publication_canonical_id) safePubs.add(r.publication_canonical_id);
  }
  return {
    kind: "PUBLICATION-GATE (page classification; only SAFE_TO_PUBLISH feeds chunking)",
    total_pages: records.length,
    counts,
    safe_to_publish: counts.SAFE_TO_PUBLISH,
    safe_publications: safePubs.size,
  };
}

// ---- CI runner (read-only) ----
async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) { process.stderr.write("publication-gate: SUPABASE_URL + SUPABASE_SECRET_KEY required (read-only service role).\n"); process.exit(2); }
  const OUT = process.env.GATE_OUT ?? "tools/legal-ingest/.staging-hybrid";
  const { createClient } = await import("@supabase/supabase-js");
  const supa = createClient(url, key, { auth: { persistSession: false } });

  // pull the columns we classify on, paginated
  type Row = PageGateRecord & { id: number; structured_extraction_ref: string | null };
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supa.schema("legalai").from("publication_page_extraction")
      .select("id, publication_canonical_id, pdf_page_index, extraction_status, needs_review, structured_text, official_pdf_url, structured_extraction_ref")
      .order("id", { ascending: true }).range(from, from + 999);
    if (error) { process.stderr.write(`publication-gate: read failed: ${error.message}\n`); process.exit(1); }
    const page = (data ?? []) as Row[];
    rows.push(...page);
    if (page.length < 1000) break;
  }

  // canonical keeper per content hash (lowest id keeps; the rest are duplicates)
  const keeper = new Map<string, number>();
  for (const r of rows) if (r.structured_extraction_ref) {
    const cur = keeper.get(r.structured_extraction_ref);
    if (cur === undefined || r.id < cur) keeper.set(r.structured_extraction_ref, r.id);
  }
  const classified = rows.map((r) => {
    const isDup = !!r.structured_extraction_ref && keeper.get(r.structured_extraction_ref) !== r.id;
    return { ...r, is_content_duplicate: isDup, verdict: classifyPage({ ...r, is_content_duplicate: isDup }) };
  });

  const summary = summarizeGate(classified);
  // safe worklist for the chunker: publication_canonical_id + page index, ordered
  const safeWorklist = classified
    .filter((r) => r.verdict.bucket === "SAFE_TO_PUBLISH")
    .map((r) => ({ publication_canonical_id: r.publication_canonical_id, pdf_page_index: r.pdf_page_index }));

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/_publication-gate.json`, JSON.stringify(summary, null, 2));
  writeFileSync(`${OUT}/_publication-gate-safe-worklist.json`, JSON.stringify(safeWorklist, null, 2));
  process.stdout.write(
    `PUBLICATION GATE — ${summary.total_pages} pages · SAFE ${summary.safe_to_publish} (${summary.safe_publications} publications)\n` +
    GATE_BUCKETS.map((b) => `  ${b}: ${summary.counts[b]}`).join("\n") + "\n" +
    `report → ${OUT}/_publication-gate.json\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { process.stderr.write(`publication-gate failed: ${(e as Error).message}\n`); process.exit(1); });
}

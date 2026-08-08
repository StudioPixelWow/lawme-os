/**
 * LAW ME — pure aggregation of the 50-publication hybrid reprocess gate metrics
 * (founder Epic §4). Deterministic; no I/O. Never publishes. All counts are
 * proxy/engineering signals, not human-certified accuracy.
 */

export interface ReprocessPageRecord {
  publication_item_id: string;
  page_number: number;
  route: "A" | "B1" | "B2";
  needs_review: boolean;
  physical_page_alignment: boolean;
  provenance_complete: boolean;
  published: 0;
  raw_overwritten: boolean;
  extraction_failure: boolean;
  google_call: boolean;
  latency_ms?: number | null;
  // Object-Storage / integrity anomalies (missing object, checksum mismatch on the
  // stored PDF). Additive signal — does not change routing:
  object_storage_anomaly?: boolean;
  // A/B1 glyph proxies (vs the page's own text layer) — null when N/A:
  glyph_loss?: number | null;
  duplication_ab1?: number | null;
  hebrew_share_ab1?: number | null;
  // B2 detail (present only for route B2):
  b2?: {
    decision: "accepted" | "needs_review" | "failed";
    state: "content" | "sparse" | "likely_blank" | "ocr_failed" | "needs_review";
    ocr_state: string;
    chars: number;
    hebrew_share: number;   // %
    duplication: number;    // %
    numeric_ratio: number;
    table_count: number;
    table_source: "native" | "geometry" | "none";
    reason_codes: string[];
    mean_confidence?: number | null;   // DocAI page confidence 0..1 (for the distribution)
    google_error?: boolean;            // the Google OCR call was attempted but errored
  } | null;
}

export interface ReprocessMetricsOptions {
  /** Total eligible full-text publications resolved from the corpus inventory
   *  (may exceed publicationsAttempted if some had no retrievable object). */
  eligiblePublications?: number;
  /** Object-Storage anomalies observed at fetch time (missing object / checksum),
   *  before per-page processing. Merged with per-record anomalies. */
  objectStorageAnomaliesBaseline?: number;
}

// B2 OCR-confidence buckets (DocAI page confidence, 0..1). Blank/empty pages
// have no meaningful confidence and are counted separately, never as "high".
function confidenceBucket(chars: number, conf: number | null | undefined): "blank_or_empty" | "high" | "medium" | "low" | "very_low" {
  if (!chars || chars <= 0) return "blank_or_empty";
  const c = typeof conf === "number" && !Number.isNaN(conf) ? conf : 0;
  if (c >= 0.9) return "high";
  if (c >= 0.7) return "medium";
  if (c >= 0.5) return "low";
  return "very_low";
}

const meanOf = (xs: (number | null | undefined)[]): number | null => {
  const v = xs.filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const pct = (n: number, d: number): number | null => (d > 0 ? +(100 * n / d).toFixed(2) : null);
const round = (x: number | null): number | null => (x == null ? null : +x.toFixed(2));

export function computeReprocessMetrics(records: ReprocessPageRecord[], publicationsAttempted: number, opts: ReprocessMetricsOptions = {}) {
  const total = records.length;
  const A = records.filter((r) => r.route === "A");
  const B1 = records.filter((r) => r.route === "B1");
  const B2 = records.filter((r) => r.route === "B2");

  const accepted = records.filter((r) => (r.route === "B2" ? r.b2?.decision === "accepted" : !r.needs_review && !r.extraction_failure));
  const needsReview = records.filter((r) => (r.route === "B2" ? r.b2?.decision === "needs_review" : r.needs_review));
  const ocrFailures = B2.filter((r) => r.b2?.decision === "failed" || r.b2?.state === "ocr_failed");
  const sparse = B2.filter((r) => r.b2?.state === "sparse");
  const blank = B2.filter((r) => r.b2?.state === "likely_blank");
  const tablePages = B2.filter((r) => (r.b2?.table_count ?? 0) > 0);
  const geomTablePages = tablePages.filter((r) => r.b2?.table_source === "geometry");
  const nativeTablePages = tablePages.filter((r) => r.b2?.table_source === "native");
  const tableAccepted = tablePages.filter((r) => r.b2?.decision === "accepted");
  const tableReview = tablePages.filter((r) => r.b2?.decision === "needs_review");

  // Duplicate extraction anomaly: same (publication_item_id, page) emitted twice.
  const seen = new Set<string>(); let duplicates = 0;
  for (const r of records) { const k = `${r.publication_item_id}#${r.page_number}`; if (seen.has(k)) duplicates++; else seen.add(k); }

  // Integrity invariants.
  const rawOverwrite = records.filter((r) => r.raw_overwritten).length;
  const publishedCount = records.filter((r) => (r.published as number) !== 0).length;
  const provComplete = records.filter((r) => r.provenance_complete).length;
  const physAligned = records.filter((r) => r.physical_page_alignment).length;
  const extractionFailures = records.filter((r) => r.extraction_failure).length;
  const googleCalls = records.filter((r) => r.google_call).length;
  const googleFailures = records.filter((r) => r.b2?.google_error === true).length;
  // unresolved = pages left silently unresolved (should be 0 — B1 unresolved is quarantined to needs_review).
  const unresolved = 0;

  // Object-Storage / checksum anomalies: fetch-time baseline + any per-page anomaly.
  const perPageAnomalies = records.filter((r) => r.object_storage_anomaly === true).length;
  const objectStorageAnomalies = (opts.objectStorageAnomaliesBaseline ?? 0) + perPageAnomalies;

  // B2 OCR-confidence distribution (buckets over attempted B2 OCR pages).
  const confidenceDist: Record<string, number> = { high: 0, medium: 0, low: 0, very_low: 0, blank_or_empty: 0 };
  for (const r of B2) confidenceDist[confidenceBucket(r.b2?.chars ?? 0, r.b2?.mean_confidence)]++;

  // needs_review broken down by reason_code (§39) + ranked by volume (§40/§41).
  const reasonCounts: Record<string, number> = {};
  for (const r of needsReview) {
    const codes = r.route === "B2" ? (r.b2?.reason_codes ?? []) : ["A_B1_LAYOUT_UNRESOLVED"];
    const use = codes.length ? codes : ["UNSPECIFIED_REVIEW"];
    for (const c of use) reasonCounts[c] = (reasonCounts[c] ?? 0) + 1;
  }
  const reasonRank = Object.entries(reasonCounts).map(([reason_code, pages]) => ({ reason_code, pages })).sort((a, b) => b.pages - a.pages);

  const completed = new Set(records.map((r) => r.publication_item_id)).size;
  const eligible = opts.eligiblePublications ?? publicationsAttempted;

  const failureClasses: string[] = [];
  if (rawOverwrite > 0) failureClasses.push("RAW_OVERWRITE");
  if (publishedCount > 0) failureClasses.push("UNEXPECTED_PUBLISH");
  if (duplicates > 0) failureClasses.push("DUPLICATE_EXTRACTION");
  if (physAligned < total) failureClasses.push("PHYSICAL_PAGE_MISALIGNMENT");
  if (provComplete < total) failureClasses.push("PROVENANCE_GAP");
  if (tableAccepted.some((r) => r.b2?.table_source === "geometry")) failureClasses.push("GEOMETRY_TABLE_AUTO_ACCEPTED");
  if (objectStorageAnomalies > 0) failureClasses.push("OBJECT_STORAGE_ANOMALY");

  return {
    kind: "HYBRID-REPROCESS-METRICS (dry-run, proxy — NOT human accuracy)",
    eligible_publications: eligible,
    publications_attempted: publicationsAttempted,
    publications_completed: completed,
    publications_failed: Math.max(0, publicationsAttempted - completed),
    total_pages: total,
    path_A_pages: A.length, path_B1_pages: B1.length, path_B2_pages: B2.length,
    path_A_pct: pct(A.length, total), path_B1_pct: pct(B1.length, total), path_B2_pct: pct(B2.length, total),
    accepted_pages: accepted.length, needs_review_pages: needsReview.length, unresolved_pages: unresolved,
    ocr_failures: ocrFailures.length, sparse_pages: sparse.length, likely_blank_pages: blank.length,
    table_pages: tablePages.length, native_table_pages: nativeTablePages.length, geometry_table_pages: geomTablePages.length,
    table_pages_accepted: tableAccepted.length, table_pages_needs_review: tableReview.length,
    provenance_complete_pct: pct(provComplete, total), physical_page_alignment_pct: pct(physAligned, total),
    raw_overwrite_count: rawOverwrite, published_count: publishedCount,
    duplicate_extractions: duplicates, extraction_failures: extractionFailures,
    google_b2_failures: googleFailures,
    checksum_object_storage_anomalies: objectStorageAnomalies,
    b2_confidence_distribution: confidenceDist,
    needs_review_by_reason_code: reasonCounts,
    needs_review_reason_rank: reasonRank,
    hebrew_share_pct_A_B1: round(meanOf(records.map((r) => (typeof r.hebrew_share_ab1 === "number" ? r.hebrew_share_ab1 * 100 : null)))),
    hebrew_share_pct_B2: round(meanOf(B2.map((r) => r.b2?.hebrew_share ?? null))),
    glyph_loss_proxy_pct_A_B1: round(meanOf(records.map((r) => (typeof r.glyph_loss === "number" ? r.glyph_loss * 100 : null)))),
    duplication_pct_A_B1: round(meanOf(records.map((r) => (typeof r.duplication_ab1 === "number" ? r.duplication_ab1 * 100 : null)))),
    duplication_pct_B2: round(meanOf(B2.map((r) => r.b2?.duplication ?? null))),
    mean_latency_ms: (() => { const m = meanOf(records.map((r) => r.latency_ms ?? null)); return m == null ? null : Math.round(m); })(),
    google_b2_call_count: googleCalls,
    newly_discovered_failure_classes: failureClasses,
    published: 0,
  };
}

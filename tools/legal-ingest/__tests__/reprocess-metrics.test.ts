import { test } from "node:test";
import assert from "node:assert/strict";
import { computeReprocessMetrics, type ReprocessPageRecord } from "../reprocess-metrics.ts";

const A = (pub: string, page: number): ReprocessPageRecord => ({ publication_item_id: pub, page_number: page, route: "A", needs_review: false, physical_page_alignment: true, provenance_complete: true, published: 0, raw_overwritten: false, extraction_failure: false, google_call: false, glyph_loss: 0.0, duplication_ab1: 0.0, hebrew_share_ab1: 0.95, b2: null });
const B1 = (pub: string, page: number): ReprocessPageRecord => ({ publication_item_id: pub, page_number: page, route: "B1", needs_review: false, physical_page_alignment: true, provenance_complete: true, published: 0, raw_overwritten: false, extraction_failure: false, google_call: false, glyph_loss: 0.0003, duplication_ab1: 0.0, hebrew_share_ab1: 0.9, b2: null });
const B2 = (pub: string, page: number, b2: NonNullable<ReprocessPageRecord["b2"]>, latency = 2000): ReprocessPageRecord => ({ publication_item_id: pub, page_number: page, route: "B2", needs_review: b2.decision !== "accepted", physical_page_alignment: true, provenance_complete: true, published: 0, raw_overwritten: false, extraction_failure: false, google_call: true, latency_ms: latency, b2 });

test("routing + accept/review counts across A/B1/B2", () => {
  const recs = [
    A("p1", 1), A("p1", 2), B1("p2", 1),
    B2("p3", 1, { decision: "accepted", state: "content", ocr_state: "content", chars: 900, hebrew_share: 96, duplication: 2, numeric_ratio: 0.1, table_count: 0, table_source: "none", reason_codes: [] }),
    B2("p3", 2, { decision: "needs_review", state: "content", ocr_state: "content", chars: 800, hebrew_share: 60, duplication: 11, numeric_ratio: 0.5, table_count: 1, table_source: "geometry", reason_codes: ["B2_TABLE_STRUCTURE_UNCERTAIN"] }),
    B2("p4", 1, { decision: "needs_review", state: "likely_blank", ocr_state: "likely_blank", chars: 0, hebrew_share: 0, duplication: 0, numeric_ratio: 0, table_count: 0, table_source: "none", reason_codes: ["B2_EMPTY_OCR"] }),
  ];
  const m = computeReprocessMetrics(recs, 4);
  assert.equal(m.total_pages, 6);
  assert.equal(m.path_A_pages, 2);
  assert.equal(m.path_B1_pages, 1);
  assert.equal(m.path_B2_pages, 3);
  assert.equal(m.accepted_pages, 4);       // 2 A + 1 B1 + 1 B2-accepted
  assert.equal(m.needs_review_pages, 2);   // 2 B2
  assert.equal(m.table_pages, 1);
  assert.equal(m.geometry_table_pages, 1);
  assert.equal(m.table_pages_accepted, 0); // geometry never auto-accepted
  assert.equal(m.table_pages_needs_review, 1);
  assert.equal(m.likely_blank_pages, 1);
  assert.equal(m.google_b2_call_count, 3);
});

test("integrity invariants and failure classes", () => {
  const clean = [A("p1", 1), B1("p2", 1)];
  const m = computeReprocessMetrics(clean, 2);
  assert.equal(m.published_count, 0);
  assert.equal(m.raw_overwrite_count, 0);
  assert.equal(m.duplicate_extractions, 0);
  assert.equal(m.provenance_complete_pct, 100);
  assert.equal(m.physical_page_alignment_pct, 100);
  assert.equal(m.unresolved_pages, 0);
  assert.deepEqual(m.newly_discovered_failure_classes, []);
});

test("duplicate extraction + published + raw-overwrite are flagged", () => {
  const bad: ReprocessPageRecord[] = [
    A("p1", 1),
    { ...A("p1", 1) },                                   // duplicate (pub#page)
    { ...A("p2", 1), published: 1 as unknown as 0 },     // unexpected publish
    { ...A("p3", 1), raw_overwritten: true },            // raw overwrite
    { ...A("p4", 1), physical_page_alignment: false, provenance_complete: false },
  ];
  const m = computeReprocessMetrics(bad, 4);
  assert.equal(m.duplicate_extractions, 1);
  assert.equal(m.published_count, 1);
  assert.equal(m.raw_overwrite_count, 1);
  assert.ok(m.newly_discovered_failure_classes.includes("DUPLICATE_EXTRACTION"));
  assert.ok(m.newly_discovered_failure_classes.includes("UNEXPECTED_PUBLISH"));
  assert.ok(m.newly_discovered_failure_classes.includes("RAW_OVERWRITE"));
  assert.ok(m.newly_discovered_failure_classes.includes("PHYSICAL_PAGE_MISALIGNMENT"));
  assert.ok(m.newly_discovered_failure_classes.includes("PROVENANCE_GAP"));
});

test("geometry table auto-accept is caught as a failure class", () => {
  const recs = [B2("p1", 1, { decision: "accepted", state: "content", ocr_state: "content", chars: 500, hebrew_share: 80, duplication: 3, numeric_ratio: 0.5, table_count: 1, table_source: "geometry", reason_codes: [] })];
  const m = computeReprocessMetrics(recs, 1);
  assert.ok(m.newly_discovered_failure_classes.includes("GEOMETRY_TABLE_AUTO_ACCEPTED"));
});

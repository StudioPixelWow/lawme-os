import { test } from "node:test";
import assert from "node:assert/strict";
import { toExtractionRow, summarize, type StagingPageRecord } from "../persist-page-extraction.ts";

const base: StagingPageRecord = {
  publication_item_id: "1046189", page_number: 3, pdf_page_index: 3, physical_page_alignment: true,
  route: "A", route_reason: "deterministic_text_layer_resolved", engine: "layout-2", engine_version: "layout-2",
  order_version: "layout-2", router_version: "hybrid-router-1", confidence: 0.95, needs_review: false, published: 0,
  provenance: { source_url: "https://fs.knesset.gov.il/25/law/25_lsr_x.pdf", machine_derived: true },
  reading_order_text: "טקסט חוקי כלשהו", b2: null,
};

test("canonical id mapping + physical anchor + official url carried through", () => {
  const row = toExtractionRow(base);
  assert.equal(row.publication_canonical_id, "knesset:publication:1046189");
  assert.equal(row.pdf_page_index, 3);
  assert.equal(row.official_pdf_url, "https://fs.knesset.gov.il/25/law/25_lsr_x.pdf");
  assert.equal(row.machine_derived, true);
  assert.equal(row.extraction_status, "extracted"); // accepted
  assert.ok(row.structured_extraction_ref?.startsWith("sha256:"));
});

test("published is ALWAYS false, even if the staging record smuggles a truthy published", () => {
  const row = toExtractionRow({ ...base, published: 1 });
  assert.equal(row.published, false);
});

test("needs_review is preserved and maps to extraction_status", () => {
  const nr = toExtractionRow({ ...base, needs_review: true });
  assert.equal(nr.needs_review, true);
  assert.equal(nr.extraction_status, "needs_review");
});

test("B2 failed OCR maps to failed status (never accepted)", () => {
  const f = toExtractionRow({ ...base, route: "B2", needs_review: true, b2: { decision: "failed", reason_codes: ["B2_OCR_ERROR"] } });
  assert.equal(f.extraction_status, "failed");
  assert.equal(f.published, false);
});

test("confidence is clamped to [0,1]; printed folio is never guessed", () => {
  assert.equal(toExtractionRow({ ...base, confidence: 1.4 }).confidence, 1);
  assert.equal(toExtractionRow({ ...base, confidence: -0.2 }).confidence, 0);
  assert.equal(toExtractionRow({ ...base, confidence: null }).confidence, null);
  assert.equal(toExtractionRow(base).printed_page_label, null);
  assert.equal(toExtractionRow(base).gazette_page_number, null);
});

test("blank text ⇒ null structured ref (no fabricated content hash)", () => {
  assert.equal(toExtractionRow({ ...base, reading_order_text: "" }).structured_extraction_ref, null);
});

test("summary counts accepted/needs_review/failed and asserts published=0", () => {
  const rows = [
    toExtractionRow(base),
    toExtractionRow({ ...base, publication_item_id: "2", needs_review: true }),
    toExtractionRow({ ...base, publication_item_id: "3", route: "B2", needs_review: true, b2: { decision: "failed" } }),
  ];
  const s = summarize(rows);
  assert.equal(s.total_rows, 3);
  assert.equal(s.accepted, 1);
  assert.equal(s.needs_review, 1);
  assert.equal(s.failed, 1);
  assert.equal(s.published, 0);
  assert.equal(s.physical_anchor_present, 3);
  assert.equal(s.distinct_publications, 3);
});

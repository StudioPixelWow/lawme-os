import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPage, numericRatio, looksLikeTable, summarizeGate, type PageGateRecord } from "../publication-gate.ts";

const base: PageGateRecord = {
  publication_canonical_id: "knesset:publication:100094",
  pdf_page_index: 3,
  extraction_status: "extracted",
  needs_review: false,
  structured_text: "חוק כלשהו — סעיף 1. הוראה מהותית בעברית.",
  official_pdf_url: "https://fs.knesset.gov.il/1/law/1_lsr_x.PDF",
};

test("accepted + full provenance + unique ⇒ SAFE_TO_PUBLISH", () => {
  assert.equal(classifyPage(base).bucket, "SAFE_TO_PUBLISH");
});

test("needs_review ⇒ NEEDS_HUMAN_REVIEW (non-table)", () => {
  assert.equal(classifyPage({ ...base, needs_review: true }).bucket, "NEEDS_HUMAN_REVIEW");
});

test("needs_review + table markers ⇒ STRUCTURED_TABLE_EXCLUDED", () => {
  assert.equal(classifyPage({ ...base, needs_review: true, structured_text: "[טבלה]\n| 36 | 4,751,336 |\n[/טבלה]" }).bucket, "STRUCTURED_TABLE_EXCLUDED");
});

test("needs_review + numeric-heavy ⇒ STRUCTURED_TABLE_EXCLUDED", () => {
  assert.equal(classifyPage({ ...base, needs_review: true, structured_text: "36 4751336 38291 1177921 1349 516690 9701" }).bucket, "STRUCTURED_TABLE_EXCLUDED");
});

test("failed extraction ⇒ MALFORMED (before anything else)", () => {
  assert.equal(classifyPage({ ...base, extraction_status: "failed" }).bucket, "MALFORMED");
});

test("missing official url ⇒ INSUFFICIENT_PROVENANCE", () => {
  assert.equal(classifyPage({ ...base, official_pdf_url: null }).bucket, "INSUFFICIENT_PROVENANCE");
});

test("missing/invalid physical anchor ⇒ INSUFFICIENT_PROVENANCE", () => {
  assert.equal(classifyPage({ ...base, pdf_page_index: 0 }).bucket, "INSUFFICIENT_PROVENANCE");
  assert.equal(classifyPage({ ...base, pdf_page_index: null }).bucket, "INSUFFICIENT_PROVENANCE");
});

test("accepted but empty text ⇒ MALFORMED", () => {
  assert.equal(classifyPage({ ...base, structured_text: "   " }).bucket, "MALFORMED");
});

test("content duplicate (not keeper) ⇒ DUPLICATE", () => {
  assert.equal(classifyPage({ ...base, is_content_duplicate: true }).bucket, "DUPLICATE");
});

test("superseded flag ⇒ SUPERSEDED (opt-in only)", () => {
  assert.equal(classifyPage({ ...base, superseded: true }).bucket, "SUPERSEDED");
  // default: never inferred
  assert.notEqual(classifyPage(base).bucket, "SUPERSEDED");
});

test("numericRatio + looksLikeTable helpers", () => {
  assert.ok(numericRatio("12345") === 1);
  assert.ok(numericRatio("אבגד") === 0);
  assert.equal(looksLikeTable("סתם טקסט משפטי בעברית בלי מספרים"), false);
  assert.equal(looksLikeTable("[טבלה] כלשהי"), true);
});

test("summarizeGate aggregates buckets + safe publication count", () => {
  const recs = [
    { ...base, verdict: classifyPage(base) },
    { ...base, publication_canonical_id: "knesset:publication:200", verdict: classifyPage({ ...base, publication_canonical_id: "knesset:publication:200" }) },
    { ...base, needs_review: true, verdict: classifyPage({ ...base, needs_review: true }) },
  ];
  const s = summarizeGate(recs);
  assert.equal(s.total_pages, 3);
  assert.equal(s.safe_to_publish, 2);
  assert.equal(s.safe_publications, 2);
  assert.equal(s.counts.NEEDS_HUMAN_REVIEW, 1);
});

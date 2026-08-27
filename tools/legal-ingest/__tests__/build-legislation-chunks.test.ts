import { test } from "node:test";
import assert from "node:assert/strict";
import {
  concatPublicationText, sectionCanonicalId, toServableChunk, toChunkRow, buildPublicationChunks,
  type PublicationMeta, type SafePage,
} from "../build-legislation-chunks.ts";
import { gateChunkForServing } from "../../../src/modules/legal-ai-israel/ingestion/legislation/citation-contract.ts";

const NOW = "2026-08-09T00:00:00+03:00";
const meta: PublicationMeta = {
  publication_canonical_id: "knesset:publication:100094",
  law_canonical_id: "knesset:2000123",
  israel_law_id: "2000123",
  title: "חוק לדוגמה",
  pdf_url: "https://fs.knesset.gov.il/x.PDF",
};

// A small but real-shaped Hebrew statute: numbered sections at line start.
const LAW_TEXT = [
  "חוק לדוגמה, התשפ\"ו-2026",
  "1. בחוק זה — \"עובד\" — מי שמועסק אצל מעסיק; \"מעסיק\" — מי שמעסיק עובד.",
  "2. מעסיק ימסור לעובד הודעה בכתב על תנאי העבודה בתוך שלושים ימים.",
  "3. הפרה של סעיף 2 היא עבירה שדינה קנס.",
].join("\n");

test("concatPublicationText orders by physical page and drops empties", () => {
  const pages: SafePage[] = [
    { publication_canonical_id: "p", pdf_page_index: 3, structured_text: "עמוד שלוש", official_pdf_url: "u" },
    { publication_canonical_id: "p", pdf_page_index: 1, structured_text: "עמוד אחת", official_pdf_url: "u" },
    { publication_canonical_id: "p", pdf_page_index: 2, structured_text: "  ", official_pdf_url: "u" },
  ];
  assert.equal(concatPublicationText(pages), "עמוד אחת\n\nעמוד שלוש");
});

test("sectionCanonicalId is scoped to the publication (deterministic)", () => {
  const a = sectionCanonicalId("knesset:publication:100094", "2");
  assert.ok(a.startsWith("Section:knesset:publication:100094:"));
  assert.equal(a, sectionCanonicalId("knesset:publication:100094", "2")); // stable
  assert.notEqual(a, sectionCanonicalId("knesset:publication:999", "2"));   // per-publication
});

test("full pipeline: real law text → sections → gated, published chunks", () => {
  const pages: SafePage[] = [{ publication_canonical_id: meta.publication_canonical_id, pdf_page_index: 1, structured_text: LAW_TEXT, official_pdf_url: "https://fs.knesset.gov.il/x.PDF" }];
  const { rows, sections } = buildPublicationChunks(meta, pages, NOW);
  assert.ok(sections >= 3, `expected >=3 parsed sections, got ${sections}`);
  assert.ok(rows.length >= 3, `expected >=3 chunks, got ${rows.length}`);
  // every published chunk carries a section number + official url + law identity
  const pub = rows.filter((r) => r.published);
  assert.ok(pub.length >= 3, "expected the clean sections to be published");
  for (const r of pub) {
    assert.ok(r.section_number.length > 0);
    assert.equal(r.law_canonical_id, meta.law_canonical_id);
    assert.equal(r.document_version_id, meta.publication_canonical_id);
    assert.ok(r.source_url.includes("fs.knesset.gov.il"));
    assert.equal(r.license_status, "statutory_exemption_sec6");
  }
});

test("a chunk missing law title fails the citation gate ⇒ held (published=false)", () => {
  const noTitle: PublicationMeta = { ...meta, title: null };
  const pages: SafePage[] = [{ publication_canonical_id: meta.publication_canonical_id, pdf_page_index: 1, structured_text: LAW_TEXT, official_pdf_url: "u" }];
  const { rows } = buildPublicationChunks(noTitle, pages, NOW);
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => r.published === false), "no chunk may publish without a law title");
});

test("toServableChunk builds a citation the real gate accepts", () => {
  const chunk = { lawId: meta.law_canonical_id, documentVersionId: meta.publication_canonical_id, sectionId: sectionCanonicalId(meta.publication_canonical_id, "2"), sectionNumber: "2", headingPath: "חוק לדוגמה › סעיף 2", ordinal: 1, chunkIndex: 0, text: "…", sourceSpanStart: 0, sourceSpanEnd: 10, tokenCount: 3, contentHash: "abc", language: "he" };
  const sc = toServableChunk(chunk, meta, "https://fs.knesset.gov.il/x.PDF", NOW);
  assert.equal(gateChunkForServing(sc).servable, true);
  assert.equal(toChunkRow(chunk, meta, "https://fs.knesset.gov.il/x.PDF", true).published, true);
});

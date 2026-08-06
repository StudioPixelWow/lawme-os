/**
 * Tests for publication identity + document model + amendment graph, using the
 * real 2001008 fixture (newest-first ordering, empty correctionNumber, נושן).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLegislationLawItemXml } from "../legislation-api.ts";
import { LAW_2001008_XML, LAW_2001008_ITEM_ID } from "../__fixtures__/law-2001008.ts";
import {
  lawPublicationId,
  publicationId,
  amendmentEventId,
  canonicalPdfUrl,
  pdfBinaryId,
} from "../publication-identity.ts";
import { toPublicationModel, buildAmendmentGraph } from "../publication-model.ts";

const item = parseLegislationLawItemXml(LAW_2001008_ITEM_ID, LAW_2001008_XML);

test("deterministic identity keys", () => {
  assert.equal(lawPublicationId("2001008"), "knesset:2001008");
  assert.equal(publicationId("416102", "2001008", null), "knesset:publication:416102");
  // empty correctionNumber → itemId-keyed amendment event id
  assert.equal(amendmentEventId("2001008", null, "416102"), "knesset:law:2001008:pub:416102");
  assert.equal(amendmentEventId("2001008", "5", "416102"), "knesset:law:2001008:correction:5");
  assert.throws(() => lawPublicationId("not-a-number"));
});

test("canonicalPdfUrl normalizes backslash paths + collapses slashes", () => {
  assert.equal(
    canonicalPdfUrl("https://fs.knesset.gov.il/\\9\\law\\9_lsr_211856.PDF"),
    "https://fs.knesset.gov.il/9/law/9_lsr_211856.PDF",
  );
  assert.equal(
    canonicalPdfUrl("25\\law\\1234_lsr_567.PDF"),
    "https://fs.knesset.gov.il/25/law/1234_lsr_567.PDF",
  );
});

test("pdfBinaryId requires a 64-hex sha256", () => {
  assert.equal(pdfBinaryId("https://x", "a".repeat(64)), `pdf:${"a".repeat(64)}`);
  assert.throws(() => pdfBinaryId("https://x", "deadbeef"));
});

test("model orders chain chronologically and detects the original enactment", () => {
  const model = toPublicationModel(item);
  assert.equal(model.law.canonicalId, "knesset:2001008");
  assert.equal(model.law.validity, "נושן");
  assert.equal(model.law.hasOpenBookConsolidation, false); // no openBookUrl
  assert.equal(model.law.hasOfficialConsolidation, false); // never official
  assert.equal(model.documents.length, 3);
  // chronological: original (1974-04) first, omnibus indirect (1977) last
  assert.equal(model.documents[0].chainIndex, 0);
  assert.equal(model.documents[0].itemId, "147618"); // earliest, matches law date
  assert.equal(model.documents[0].docType, "original_enactment");
  assert.equal(model.documents[2].itemId, "416102"); // newest
  assert.equal(model.documents[2].docType, "amendment_law"); // עקיף
  assert.equal(model.documents[1].docType, "correction"); // ישיר תיקון
});

test("every publication document is labelled non-consolidated primary-official", () => {
  const model = toPublicationModel(item);
  for (const d of model.documents) {
    assert.equal(d.consolidationStatus, "non_consolidated_publication");
    assert.equal(d.authorityLevel, "primary_official");
    assert.equal(d.contentLevel, "full_text"); // all have a PDF
    assert.equal(d.publicationSeries, "ספר החוקים");
    assert.ok(d.pdfUrl && d.pdfUrl.startsWith("https://fs.knesset.gov.il/"));
  }
  // original has no amendment-event id; amendments do
  assert.equal(model.documents[0].amendmentEventId, null);
  assert.equal(model.documents[2].amendmentEventId, "knesset:law:2001008:pub:416102");
});

test("amendment graph: original publishes, amendments amend + follow", () => {
  const model = toPublicationModel(item);
  const edges = buildAmendmentGraph(model);
  const publishes = edges.filter((e) => e.type === "publishes");
  const amends = edges.filter((e) => e.type === "amends");
  const follows = edges.filter((e) => e.type === "follows");
  assert.equal(publishes.length, 1);
  assert.equal(publishes[0].to, "knesset:2001008");
  assert.equal(amends.length, 2);
  assert.equal(follows.length, 2); // chain of 3 → 2 follows edges
});

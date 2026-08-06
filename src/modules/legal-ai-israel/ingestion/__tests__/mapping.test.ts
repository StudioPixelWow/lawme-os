/**
 * Unit + fixture tests: mapping, normalization, identity, content_level,
 * provenance, license gate, chunking. No network, no DB.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { mapKnessetLaw, mapKnessetBill, mapKnessetRecord } from "../mappers/knesset.ts";
import { mapDataGovTier1Row } from "../mappers/data-gov-tier1.ts";
import type { MapContext } from "../mappers/shared.ts";
import type { RawRecord } from "../contract.ts";
import { hashObject } from "../mappers/shared.ts";
import { lawIdentity, normalizeCaseNumber, decisionIdentity } from "../canonical/identity.ts";
import { validateCanonicalRecords, DEFAULT_VALIDATION } from "../quality.ts";
import { segmentDocument, chunkSections } from "../../parser/segment.ts";
import {
  KNESSET_LAWS, KNESSET_BILLS, ARARIM_ROWS, JUDGMENTS_ROWS, ARARIM_RESTRICTED,
} from "../__fixtures__/fixtures.ts";

const CTX: MapContext = { now: "2026-08-06T00:00:00.000Z", parserVersion: "test", mappingVersion: "test" };

function raw(row: Record<string, unknown>, externalId: string): RawRecord {
  return { externalId, sourceUrl: "https://example/src", raw: row, rawHash: hashObject(row), modifiedAt: null, deleted: false };
}

test("Knesset law maps to a Law with provenance + external id + metadata_only", () => {
  const recs = mapKnessetLaw(raw(KNESSET_LAWS[0], "2001"), CTX);
  assert.equal(recs.length, 1);
  const law = recs[0];
  assert.equal(law.entityType, "Law");
  assert.equal(law.fields.title, "חוק הגנת השכר, התשי\"ח-1958");
  assert.equal(law.envelope.sourcePlatform, "knesset_odata");
  assert.equal(law.envelope.sourcePublisher, "knesset");
  assert.equal(law.envelope.sourceDataset, "KNS_IsraelLaw");
  assert.equal(law.envelope.contentLevel, "metadata_only");
  assert.equal(law.envelope.canonicalId, "Law:knesset_law_id:2001");
  assert.ok(law.envelope.externalIdentifiers.some((e) => e.scheme === "knesset_law_id" && e.value === "2001"));
  assert.ok(law.envelope.rawRecordHash.length > 0);
  assert.equal(law.primaryText, null); // no AI/full text mixed in
  assert.equal(law.aiDerivations, null);
});

test("Knesset law with empty title gets lower confidence (no fabrication)", () => {
  const recs = mapKnessetLaw(raw(KNESSET_LAWS[2], "2003"), CTX);
  assert.equal(recs[0].fields.title, null);
  assert.ok(recs[0].envelope.confidence < 0.9);
});

test("Knesset bill maps to a Bill with knesset_bill_id identity", () => {
  const recs = mapKnessetBill(raw(KNESSET_BILLS[0], "5001"), CTX);
  assert.equal(recs[0].entityType, "Bill");
  assert.equal(recs[0].envelope.canonicalId, "Bill:knesset_bill_id:5001");
  assert.equal(recs[0].fields.status, "אושרה");
});

test("dispatch returns [] for an unknown entity set (never fabricate)", () => {
  assert.deepEqual(mapKnessetRecord("KNS_Unknown", raw({}, "x"), CTX), []);
});

test("ararim row → Case+Authority+Decision(metadata_only)+... (no full text in the real datastore)", () => {
  const recs = mapDataGovTier1Row("ararim", raw(ARARIM_ROWS[0], "ararim:1"), CTX);
  const types = recs.map((r) => r.entityType).sort();
  assert.deepEqual(types, ["Authority", "Case", "Decision", "DocumentSource", "Party", "Topic"].sort());
  const decision = recs.find((r) => r.entityType === "Decision")!;
  // ararim is a metadata case index — no decision text is published in the datastore
  assert.equal(decision.envelope.contentLevel, "metadata_only");
  assert.equal(decision.primaryText, null);
  assert.ok(decision.relationships.some((r) => r.type === "inCase"));
  assert.ok(decision.relationships.some((r) => r.type === "backedBy"));
});

test("judgments summary row is content_level=summary, NEVER full_text, no primaryText", () => {
  const recs = mapDataGovTier1Row("judgments", raw(JUDGMENTS_ROWS[0], "judgments:1"), CTX);
  const decision = recs.find((r) => r.entityType === "Decision")!;
  assert.equal(decision.envelope.contentLevel, "summary");
  assert.equal(decision.primaryText, null);
  assert.equal(decision.fields.summary, "תביעה כספית שהתקבלה חלקית.");
  // judgments has a Court (not Authority)
  assert.ok(recs.some((r) => r.entityType === "Court"));
});

test("unknown Tier-1 dataset yields [] (never fabricate)", () => {
  assert.deepEqual(mapDataGovTier1Row("not_a_dataset", raw({}, "x"), CTX), []);
});

test("identity keys are deterministic + case-number normalized", () => {
  const a = lawIdentity({ knessetLawId: "2001", officialNumber: null, title: "x", publicationDate: "2020-01-01" });
  const b = lawIdentity({ knessetLawId: "2001", officialNumber: null, title: "x", publicationDate: "2020-01-01" });
  assert.equal(a, b);
  assert.equal(normalizeCaseNumber("ע\"א 6821/93"), "ע\"א 6821/93");
  const d1 = decisionIdentity({ externalRecordId: "r1", authorityOrCourt: "בית הדין", caseNumberRaw: "ערר 1-2-23", decisionDate: "2023-01-01" });
  const d2 = decisionIdentity({ externalRecordId: "r1", authorityOrCourt: "בית הדין", caseNumberRaw: "ערר 1-2-23", decisionDate: "2023-01-01" });
  assert.equal(d1, d2);
});

test("license gate: a full_text record without full-text license → quarantined", () => {
  // Construct a full_text record directly (no live Tier-1 dataset ships full text)
  // to exercise the gate independent of any source.
  const base = mapDataGovTier1Row("judgments", raw(JUDGMENTS_ROWS[0], "judgments:1"), CTX);
  const decision = base.find((r) => r.entityType === "Decision")!;
  const fullTextRecord = {
    ...decision,
    primaryText: { raw: "נוסח מלא של פסק הדין לצורך בדיקת שער הרישוי.", contentHash: "x", language: "he" },
    envelope: { ...decision.envelope, contentLevel: "full_text" as const },
  };
  const res = validateCanonicalRecords([fullTextRecord], {
    minConfidence: 0.5, license: { ingestionAllowed: true, fullTextAllowed: false },
  });
  assert.equal(res.valid.length, 0);
  assert.ok(res.quarantined[0].reasons.includes("full_text_not_licensed"));
});

test("restriction notice (איסור פרסום / קטין) → quarantined publication_restricted", () => {
  const recs = mapDataGovTier1Row("judgments", raw(ARARIM_RESTRICTED[0], "judgments:99"), CTX);
  const res = validateCanonicalRecords(recs, DEFAULT_VALIDATION);
  const q = res.quarantined.find((x) => x.record.entityType === "Decision");
  assert.ok(q, "restricted decision must be quarantined");
  assert.ok(q!.reasons.includes("publication_restricted"));
});

test("valid metadata records pass validation with provenance", () => {
  const recs = mapKnessetLaw(raw(KNESSET_LAWS[0], "2001"), CTX);
  const res = validateCanonicalRecords(recs, DEFAULT_VALIDATION);
  assert.equal(res.valid.length, 1);
  assert.equal(res.quarantined.length, 0);
  assert.equal(res.valid[0].envelope.versionStatus, "validated");
});

test("chunking preserves legal sections and never blind-cuts by chars only", () => {
  const text = "החלטה\nלאחר עיון בטענות.\n\nסוף דבר\nהערר מתקבל.";
  const sections = segmentDocument(text);
  const chunks = chunkSections("doc1", sections);
  assert.ok(sections.length >= 2);
  assert.ok(chunks.every((c) => c.sectionType.length > 0 && c.text.length > 0));
  assert.ok(chunks.every((c) => typeof c.chunkIndex === "number"));
});

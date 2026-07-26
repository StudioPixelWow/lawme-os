import test from "node:test";
import assert from "node:assert/strict";
import { runPhase1 } from "../run.ts";
import { validateRecord, quarantine, normalizeDate } from "../validate.ts";
import { createIngestedDiscoveryAdapter } from "../discovery-adapter.ts";
import { BASIC_LAWS_ITEMS } from "../data/basic-laws.ts";
import type { SearchPlan } from "../../../../legal-research/types.ts";

const PLAN = (terms: string[]): SearchPlan => ({
  adapterId: "ingested-discovery",
  queryTerms: terms,
  topics: [],
  sections: [],
  filters: { authorityPreference: null, courtLevels: [], dateFrom: null, dateTo: null },
} as unknown as SearchPlan);

test("G1: a real batch is ingested (Basic Laws) with accepted records", async () => {
  const r = await runPhase1();
  assert.equal(BASIC_LAWS_ITEMS.length, 14);
  assert.equal(r.accepted, 14); // all 14 real Basic Laws pass the gates
  assert.ok(r.totalIn >= 15); // includes the malformed probe
});

test("G6: the malformed probe is quarantined, not discarded", async () => {
  const r = await runPhase1();
  assert.equal(r.quarantined, 1);
  const issues = r.quarantineDetail[0].issues.map((i) => i.field);
  assert.ok(issues.includes("sourceUrl")); // bad URL caught
  assert.ok(issues.includes("publicationDate")); // bad date format caught
});

test("G3: every accepted record carries provenance (owner + source key + url basis)", async () => {
  const r = await runPhase1();
  for (const rec of r.acceptedRecords) {
    assert.ok(rec.sourceOwner.length > 0);
    assert.ok(rec.sourceKey.length > 0);
    assert.ok(rec.sourceUrl && rec.sourceUrl.startsWith("http")); // falls back to DB home
    assert.equal(rec.verificationStatus, "ingested_unverified");
  }
});

test("G4: no accepted record holds full text without an approved basis", async () => {
  const r = await runPhase1();
  for (const rec of r.acceptedRecords) {
    if (rec.fullTextAvailable) assert.notEqual(rec.licenseRef, null);
    // this batch is metadata-only:
    assert.equal(rec.fullTextAvailable, false);
    assert.equal(rec.acquisitionMode, "METADATA_AND_LINK");
  }
});

test("real years are reported (1958 oldest … 2018 newest)", async () => {
  const r = await runPhase1();
  assert.equal(r.oldestYear, "1958");
  assert.equal(r.newestYear, "2018");
  assert.equal(r.coverage.byYear["1992"], 1);
});

test("G8: retrieval finds records but they are NEVER usable for a conclusion", async () => {
  const r = await runPhase1();
  const ad = createIngestedDiscoveryAdapter(r.acceptedRecords);
  const res = await ad.search(PLAN(["כבוד האדם"]));
  assert.ok(res.matchedCount >= 1);
  for (const s of res.sources) {
    assert.equal(s.verification, "unverified");
    assert.equal(s.usableForClaim, false); // structural no-promotion guarantee
    assert.ok(s.limitationsHe.length > 0);
    assert.ok(s.provenanceHe.includes("ingested_unverified"));
  }
});

test("G9: retrieval role/authority/currentness are visible on every hit", async () => {
  const r = await runPhase1();
  const ad = createIngestedDiscoveryAdapter(r.acceptedRecords);
  const res = await ad.search(PLAN([])); // empty query returns all (discovery)
  assert.equal(res.matchedCount, 14);
  for (const s of res.sources) {
    assert.ok(s.authorityLevel.length > 0);
    assert.ok(s.status.length > 0);
    assert.equal(s.bindingClass, "binding"); // Basic Laws
    assert.ok(s.publisherHe && s.publisherHe.length > 0);
  }
});

test("date normalizer accepts ISO, rejects malformed, passes null", () => {
  assert.equal(normalizeDate("1992-03-17"), "1992-03-17");
  assert.equal(normalizeDate(null), null);
  assert.equal(normalizeDate("17/03/1992"), undefined);
});

test("validateRecord blocks a corpus-path 'verified' promotion", () => {
  const rec = {
    recordId: "x", sourceKey: "il-knesset-legislation-db", sourceOwner: "Knesset", sourceUrl: null,
    acquisitionMode: "METADATA_AND_LINK" as const, authorityTier: "binding_primary" as const, issuingBody: "הכנסת",
    instrumentNumber: null, titleHe: "t", publicationDate: null, decisionDate: null, effectiveDate: null,
    validFrom: null, validTo: null, version: "1958", amendmentOf: null, currentness: "unknown" as const,
    officialStatus: "official" as const, fullTextAvailable: false, licenseRef: null, sourceHash: null,
    ingestedAt: "x", lastCheckedAt: "x", tenantId: null, verificationStatus: "verified" as const,
  };
  const issues = validateRecord(rec);
  assert.ok(issues.some((i) => i.field === "verificationStatus"));
});

test("quarantine never drops: accepted + quarantined == input", () => {
  const good = {
    recordId: "g", sourceKey: "il-knesset-legislation-db", sourceOwner: "Knesset", sourceUrl: null,
    acquisitionMode: "METADATA_AND_LINK" as const, authorityTier: "binding_primary" as const, issuingBody: "הכנסת",
    instrumentNumber: null, titleHe: "t", publicationDate: null, decisionDate: null, effectiveDate: null,
    validFrom: null, validTo: null, version: "1958", amendmentOf: null, currentness: "unknown" as const,
    officialStatus: "official" as const, fullTextAvailable: false, licenseRef: null, sourceHash: null,
    ingestedAt: "x", lastCheckedAt: "x", tenantId: null, verificationStatus: "ingested_unverified" as const,
  };
  const bad = { ...good, recordId: "", sourceUrl: "bad" };
  const q = quarantine([good, bad]);
  assert.equal(q.accepted.length + q.quarantined.length, 2);
  assert.equal(q.accepted.length, 1);
});

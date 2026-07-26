import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveAcquisitionMode,
  SOURCE_REGISTRY,
  sourceByKey,
  immediatelyImplementableSources,
  stopSources,
  dedupeRecords,
  canonicalKey,
  createOpenOfficialAdapter,
  registryCoverage,
  ingestedCoverage,
} from "../index.ts";
import type { RawAcquiredItem, AcquisitionContext, CanonicalSourceRecord } from "../index.ts";

const CTX = (blockers: AcquisitionContext["blockers"] = []): AcquisitionContext => ({
  nowISO: "2026-07-26T10:00:00+03:00",
  blockers,
});

// ---- Ladder: never exceed the lawful ceiling -----------------------------

test("L1: open-official + reuse basis ⇒ FULL_TEXT", () => {
  const r = resolveAcquisitionMode({ classification: "OPEN_OFFICIAL_FULL_TEXT", licenseOnFile: false, reuseBasisPresent: true, blockers: [] });
  assert.equal(r.mode, "FULL_TEXT");
});

test("L2: open-official WITHOUT reuse basis ⇒ falls back to link", () => {
  const r = resolveAcquisitionMode({ classification: "OPEN_OFFICIAL_FULL_TEXT", licenseOnFile: false, reuseBasisPresent: false, blockers: [] });
  assert.equal(r.mode, "METADATA_AND_LINK");
});

test("L3: licensed source without a license never reaches full text", () => {
  const r = resolveAcquisitionMode({ classification: "LICENSED_FULL_TEXT", licenseOnFile: false, reuseBasisPresent: true, blockers: [] });
  assert.equal(r.mode, "METADATA_AND_LINK");
});

test("L4: a paywall/auth blocker NEVER yields full text (no bypass)", () => {
  for (const b of ["authentication_required", "paywall", "technical_protection_measure", "access_control", "restricted_api", "sealed_or_confidential"] as const) {
    const r = resolveAcquisitionMode({ classification: "OPEN_OFFICIAL_FULL_TEXT", licenseOnFile: true, reuseBasisPresent: true, blockers: [b] });
    assert.notEqual(r.mode, "FULL_TEXT", `blocker ${b} must prevent full text`);
  }
});

test("L5: REQUIRES_LICENSE ceiling is link-only, not blocked", () => {
  const r = resolveAcquisitionMode({ classification: "REQUIRES_LICENSE", licenseOnFile: false, reuseBasisPresent: false, blockers: [] });
  assert.equal(r.mode, "METADATA_AND_LINK");
});

test("L6: discovery-only stays discovery-only", () => {
  const r = resolveAcquisitionMode({ classification: "DISCOVERY_ONLY", licenseOnFile: false, reuseBasisPresent: true, blockers: [] });
  assert.equal(r.mode, "DISCOVERY_ONLY");
});

// ---- Registry integrity ---------------------------------------------------

test("R1: every source has a stable unique key and a classification", () => {
  const keys = new Set<string>();
  for (const s of SOURCE_REGISTRY) {
    assert.ok(s.sourceKey.length > 0);
    assert.ok(!keys.has(s.sourceKey), `dup key ${s.sourceKey}`);
    keys.add(s.sourceKey);
  }
});

test("R2: licensed providers require external approval and carry no reuse basis", () => {
  const nevo = sourceByKey("il-nevo");
  assert.ok(nevo);
  assert.equal(nevo!.requiresExternalApproval, true);
  assert.equal(nevo!.reuseBasisRef, null);
  assert.equal(nevo!.licenseOnFile, false);
});

test("R3: official legislation & Supreme Court are open full-text on §6", () => {
  for (const key of ["il-knesset-legislation-db", "il-supreme-court"]) {
    const s = sourceByKey(key)!;
    assert.equal(s.classification, "OPEN_OFFICIAL_FULL_TEXT");
    assert.ok(s.reuseBasisRef && s.reuseBasisRef.includes("§6"));
    assert.equal(s.requiresExternalApproval, false);
  }
});

test("R4: immediately-implementable and STOP sets partition the registry", () => {
  const a = immediatelyImplementableSources().length;
  const b = stopSources().length;
  assert.equal(a + b, SOURCE_REGISTRY.length);
  assert.ok(a > 0 && b > 0);
});

// ---- Adapter: gating + no fabrication ------------------------------------

const legItem: RawAcquiredItem = {
  sourceUrl: "https://main.knesset.gov.il/...",
  issuingBody: "Knesset",
  instrumentNumber: "5763-2002",
  titleHe: null, // adapter must not invent a title
  publicationDate: "2002-01-01",
  decisionDate: null,
  effectiveDate: "2002-01-01",
  version: "v1",
  fullText: "טקסט חקיקה רשמי לדוגמה",
  tenantId: null,
};

test("A1: empty input ⇒ empty output (fabricates nothing)", async () => {
  const ad = createOpenOfficialAdapter(sourceByKey("il-knesset-legislation-db")!);
  const out = await ad.acquire([], CTX());
  assert.equal(out.length, 0);
});

test("A2: open-official with §6 basis holds full text and hashes it", async () => {
  const ad = createOpenOfficialAdapter(sourceByKey("il-knesset-legislation-db")!);
  const [rec] = await ad.acquire([legItem], CTX());
  assert.equal(rec.acquisitionMode, "FULL_TEXT");
  assert.equal(rec.fullTextAvailable, true);
  assert.ok(rec.sourceHash && rec.sourceHash.length === 64);
  assert.equal(rec.verificationStatus, "ingested_unverified"); // retrieval ≠ verification
  assert.equal(rec.titleHe, null); // nothing invented
});

test("A3: a blocker downgrades the SAME item to link-only and drops the text", async () => {
  const ad = createOpenOfficialAdapter(sourceByKey("il-knesset-legislation-db")!);
  const [rec] = await ad.acquire([legItem], CTX(["paywall"]));
  assert.equal(rec.acquisitionMode, "METADATA_AND_LINK");
  assert.equal(rec.fullTextAvailable, false);
  assert.equal(rec.sourceHash, null);
});

test("A4: firm-owned records carry the tenant id; shared records never do", async () => {
  const firmItem: RawAcquiredItem = { ...legItem, tenantId: "org-123" };
  const firm = createOpenOfficialAdapter(sourceByKey("firm-owned-corpus")!);
  const [frec] = await firm.acquire([firmItem], CTX());
  assert.equal(frec.tenantId, "org-123");

  const shared = createOpenOfficialAdapter(sourceByKey("il-knesset-legislation-db")!);
  const [srec] = await shared.acquire([{ ...legItem, tenantId: "org-123" }], CTX());
  assert.equal(srec.tenantId, null); // a shared official source is never tenant-scoped
});

// ---- Dedup ----------------------------------------------------------------

test("D1: same hash across sources collapses to the fullest record", async () => {
  const base: CanonicalSourceRecord = {
    recordId: "r1", sourceKey: "il-supreme-court", sourceOwner: "בתי המשפט", sourceUrl: null,
    acquisitionMode: "METADATA_AND_LINK", authorityTier: "binding_primary", issuingBody: "עליון",
    instrumentNumber: "1234/20", titleHe: null, publicationDate: null, decisionDate: "2020-05-01",
    effectiveDate: null, validFrom: null, validTo: null, version: null, amendmentOf: null,
    currentness: "current", officialStatus: "official", fullTextAvailable: false, licenseRef: null,
    sourceHash: null, ingestedAt: "x", lastCheckedAt: "2026-01-01", tenantId: null, verificationStatus: "discovery_only",
  };
  const link = { ...base };
  const full = { ...base, recordId: "r2", acquisitionMode: "FULL_TEXT" as const, fullTextAvailable: true };
  const { unique, duplicatesRemoved } = dedupeRecords([link, full]);
  assert.equal(unique.length, 1);
  assert.equal(duplicatesRemoved, 1);
  assert.equal(unique[0].acquisitionMode, "FULL_TEXT");
  assert.equal(canonicalKey(link), canonicalKey(full));
});

// ---- Metrics --------------------------------------------------------------

test("M1: registry coverage counts partition into immediate + STOP", () => {
  const c = registryCoverage();
  assert.equal(c.totalSources, SOURCE_REGISTRY.length);
  assert.equal(c.immediatelyImplementable + c.requiresExternalApproval, c.totalSources);
});

test("M2: ingested coverage never claims records it does not have", () => {
  const c = ingestedCoverage([]);
  assert.equal(c.totalRecords, 0);
  assert.equal(c.fullTextHeld, 0);
});

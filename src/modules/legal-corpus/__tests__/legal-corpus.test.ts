/**
 * Verified Legal Corpus — foundation tests (P1-S1, Gate-A build).
 * Deterministic; uses SYNTHETIC fixtures only — NO real legal text, NO network.
 * Proves the invariants and benchmark gates without ingesting anything.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canProvisionSupportConclusion,
  selectVersionForAsOf,
  isWholeDocumentPinpoint,
} from "../invariants.ts";
import { recordVerification, isCurrentlyVerified } from "../verification.ts";
import { enforceExcerpt, licensePermits } from "../license.ts";
import { computeCoverageLevel, buildDoctrineCoverage } from "../coverage.ts";
import { sha256Hex, reproducibilityKey } from "../hash.ts";
import { deepFreeze } from "../deep-freeze.ts";
import {
  createGuardedLegislationAdapter,
  P1_S1_ALLOWLIST,
  ReuseBasisMissingError,
  InstrumentNotAllowlistedError,
} from "../adapter.ts";
import {
  syntheticVerifiedVersion,
  syntheticProvision,
  syntheticVerifiedPinpoint,
  syntheticWholeDocPinpoint,
  syntheticLicense,
} from "../fixtures.ts";
import { evaluateCase } from "../benchmark/harness.ts";
import type {
  LegalSourceVersion,
  LegalVerificationRecord,
  VerificationCheckedFields,
  InstrumentRef,
  ReuseBasis,
} from "../types.ts";
import type { ActualAnswer, BenchmarkCase } from "../benchmark/harness.ts";

const NOW = "2026-07-25T09:00:00+03:00";

const ALL_CHECKED: VerificationCheckedFields = {
  title: true, enactmentIdentity: true, sectionIdentity: true, effectiveDate: true,
  amendmentStatus: true, permalink: true, sourceTextHash: true, sourceVersion: true, licensePolicy: true,
};

function verifiedRecord(overrides?: Partial<LegalVerificationRecord>): LegalVerificationRecord {
  return recordVerification({
    verificationId: "vr1", versionId: "synthetic-v1", verifier: "editor:test", method: "manual",
    checkedFields: ALL_CHECKED, timestamp: NOW, reVerifyDueDate: "2026-12-31", notes: null,
    ...(overrides ?? {}),
  });
}

// --- Invariant 2: unknown stays unknown -----------------------------------
test("unknown effectiveDate is never guessed — such a version is not selected", () => {
  const versions: LegalSourceVersion[] = [
    syntheticVerifiedVersion({ versionId: "v-unknown", effectiveDate: null }),
  ];
  assert.equal(selectVersionForAsOf(versions, NOW), null);
});

// --- Invariant 1 / Phase16 #2: unverified cannot support -------------------
test("unverified source version cannot support a conclusion", () => {
  const version = syntheticVerifiedVersion({ verificationStatus: "discovery_only" });
  const d = canProvisionSupportConclusion({
    provision: syntheticProvision(), version, verification: verifiedRecord(),
    license: syntheticLicense, use: "display", asOfISO: NOW,
  });
  assert.equal(d.canSupport, false);
  assert.equal(d.reason, "version_unverified");
});

// --- Phase16 #3: expired verification cannot support -----------------------
test("expired verification cannot support a conclusion", () => {
  const rec = verifiedRecord({ reVerifyDueDate: "2026-01-01" }); // due date in the past
  assert.equal(isCurrentlyVerified(rec, NOW), false);
  const d = canProvisionSupportConclusion({
    provision: syntheticProvision(), version: syntheticVerifiedVersion(), verification: rec,
    license: syntheticLicense, use: "display", asOfISO: NOW,
  });
  assert.equal(d.canSupport, false);
  assert.equal(d.reason, "verification_absent_or_expired");
});

// --- Phase16 #4: rejected verification cannot support ----------------------
test("rejected verification (incomplete checks) cannot support", () => {
  const rec = recordVerification({
    verificationId: "vr2", versionId: "synthetic-v1", verifier: "editor:test", method: "manual",
    checkedFields: { ...ALL_CHECKED, permalink: false }, timestamp: NOW, reVerifyDueDate: "2026-12-31", notes: null,
  });
  assert.equal(rec.result, "rejected");
  assert.equal(isCurrentlyVerified(rec, NOW), false);
});

test("verification never auto-verifies without a named verifier", () => {
  const rec = recordVerification({
    verificationId: "vr3", versionId: "synthetic-v1", verifier: "  ", method: "manual",
    checkedFields: ALL_CHECKED, timestamp: NOW, reVerifyDueDate: null, notes: null,
  });
  assert.equal(rec.result, "rejected");
});

// --- Phase16 #5: superseded version not selected after supersession --------
test("superseded version is not selected after its supersession date", () => {
  const versions: LegalSourceVersion[] = [
    syntheticVerifiedVersion({ versionId: "old", effectiveDate: "2019-01-01", supersededFromDate: "2021-01-01" }),
    syntheticVerifiedVersion({ versionId: "new", effectiveDate: "2021-01-01" }),
  ];
  const picked = selectVersionForAsOf(versions, NOW);
  assert.equal(picked?.versionId, "new");
});

// --- Phase16 #6/#7: historical asOf + future-effective ---------------------
test("historical asOf selects the historically effective version; future not selected early", () => {
  const versions: LegalSourceVersion[] = [
    syntheticVerifiedVersion({ versionId: "2018", effectiveDate: "2018-01-01" }),
    syntheticVerifiedVersion({ versionId: "2025", effectiveDate: "2025-01-01" }),
    syntheticVerifiedVersion({ versionId: "future", effectiveDate: "2027-01-01" }),
  ];
  assert.equal(selectVersionForAsOf(versions, "2019-06-01T00:00:00+03:00")?.versionId, "2018");
  assert.equal(selectVersionForAsOf(versions, NOW)?.versionId, "2025");
  // future-effective never selected before its date
  assert.notEqual(selectVersionForAsOf(versions, NOW)?.versionId, "future");
});

// --- Phase16 #8/#9: hashing + reproducibility ------------------------------
test("text hashing is deterministic and reproducibility key is stable", () => {
  assert.equal(sha256Hex("abc"), sha256Hex("abc"));
  assert.notEqual(sha256Hex("abc"), sha256Hex("abd"));
  const key = reproducibilityKey({
    corpusVersion: "c1", sourceId: "s1", versionId: "v1", sourceTextHash: "h1", verificationId: "vr1", asOfISO: NOW,
  });
  assert.equal(key, `c1|s1|v1|h1|vr1|${NOW}`);
});

// --- Phase16 #10: license enforcement --------------------------------------
test("license restrictions are enforced at the excerpt boundary", () => {
  const short = enforceExcerpt(syntheticLicense, "x".repeat(100));
  assert.equal(short.truncated, true);
  assert.equal(short.text?.length, 40);
  assert.equal(short.attributionHe, "מקור סינתטי לבדיקה בלבד");
  const denied = enforceExcerpt({ ...syntheticLicense, displayAllowed: false }, "text");
  assert.equal(denied.allowed, false);
  assert.equal(licensePermits({ ...syntheticLicense, exportToWorkProductAllowed: false }, "export"), false);
});

// --- pinpoint honesty ------------------------------------------------------
test("whole-document URL is rejected as a pinpoint; a real deep anchor passes", () => {
  assert.equal(isWholeDocumentPinpoint(syntheticWholeDocPinpoint()), true);
  assert.equal(isWholeDocumentPinpoint(syntheticVerifiedPinpoint()), false);
});

// --- provision not in force ------------------------------------------------
test("a not-in-force provision cannot support a conclusion", () => {
  const d = canProvisionSupportConclusion({
    provision: syntheticProvision({ inForce: "future_effective" }), version: syntheticVerifiedVersion(),
    verification: verifiedRecord(), license: syntheticLicense, use: "display", asOfISO: NOW,
  });
  assert.equal(d.canSupport, false);
  assert.equal(d.reason, "provision_not_in_force");
});

test("the happy path: verified + current + licensed + in-force ⇒ can support", () => {
  const d = canProvisionSupportConclusion({
    provision: syntheticProvision(), version: syntheticVerifiedVersion(), verification: verifiedRecord(),
    license: syntheticLicense, use: "display", asOfISO: NOW,
  });
  assert.equal(d.canSupport, true);
});

// --- coverage never complete ----------------------------------------------
test("coverage is doctrine-based and never 'complete'", () => {
  assert.equal(computeCoverageLevel([], []), "insufficient");
  assert.equal(computeCoverageLevel(["a", "b"], []), "insufficient");
  assert.equal(computeCoverageLevel(["a", "b"], ["a"]), "partial");
  assert.equal(computeCoverageLevel(["a"], ["a"]), "substantial");
  const rec = buildDoctrineCoverage({
    doctrineId: "D-NOTICE", requiredProvisions: ["a", "b"], presentVerifiedProvisions: ["a"],
    requiredAuthorities: [], presentVerifiedAuthorities: [], permittedClaimHe: "טיוטה", lastReviewed: NOW,
  });
  assert.deepEqual(rec.gaps, ["b"]);
  // The type system forbids "complete"; assert we never emit it at runtime.
  assert.notEqual(rec.coverageLevel as string, "complete");
});

// --- Gate A encoded in the adapter -----------------------------------------
test("adapter refuses to acquire without a confirmed reuse basis (STOP GATE A)", async () => {
  const adapter = createGuardedLegislationAdapter({ id: "legislation", reuseBasis: null });
  const ref = P1_S1_ALLOWLIST[0];
  await assert.rejects(() => adapter.acquire(ref), ReuseBasisMissingError);
});

test("adapter refuses instruments outside the D-NOTICE/D-MINWAGE allowlist", async () => {
  const adapter = createGuardedLegislationAdapter({ id: "legislation", reuseBasis: null });
  const bad: InstrumentRef = { doctrineId: "D-NOTICE", instrumentKind: "statute", internalKey: "d-severance/statute" };
  await assert.rejects(() => adapter.acquire(bad), InstrumentNotAllowlistedError);
});

test("a confirmed reuse basis WITHOUT a wired transport still fails closed (no fabrication)", async () => {
  const basis: ReuseBasis = {
    kind: "counsel_confirmation", reference: "REUSE-BASIS-RECORD-PENDING", confirmedInWriting: true,
    scope: ["display", "excerpt", "export"], allowlist: [P1_S1_ALLOWLIST[0]],
  };
  const adapter = createGuardedLegislationAdapter({ id: "legislation", reuseBasis: basis });
  await assert.rejects(() => adapter.acquire(P1_S1_ALLOWLIST[0]), ReuseBasisMissingError);
});

// --- benchmark harness enforces gates (synthetic) --------------------------
function baseCase(): BenchmarkCase {
  return {
    caseId: "c1", doctrineId: "D-NOTICE", questionHe: "שאלה סינתטית", contextKind: "general", asOfISO: NOW,
    gold: {
      expectedStatus: "answered",
      expectedCitations: [{
        sourceId: "s1", titleHe: "כותרת סינתטית", year: 2020, section: "1", subsection: null,
        versionId: "v1", effectiveStatus: "in_force", link: "https://example.test/x#s1",
        pinpointExpected: true, supportsProposition: "claim1",
      }],
      forbiddenSourceIds: ["forbidden"], expectedCoverageLevel: "substantial",
    },
  };
}
function goodAnswer(): ActualAnswer {
  return {
    status: "answered", coverageLevel: "substantial",
    citations: [{
      citationId: "cit1", sourceId: "s1", titleHe: "כותרת סינתטית", year: 2020, section: "1", subsection: null,
      versionId: "v1", effectiveStatus: "in_force", link: "https://example.test/x#s1", pinpointResolvable: true,
      supportsProposition: "claim1", licenseCompliant: true, fromCorpus: true,
    }],
  };
}

test("harness: a clean answer passes all gates deterministically", () => {
  const c = baseCase();
  const a = goodAnswer();
  const r = evaluateCase(c, a, goodAnswer());
  assert.equal(r.passed, true);
});

test("harness G1: a fabricated citation fails", () => {
  const c = baseCase();
  const a = goodAnswer();
  a.citations[0].fromCorpus = false;
  const r = evaluateCase(c, a, structuredClone(a));
  assert.equal(r.passed, false);
  assert.equal(r.gates.find((g) => g.gate === "G1")?.passed, false);
});

test("harness G4: a whole-doc link claimed as pinpoint fails", () => {
  const c = baseCase();
  c.gold.expectedCitations[0].pinpointExpected = false;
  const a = goodAnswer();
  a.citations[0].link = "https://example.test/x"; // no fragment
  a.citations[0].pinpointResolvable = true;
  const r = evaluateCase(c, a, structuredClone(a));
  assert.equal(r.gates.find((g) => g.gate === "G4")?.passed, false);
});

test("harness G8: non-deterministic output fails", () => {
  const c = baseCase();
  const a = goodAnswer();
  const b = goodAnswer();
  b.citations[0].citationId = "cit-different";
  const r = evaluateCase(c, a, b);
  assert.equal(r.gates.find((g) => g.gate === "G8")?.passed, false);
});

test("harness G9: asserting authority in a negative case fails", () => {
  const c = baseCase();
  c.gold.expectedCitations = []; // negative case: nothing should be cited
  const r = evaluateCase(c, goodAnswer(), goodAnswer());
  assert.equal(r.gates.find((g) => g.gate === "G9")?.passed, false);
});

// --- immutability ----------------------------------------------------------
test("built domain objects are deeply frozen", () => {
  const v = syntheticVerifiedVersion();
  assert.ok(Object.isFrozen(v));
  const frozen = deepFreeze({ a: { b: 1 } });
  assert.ok(Object.isFrozen(frozen.a));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  // epistemic
  fromMatterFactStatus, toMatterFactStatus, fromDinoContextStatus,
  isAllegation, isConfirmedFact, isUnestablished,
  type MatterFactStatusLegacy, type DinoContextStatusLegacy, type EpistemicStatus,
  // policy
  aiProcessingProhibited, aiRequiresReview, aiRequiresPrivateContextStripping,
  isPrivileged,
  // provenance
  provenanceFromSource, fromDinoContextProvenance,
  // confidence
  dinoConfidenceBandToShared,
  // review
  dinoReviewTargetToShared, reviewRouteFromFlag,
  // severity
  worstSeverity, severityRank,
  INTELLIGENCE_CORE_VERSION,
} from "../index.ts";

/* ---------------- epistemic status ---------------- */

const ALL_MATTER: MatterFactStatusLegacy[] =
  ["confirmed", "client_alleged", "opposing_alleged", "document_derived", "disputed", "unknown"];

test("every legacy Matter fact-status maps to a canonical epistemic status", () => {
  for (const s of ALL_MATTER) {
    const c = fromMatterFactStatus(s);
    assert.ok(typeof c === "string" && c.length > 0, `no mapping for ${s}`);
  }
});

test("INVARIANT: no allegation ever maps to a confirmed fact", () => {
  for (const s of ["client_alleged", "opposing_alleged"] as MatterFactStatusLegacy[]) {
    const c = fromMatterFactStatus(s);
    assert.ok(isAllegation(c), `${s} should map to an allegation`);
    assert.equal(isConfirmedFact(c), false, `${s} must NOT be a confirmed fact`);
  }
  // disputed and unknown are also unestablished
  assert.equal(isConfirmedFact(fromMatterFactStatus("disputed")), false);
  assert.equal(isConfirmedFact(fromMatterFactStatus("unknown")), false);
});

test("only confirmed_fact and document_derived_fact count as established", () => {
  assert.ok(isConfirmedFact(fromMatterFactStatus("confirmed")));
  assert.ok(isConfirmedFact(fromMatterFactStatus("document_derived")));
  for (const s of ["client_alleged", "opposing_alleged", "disputed", "unknown"] as MatterFactStatusLegacy[]) {
    assert.ok(isUnestablished(fromMatterFactStatus(s)));
  }
});

test("Matter round-trips through canonical without changing meaning", () => {
  for (const s of ALL_MATTER) {
    assert.equal(toMatterFactStatus(fromMatterFactStatus(s)), s, `round-trip failed for ${s}`);
  }
});

test("canonical-only statuses have no Matter legacy value (no silent coercion)", () => {
  assert.equal(toMatterFactStatus("inference"), null);
  assert.equal(toMatterFactStatus("assumption"), null);
});

test("Dino legacy context statuses already use canonical names (identity, typed)", () => {
  const dinoValues: DinoContextStatusLegacy[] =
    ["confirmed_fact", "client_allegation", "opposing_party_allegation", "document_derived_fact", "inference", "unknown", "disputed_fact"];
  for (const s of dinoValues) {
    const c: EpistemicStatus = fromDinoContextStatus(s);
    assert.equal(c, s);
  }
  // and the allegation invariant holds for Dino too
  assert.ok(isAllegation(fromDinoContextStatus("client_allegation")));
  assert.equal(isConfirmedFact(fromDinoContextStatus("opposing_party_allegation")), false);
});

/* ---------------- AI policy / confidentiality ---------------- */

test("AI policy helpers reflect the four canonical values (Dino+Matter shared)", () => {
  assert.ok(aiProcessingProhibited("prohibited"));
  assert.equal(aiProcessingProhibited("allowed"), false);
  assert.ok(aiRequiresReview("allowed_with_review"));
  assert.ok(aiRequiresPrivateContextStripping("restricted_no_private_context"));
});

test("confidentiality privilege detection", () => {
  assert.ok(isPrivileged("privileged"));
  assert.equal(isPrivileged("internal"), false);
  assert.equal(isPrivileged("client_confidential"), false);
});

/* ---------------- provenance ---------------- */

test("provenance from a legacy source string is well-formed", () => {
  const p = provenanceFromSource("תלוש שכר");
  assert.equal(p.reference, "תלוש שכר");
  assert.equal(p.origin, "lawme_record");
});

test("Dino ContextProvenance maps into shared Provenance losslessly", () => {
  const p = fromDinoContextProvenance({ origin: "user_supplied", reference: "user message", recordedAt: "2026-07-12" });
  assert.equal(p.origin, "user_supplied");
  assert.equal(p.reference, "user message");
  assert.equal(p.recordedAt, "2026-07-12");
});

/* ---------------- confidence ---------------- */

test("Dino confidence bands map to neutral shared bands", () => {
  assert.equal(dinoConfidenceBandToShared("high_within_poc"), "high");
  assert.equal(dinoConfidenceBandToShared("domain_mismatch"), "not_applicable");
  assert.equal(dinoConfidenceBandToShared("human_review_required"), "human_review_required");
});

/* ---------------- review routing ---------------- */

test("Dino review targets map to canonical targets (no_review rename)", () => {
  assert.equal(dinoReviewTargetToShared("no_review_internal_list"), "no_review");
  assert.equal(dinoReviewTargetToShared("partner_review"), "partner_review");
  assert.equal(dinoReviewTargetToShared("do_not_proceed"), "do_not_proceed");
});

test("reviewRouteFromFlag builds the canonical shape from a boolean", () => {
  const r = reviewRouteFromFlag(true, "senior_lawyer_review", "high", ["reason"]);
  assert.equal(r.primaryTarget, "senior_lawyer_review");
  assert.deepEqual(r.targets, ["senior_lawyer_review"]);
  assert.equal(r.blocking, false);
  const none = reviewRouteFromFlag(false, "lawyer_review", "low", []);
  assert.equal(none.primaryTarget, "no_review");
});

/* ---------------- severity ---------------- */

test("severity ordering is total and worst() picks the higher", () => {
  assert.ok(severityRank("critical") > severityRank("info"));
  assert.equal(worstSeverity("low", "high"), "high");
  assert.equal(worstSeverity("critical", "medium"), "critical");
});

test("core exposes a version", () => {
  assert.match(INTELLIGENCE_CORE_VERSION, /intelligence-core/);
});

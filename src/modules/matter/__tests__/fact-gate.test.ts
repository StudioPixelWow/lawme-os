/**
 * Platform 0.7.1 — Fact-gate correctness (Workstream A).
 *
 * Proves the Evidence → Fact confirmation boundary at the stage-advancement gate:
 * only ESTABLISHED facts (confirmed | document_derived) may satisfy a stage's
 * `requiredFacts`. Allegations (client_alleged / opposing_alleged / disputed) and
 * unknown must NEVER advance a stage or falsely improve readiness / health /
 * score / posture. Regression guard for the historical `status !== "unknown"` bug.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { FactStatus, Matter } from "../types.ts";
import { isEstablishedFactStatus, ESTABLISHED_FACT_STATUSES } from "../fact-status.ts";
import { blockingConditions, stateSnapshot } from "../state-machine.ts";
import { assessMatter } from "../intelligence.ts";
import { computeMatterScore } from "../score/index.ts";
import type { MatterPosture } from "../score/types.ts";
import { readyMatter } from "./fixtures.ts";

/* ---- helpers ---- */
function readinessOf(m: Matter) {
  return assessMatter(m).engines.find((e) => e.engine === "matter-readiness")!;
}
function healthOf(m: Matter) {
  return assessMatter(m).engines.find((e) => e.engine === "matter-health")!;
}
function postureOf(m: Matter): MatterPosture {
  return computeMatterScore(assessMatter(m)).summary.posture;
}
/** Higher = worse posture (for "not better" comparisons). */
const POSTURE_WORSENESS: Record<MatterPosture, number> = {
  on_track: 0, needs_attention: 1, insufficient_data: 2, at_risk: 3,
  requires_review: 4, degraded: 5, blocked: 6,
};
/** readyMatter with one required fact downgraded to a given status. */
function withDismissalStatus(status: FactStatus): Matter {
  const m = readyMatter();
  const f = m.facts.find((x) => x.field === "dismissal_date")!;
  f.status = status;
  return m;
}
const factBlocks = (m: Matter) =>
  blockingConditions(m).filter((b) => b.kind === "missing_fact").map((b) => b.code);

/* ================= predicate (1–6) ================= */

test("A1: unknown does not satisfy an established-fact requirement", () => {
  assert.equal(isEstablishedFactStatus("unknown"), false);
});
test("A2: client_alleged does not satisfy it", () => {
  assert.equal(isEstablishedFactStatus("client_alleged"), false);
});
test("A3: opposing_alleged does not satisfy it", () => {
  assert.equal(isEstablishedFactStatus("opposing_alleged"), false);
});
test("A4: disputed does not satisfy it", () => {
  assert.equal(isEstablishedFactStatus("disputed"), false);
});
test("A5: confirmed satisfies it", () => {
  assert.equal(isEstablishedFactStatus("confirmed"), true);
});
test("A6: document_derived satisfies it (approved, provenance-backed) and the set is exactly these two", () => {
  assert.equal(isEstablishedFactStatus("document_derived"), true);
  assert.deepEqual([...ESTABLISHED_FACT_STATUSES].sort(), ["confirmed", "document_derived"]);
});

/* ================= stage gate (7, 11, 12) ================= */

test("A7: an allegation alone does not advance the stage (becomes a missing established fact)", () => {
  const alleged = withDismissalStatus("client_alleged");
  const confirmed = withDismissalStatus("confirmed");
  // dismissal_date is a required fact of stage preg-2.
  assert.ok(factBlocks(alleged).includes("fact:dismissal_date"), "allegation must leave the fact gate open");
  assert.ok(!factBlocks(confirmed).includes("fact:dismissal_date"), "confirmed must satisfy the fact gate");
  // opposing_alleged and disputed behave identically (never established).
  assert.ok(factBlocks(withDismissalStatus("opposing_alleged")).includes("fact:dismissal_date"));
  assert.ok(factBlocks(withDismissalStatus("disputed")).includes("fact:dismissal_date"));
});

test("A11: an established (evidence-approved) fact still permits advancement", () => {
  // readyMatter: all required facts confirmed/document_derived, mandatory evidence
  // collected, no overdue deadline -> no blocks -> canAdvance.
  const m = readyMatter();
  assert.equal(factBlocks(m).length, 0);
  assert.equal(stateSnapshot(m).canAdvance, true);
});

test("A12: the pregnancy-dismissal scenario stays honest (allegation blocks; document_derived does not)", () => {
  // document_derived is treated as established and consistent with the domain model.
  assert.ok(!factBlocks(withDismissalStatus("document_derived")).includes("fact:dismissal_date"));
  // a client allegation for the same fact is honestly surfaced as still-missing.
  const snap = stateSnapshot(withDismissalStatus("client_alleged"));
  assert.ok(snap.blocking.some((b) => b.code === "fact:dismissal_date" && b.kind === "missing_fact"));
});

/* ================= no false improvement (8, 9, 10) ================= */

const num = (x: number | null): number => {
  assert.equal(typeof x, "number");
  return x as number;
};

test("A8: an allegation does not falsely improve readiness", () => {
  const alleged = readinessOf(withDismissalStatus("client_alleged"));
  const confirmed = readinessOf(withDismissalStatus("confirmed"));
  assert.ok((alleged.data as { openGates: number }).openGates >
            (confirmed.data as { openGates: number }).openGates,
            "allegation must leave more open gates");
  assert.ok(num(alleged.score) < num(confirmed.score), "allegation readiness score must be lower");
});

test("A9: an allegation does not falsely improve health", () => {
  const alleged = healthOf(withDismissalStatus("client_alleged"));
  const confirmed = healthOf(withDismissalStatus("confirmed"));
  assert.ok(num(alleged.score) <= num(confirmed.score), "allegation health must not exceed confirmed");
});

test("A10: an allegation does not falsely improve Matter Score / Posture", () => {
  const alleged = postureOf(withDismissalStatus("client_alleged"));
  const confirmed = postureOf(withDismissalStatus("confirmed"));
  assert.ok(POSTURE_WORSENESS[alleged] >= POSTURE_WORSENESS[confirmed],
            `allegation posture (${alleged}) must not be better than confirmed (${confirmed})`);
});

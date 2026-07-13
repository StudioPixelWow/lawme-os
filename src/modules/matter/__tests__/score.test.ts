import { test } from "node:test";
import assert from "node:assert/strict";
import { assessMatter } from "../intelligence.ts";
import { computeMatterScore, computeTrend } from "../score/index.ts";
import { REQUIRED_DIMENSIONS } from "../score/types.ts";
import { COMPONENT_ENGINES } from "../engines/index.ts";
import type { MatterEngine, EngineAssessment } from "../types.ts";
import { readyMatter, earlyBlockedMatter } from "./fixtures.ts";
import { missingLegalCoverage, conflictingFacts } from "./score-fixtures.ts";

const dimOf = (score: ReturnType<typeof computeMatterScore>, id: string) =>
  score.dimensions.find((d) => d.id === id)!;

test("score has all 12 required dimensions + the optional outcomeReadiness", () => {
  const s = computeMatterScore(assessMatter(readyMatter()));
  for (const id of REQUIRED_DIMENSIONS) assert.ok(dimOf(s, id), `missing dimension ${id}`);
  assert.ok(dimOf(s, "outcomeReadiness"));
});

test("healthy matter → on_track, no false certainty (legal/outcome are not numeric)", () => {
  const s = computeMatterScore(assessMatter(readyMatter()));
  assert.equal(s.summary.posture, "on_track");
  assert.equal(dimOf(s, "legal").numericScore, null);      // legal certainty is categorical
  assert.equal(dimOf(s, "outcomeReadiness").numericScore, null);
  assert.equal(dimOf(s, "deadlines").numericScore, null);  // deadlines categorical
  assert.equal(dimOf(s, "client").numericScore, null);     // sentiment categorical
});

test("measurable dimensions carry an integer 0..100 with a categorical state", () => {
  const s = computeMatterScore(assessMatter(readyMatter()));
  for (const id of ["evidence", "documents", "readiness", "progress", "risk"]) {
    const d = dimOf(s, id);
    assert.ok(d.numericScore !== null && Number.isInteger(d.numericScore), `${id} should be integer`);
    assert.ok(d.numericScore >= 0 && d.numericScore <= 100);
    assert.ok(typeof d.state === "string"); // always accompanied by categorical state
  }
});

test("NO opaque overall percentage exists on the score", () => {
  const s = computeMatterScore(assessMatter(readyMatter()));
  // the summary exposes a posture + coverage, never a single blended 0..100 score
  assert.equal(Object.prototype.hasOwnProperty.call(s.summary, "overallScore"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(s, "overallPercent"), false);
});

test("blocked legal/deadline cannot be hidden by healthy dimensions (no averaging)", () => {
  const s = computeMatterScore(assessMatter(earlyBlockedMatter()));
  assert.equal(s.summary.posture, "blocked");
  assert.equal(dimOf(s, "deadlines").state, "blocked");   // strict overdue
  // even though documents/finance are healthy/strong, posture is blocked
  assert.ok(["strong", "healthy"].includes(dimOf(s, "documents").state));
});

test("missing legal coverage → legal requires_review; overall cannot be on_track", () => {
  const s = computeMatterScore(assessMatter(missingLegalCoverage()));
  assert.equal(dimOf(s, "legal").state, "requires_review");
  assert.notEqual(s.summary.posture, "on_track");
  assert.ok(dimOf(s, "legal").reviewRoute);
  assert.equal(dimOf(s, "legal").reviewRoute!.primaryTarget, "specialist_review");
});

/* ---- failure / unavailable isolation ---- */

const throwingFinance: MatterEngine = {
  name: "matter-financial", version: "test",
  assess(): EngineAssessment { throw new Error("finance integration down"); },
};

test("failed engine → dimension unavailable, never healthy; posture degraded", () => {
  const engines = COMPONENT_ENGINES.map((e) => (e.name === "matter-financial" ? throwingFinance : e));
  const state = assessMatter(readyMatter(), { engines });
  const s = computeMatterScore(state);
  const fin = dimOf(s, "finance");
  assert.equal(fin.state, "unavailable");
  assert.notEqual(fin.state, "healthy");
  assert.equal(fin.numericScore, null);         // unavailable is NOT scored as 0
  assert.equal(s.summary.posture, "degraded");
  assert.ok(s.summary.unavailableDimensions.includes("finance"));
});

test("unavailable integration is not penalized as poor performance (no zero score)", () => {
  const engines = COMPONENT_ENGINES.map((e) => (e.name === "matter-financial" ? throwingFinance : e));
  const s = computeMatterScore(assessMatter(readyMatter(), { engines }));
  assert.notEqual(dimOf(s, "finance").numericScore, 0);
  assert.equal(dimOf(s, "finance").numericScore, null);
});

test("stale data may not read as strong", () => {
  const state = assessMatter(readyMatter());
  const s = computeMatterScore(state, { staleDimensions: ["deadlines"] });
  const dl = dimOf(s, "deadlines");
  assert.equal(dl.state, "stale");
  assert.ok(dl.freshness.stale);
  assert.notEqual(s.summary.posture, "on_track"); // stale required dimension breaks on_track
});

test("disputed fact remains disputed — not promoted to confirmed", () => {
  const s = computeMatterScore(assessMatter(conflictingFacts()));
  // the dispute surfaces through legal (facts not confirmed → requires_review) and risk
  assert.equal(dimOf(s, "legal").state, "requires_review");
  assert.notEqual(dimOf(s, "risk").state, "strong");
  // and the matter is never a confirmed-fact-driven on_track
  assert.ok(["needs_attention", "at_risk", "requires_review", "blocked", "insufficient_data"].includes(s.summary.posture));
});

test("trend compares two scores deterministically", () => {
  const worse = computeMatterScore(assessMatter(earlyBlockedMatter()));
  const better = computeMatterScore(assessMatter(readyMatter()));
  const t = computeTrend(worse, better);
  assert.equal(t.direction, "improving");
  assert.ok(t.changedDimensions.length > 0);
  // reverse is deteriorating
  assert.equal(computeTrend(better, worse).direction, "deteriorating");
  // identical is stable
  assert.equal(computeTrend(better, better).direction, "stable");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { assessMatter } from "../intelligence.ts";
import { blockingConditions, stateSnapshot } from "../state-machine.ts";
import { COMPONENT_ENGINES, MATTER_ENGINE_COUNT } from "../engines/index.ts";
import { deadlineEngine } from "../engines/deadline.ts";
import { readinessEngine } from "../engines/readiness.ts";
import { riskEngine } from "../engines/risk.ts";
import { outcomeEngine } from "../engines/outcome.ts";
import { legalEngine } from "../engines/legal.ts";
import { healthEngine } from "../engines/health.ts";
import { earlyBlockedMatter, readyMatter, aiProhibitedMatter } from "./fixtures.ts";

test("there are exactly 17 matter engines (16 components + health rollup)", () => {
  assert.equal(COMPONENT_ENGINES.length, 16);
  assert.equal(MATTER_ENGINE_COUNT, 17);
});

test("every engine returns a fully-structured assessment (never free text only)", () => {
  const m = earlyBlockedMatter();
  const state = assessMatter(m);
  assert.equal(state.engines.length, 17);
  for (const a of state.engines) {
    assert.ok(typeof a.engine === "string" && a.engine.length > 0);
    assert.ok(typeof a.engineVersion === "string");
    assert.ok(["healthy", "attention", "at_risk", "blocked", "unknown"].includes(a.status));
    assert.ok(Array.isArray(a.findings));
    assert.ok(Array.isArray(a.actions));
    assert.ok(a.data && typeof a.data === "object");
    assert.ok(typeof a.confidence === "number");
    assert.ok(typeof a.requiresHumanReview === "boolean");
  }
});

test("assessMatter is deterministic given the same asOf", () => {
  const a = assessMatter(earlyBlockedMatter());
  const b = assessMatter(earlyBlockedMatter());
  assert.deepEqual(a, b);
});

test("early matter: strict overdue deadline drives deadline engine to blocked/score 0", () => {
  const m = earlyBlockedMatter();
  const d = deadlineEngine.assess(m);
  assert.equal(d.score, 0);
  assert.ok(d.findings.some((f) => f.code.startsWith("deadline:overdue") && f.severity === "critical"));
});

test("early matter: readiness is blocked and does not allow advancing", () => {
  const m = earlyBlockedMatter();
  const r = readinessEngine.assess(m);
  assert.notEqual(r.status, "healthy");
  const snap = stateSnapshot(m);
  assert.equal(snap.canAdvance, false);
  // required facts employer_knowledge & permit_status are missing → blocking
  const blocking = blockingConditions(m);
  assert.ok(blocking.some((b) => b.kind === "missing_fact"));
  assert.ok(blocking.some((b) => b.kind === "missing_evidence"));
});

test("early matter: missing-information surfaces missing required facts under what_is_missing", () => {
  const state = assessMatter(earlyBlockedMatter());
  assert.ok(state.questions.whatIsMissing.length > 0);
  // permit_status is a required fact with no record at all
  assert.ok(state.questions.whatIsMissing.some((s) => s.includes("permit_status")));
});

test("early matter: seven questions are all populated as structured output", () => {
  const s = assessMatter(earlyBlockedMatter());
  assert.ok(s.questions.whatIsHappening.length > 0);
  assert.ok(s.questions.whatIsMissing.length > 0);
  assert.ok(s.questions.whatNext.length > 0);
  assert.ok(s.questions.who.length > 0);
  assert.ok(s.questions.when.length > 0);
  assert.ok(s.questions.why.length > 0);
  assert.ok(s.questions.blocking.length > 0);
  // what_next is ranked: the top action is critical/high priority given overdue strict deadline
  assert.ok(["critical", "high"].includes(s.questions.whatNext[0].priority));
});

test("early matter: overall status is blocked (worst-of engines)", () => {
  const s = assessMatter(earlyBlockedMatter());
  assert.equal(s.overallStatus, "blocked");
});

test("ready matter: no blocking, readiness healthy, can advance", () => {
  const m = readyMatter();
  const blocking = blockingConditions(m);
  assert.equal(blocking.length, 0);
  const r = readinessEngine.assess(m);
  assert.equal(r.status, "healthy");
  assert.equal(stateSnapshot(m).canAdvance, true);
  const s = assessMatter(m);
  assert.ok(s.questions.whatNext.some((a) => a.id === "na-advance"));
});

test("ai-prohibited matter: policy block appears and health is blocked", () => {
  const m = aiProhibitedMatter();
  const blocking = blockingConditions(m);
  assert.ok(blocking.some((b) => b.kind === "policy"));
  const s = assessMatter(m);
  assert.equal(s.overallStatus, "blocked");
  assert.ok(s.questions.blocking.some((b) => b.code === "policy:ai_prohibited"));
});

test("legal engine bridges to triad: pregnancy topic can recommend with disclosed case-law gap", () => {
  // ready matter has all required facts confirmed → factsConfirmed true
  const l = legalEngine.assess(readyMatter());
  assert.equal(l.data.triadState, "insufficient_case_law");
  assert.equal(l.data.canRecommend, true);
  // case law is present-but-unverified → transparency finding
  assert.ok(l.findings.some((f) => f.code === "legal-caselaw-unverified"));
});

test("legal engine fails closed when required facts are unconfirmed", () => {
  // early matter: required facts missing → factsConfirmed false → insufficient_facts
  const l = legalEngine.assess(earlyBlockedMatter());
  assert.equal(l.data.canRecommend, false);
  assert.notEqual(l.status, "healthy");
});

test("outcome engine is rule-based only, never a probability, always human-reviewed", () => {
  const o = outcomeEngine.assess(readyMatter());
  assert.equal(o.data.method, "rule_based_only");
  assert.equal(o.requiresHumanReview, true);
  assert.ok(o.findings.some((f) => f.code === "outcome-disclaimer"));
  // weak position for the early/blocked matter
  const o2 = outcomeEngine.assess(earlyBlockedMatter());
  assert.ok(["position_weak", "position_uncertain"].includes(o2.data.band as string));
});

test("risk engine builds a multi-dimension register and inverts to a score", () => {
  const r = riskEngine.assess(earlyBlockedMatter());
  const byDim = r.data.byDimension as Record<string, number>;
  assert.ok(byDim.procedural >= 1);
  assert.ok(byDim.evidentiary >= 1);
  assert.ok(byDim.factual >= 1);
  assert.ok((r.score ?? 1) < 0.6);
});

test("health rollup reports the worst component status", () => {
  const m = earlyBlockedMatter();
  const components = COMPONENT_ENGINES.map((e) => e.assess(m));
  const h = healthEngine.assess(m, { assessments: components });
  assert.equal(h.data.mode, "rollup");
  assert.equal(h.status, "blocked");
});

test("no engine emits a bare number that claims to be a win-probability", () => {
  // guardrail: outcome data must annotate its index as an ordering aid
  const o = assessMatter(readyMatter()).engines.find((e) => e.engine === "matter-outcome")!;
  assert.match(String(o.data.positionIndexNote), /not a probability/);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateTriad } from "../coverage.ts";

const ALL_LEG = ["E3B-LEG-001", "E3B-LEG-002", "E3B-LEG-003", "E3B-LEG-007", "E3B-LEG-008", "E3B-LEG-009", "E3B-LEG-010", "E3B-ORD-001"];

test("Scenario 1 — pregnancy dismissal: law + procedure present, case law unverified → insufficient_case_law", () => {
  const c = evaluateTriad({ topic: "pregnancy_dismissal", availableLegislationRefIds: ALL_LEG, factsConfirmed: true });
  assert.ok(c.legislation.usable, "women's employment + equal-opp present");
  assert.ok(c.procedure.usable, "pregnancy procedure present");
  assert.equal(c.caseLaw.usable, false, "case law is unverified candidates");
  assert.equal(c.state, "insufficient_case_law");
  // justified partial: law + procedure present, missing pillar (case law) disclosed
  assert.equal(c.canProduceMatterRecommendation, true);
  assert.ok(c.nextResearchActionsHe.some((a) => a.includes("פסיקה")));
});

test("missing facts always blocks (insufficient_facts), even with full corpus", () => {
  const c = evaluateTriad({ topic: "pregnancy_dismissal", availableLegislationRefIds: ALL_LEG, factsConfirmed: false });
  assert.equal(c.state, "insufficient_facts");
  assert.equal(c.canProduceMatterRecommendation, false);
});

test("missing governing legislation blocks a statutory claim", () => {
  const c = evaluateTriad({ topic: "severance", availableLegislationRefIds: [], factsConfirmed: true });
  assert.equal(c.legislation.usable, false);
  assert.equal(c.state, "insufficient_legislation");
  assert.equal(c.canProduceMatterRecommendation, false);
});

test("Scenario 3 — overtime: needs both hours + wage-protection statutes", () => {
  const partial = evaluateTriad({ topic: "overtime", availableLegislationRefIds: ["E3B-LEG-003"], factsConfirmed: true });
  assert.equal(partial.legislation.usable, false, "missing wage protection");
  const full = evaluateTriad({ topic: "overtime", availableLegislationRefIds: ["E3B-LEG-003", "E3B-LEG-010"], factsConfirmed: true });
  assert.ok(full.legislation.usable);
  assert.equal(full.state, "insufficient_case_law"); // law+procedure present, case law unverified
});

test("Scenario 4 — employee vs contractor: case-law-driven topic (no single statute)", () => {
  const c = evaluateTriad({ topic: "employee_vs_contractor", availableLegislationRefIds: ALL_LEG, factsConfirmed: true, procedureType: "regional_labor_court_civil" });
  // no governing statute required; case law present but unverified → specialist review
  assert.ok(c.legislation.present);
  assert.equal(c.caseLaw.usable, false);
  assert.equal(c.state, "requires_specialist_review");
  assert.equal(c.canProduceMatterRecommendation, false);
});

test("single-pillar coverage never yields a matter recommendation", () => {
  // procedure present but no legislation and case-law unusable
  const c = evaluateTriad({ topic: "hearing_duty", availableLegislationRefIds: [], factsConfirmed: true });
  assert.notEqual(c.state, "triad_complete");
  assert.equal(c.canProduceMatterRecommendation, false);
});

test("coverage reports what is found and what is missing per pillar", () => {
  const c = evaluateTriad({ topic: "pregnancy_dismissal", availableLegislationRefIds: ["E3B-LEG-007"], factsConfirmed: true });
  assert.equal(c.legislation.usable, false, "equal-opp missing");
  assert.ok(c.legislation.missingHe.some((m) => m.includes("E3B-LEG-008")));
  assert.ok(c.caseLaw.countFound > 0);
  assert.ok(c.procedure.usable);
});

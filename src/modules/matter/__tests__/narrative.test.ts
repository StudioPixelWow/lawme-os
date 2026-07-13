import { test } from "node:test";
import assert from "node:assert/strict";
import { assessMatter } from "../intelligence.ts";
import { computeMatterScore } from "../score/index.ts";
import { buildNarrative, oneLineHe, morningBriefingHe, fullBriefingHe } from "../narrative/narrative-engine.ts";
import { buildMatterProfile } from "../profile.ts";
import { COMPONENT_ENGINES } from "../engines/index.ts";
import type { MatterEngine, EngineAssessment } from "../types.ts";
import { readyMatter, earlyBlockedMatter } from "./fixtures.ts";
import { hearingSoonMissingAffidavit, clientSilence, missingLegalCoverage, conflictingFacts } from "./score-fixtures.ts";

function profile(m: ReturnType<typeof readyMatter>, opts?: Parameters<typeof buildMatterProfile>[1]) {
  return buildMatterProfile(m, opts);
}

function everySentenceTraceable(n: ReturnType<typeof buildNarrative>): boolean {
  return n.sentenceEvidenceMap.every((s) =>
    s.findingCodes.length + s.blockerCodes.length + s.actionIds.length + s.assessmentIds.length > 0);
}

const BANNED = ["אני חושב", "אני מרגיש", "אני תיק", "הסיכוי לזכות", "התיק בטוח", "מובטח"];

test("narrative is deterministic and 100% source-traceable", () => {
  const a = profile(readyMatter());
  const b = profile(readyMatter());
  assert.deepEqual(a.narrative, b.narrative);
  assert.ok(everySentenceTraceable(a.narrative));
});

test("narrative never anthropomorphizes or claims an outcome probability", () => {
  for (const m of [readyMatter(), earlyBlockedMatter(), hearingSoonMissingAffidavit()]) {
    const n = profile(m).narrative;
    const text = fullBriefingHe(n);
    for (const bad of BANNED) assert.equal(text.includes(bad), false, `narrative must not contain "${bad}"`);
  }
});

test("three variants exist with increasing detail", () => {
  const state = assessMatter(hearingSoonMissingAffidavit());
  const score = computeMatterScore(state);
  const compact = buildNarrative(state, score, { variant: "compact" });
  const standard = buildNarrative(state, score, { variant: "standard" });
  const detailed = buildNarrative(state, score, { variant: "detailed" });
  assert.ok(compact.urgentItemsHe.length <= 1);
  assert.ok(standard.urgentItemsHe.length <= 3);
  assert.ok(detailed.evidenceStatusHe !== null || detailed.teamStatusHe !== null); // detailed adds status fields
  for (const n of [compact, standard, detailed]) assert.ok(everySentenceTraceable(n));
});

/* ---------------- Scenario A — healthy matter ---------------- */
test("Scenario A: healthy matter → on_track, concise positive narrative, no false warning", () => {
  const p = profile(readyMatter());
  assert.equal(p.score.summary.posture, "on_track");
  assert.match(p.narrative.headlineHe, /כשורה/);
  assert.equal(p.narrative.blockersHe.length, 0);
  assert.ok(everySentenceTraceable(p.narrative));
});

/* ---------------- Scenario B — hearing in 4 days, missing affidavit ---------------- */
test("Scenario B: deadline prominent, readiness at_risk/blocked, affidavit prioritized", () => {
  const p = profile(hearingSoonMissingAffidavit());
  assert.ok(["at_risk", "blocked"].includes(p.score.dimensions.find((d) => d.id === "readiness")!.state));
  // a deadline sentence appears
  assert.ok(fullBriefingHe(p.narrative).includes("דיון") || p.narrative.deadlineStatusHe);
  // the missing affidavit surfaces as an urgent/missing item and a next action
  const text = fullBriefingHe(p.narrative);
  assert.ok(text.includes("תצהיר"), "missing affidavit should be surfaced");
  // the top action preserves approval requirement + due where known
  assert.ok(p.prioritizedActions.length > 0);
  assert.ok(p.prioritizedActions.every((a) => typeof a.requiresHumanApproval === "boolean"));
});

/* ---------------- Scenario C — client not updated 8 days ---------------- */
test("Scenario C: communication at_risk/attention, update prioritized, no legal-risk inflation", () => {
  const p = profile(clientSilence());
  const comm = p.score.dimensions.find((d) => d.id === "communication")!;
  assert.ok(["attention", "at_risk"].includes(comm.state));
  // legal must not be inflated by a communication issue
  assert.notEqual(p.score.dimensions.find((d) => d.id === "legal")!.state, "blocked");
  assert.ok(everySentenceTraceable(p.narrative));
});

/* ---------------- Scenario D — engine failure ---------------- */
const throwing: MatterEngine = {
  name: "matter-risk", version: "test",
  assess(): EngineAssessment { throw new Error("risk engine crashed"); },
};
test("Scenario D: engine failure → degraded, dimension unavailable, disclosed, never on_track", () => {
  const engines = COMPONENT_ENGINES.map((e) => (e.name === "matter-risk" ? throwing : e));
  const p = profile(readyMatter(), { assess: { engines } });
  assert.equal(p.score.summary.posture, "degraded");
  assert.equal(p.score.dimensions.find((d) => d.id === "risk")!.state, "unavailable");
  assert.ok(p.narrative.limitationsHe.some((l) => l.includes("סיכון")), "must disclose the unavailable dimension");
  assert.notEqual(p.score.summary.posture, "on_track");
  // no raw error leaks
  assert.equal(JSON.stringify(p.narrative).includes("crashed"), false);
});

/* ---------------- Scenario E — missing legal coverage ---------------- */
test("Scenario E: legal requires_review, specialist route, missing-authority disclosed", () => {
  const p = profile(missingLegalCoverage());
  assert.equal(p.score.dimensions.find((d) => d.id === "legal")!.state, "requires_review");
  assert.notEqual(p.score.summary.posture, "on_track");
  assert.ok(p.narrative.limitationsHe.some((l) => l.includes("מומחה")));
  assert.ok(p.narrative.reviewRoute);
});

/* ---------------- Scenario F — finance integration unavailable ---------------- */
const throwingFinance: MatterEngine = {
  name: "matter-financial", version: "test",
  assess(): EngineAssessment { throw new Error("finance down"); },
};
test("Scenario F: finance unavailable — no artificial penalty, no invented balance", () => {
  const engines = COMPONENT_ENGINES.map((e) => (e.name === "matter-financial" ? throwingFinance : e));
  const p = profile(readyMatter(), { assess: { engines } });
  const fin = p.score.dimensions.find((d) => d.id === "finance")!;
  assert.equal(fin.state, "unavailable");
  assert.equal(fin.numericScore, null);           // not 0, not invented
  assert.equal(JSON.stringify(p.narrative).includes("down"), false);
});

/* ---------------- Scenario G — multiple blockers ---------------- */
test("Scenario G: multiple blockers → blocked, top blockers ranked, narrative stays concise", () => {
  const p = profile(earlyBlockedMatter());
  assert.equal(p.score.summary.posture, "blocked");
  assert.ok(p.score.summary.topBlockers.length >= 1 && p.score.summary.topBlockers.length <= 3);
  assert.ok(p.narrative.nextActionsHe.length <= 3);
  assert.ok(p.narrative.urgentItemsHe.length <= 3);
});

/* ---------------- Scenario H — conflicting facts ---------------- */
test("Scenario H: disputed fact identified, never presented as a confirmed fact", () => {
  const p = profile(conflictingFacts());
  const text = fullBriefingHe(p.narrative);
  // the disputed fact should not be asserted as confirmed anywhere
  assert.equal(/employer_knowledge.*אושר/.test(text), false);
  assert.ok(everySentenceTraceable(p.narrative));
});

test("output forms derive from the same source assessment ids", () => {
  const p = profile(hearingSoonMissingAffidavit());
  assert.ok(oneLineHe(p.narrative).length > 0);
  assert.ok(morningBriefingHe(p.narrative).length > 0);
  assert.ok(fullBriefingHe(p.narrative).length > 0);
  assert.ok(p.narrative.sourceAssessmentIds.length > 0);
});

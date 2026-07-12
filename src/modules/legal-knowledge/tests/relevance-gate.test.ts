/**
 * Deterministic tests for the RELEVANCE GATE (fail-closed).
 * No network, no database, no keys — in-memory repositories only.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runRelevanceGate, detectDomain, absoluteLexicalCoverage, contentTokens,
  GATE_THRESHOLDS, NO_ANSWER_MESSAGE_HE, ACTIVE_DOMAIN,
} from "../research/relevance-gate.ts";
import type { GateCandidate } from "../research/relevance-gate.ts";
import { createRepositories } from "../repositories/index.ts";
import { seedThroughRepositories } from "../seed/seed-fixtures.ts";
import { runDbResearch } from "../research/engine-db.ts";

function candidate(over: Partial<GateCandidate>): GateCandidate {
  return {
    documentId: "d1",
    passage: "",
    authorityClass: "national_labor",
    verificationStatus: "unverified",
    rawLexicalRank: 1,
    rawSemantic: 0.3,
    anchorValid: true,
    ...over,
  };
}

/* ---------- absolute coverage ---------- */

test("absolute coverage: weak stays weak even when it is the only result", () => {
  const q = contentTokens("מה הדין בירושת דירה בין אחים");
  const laborPassage = "בית הדין קבע כי הפיטורים נעשו בניגוד לסעיף 9 לחוק עבודת נשים";
  const cov = absoluteLexicalCoverage(q, laborPassage);
  assert.ok(cov < GATE_THRESHOLDS.ABSOLUTE_LEXICAL_MIN, `coverage ${cov} must stay below the gate`);
});

test("absolute coverage: morphology variants match (התפטרה ↔ התפטרות)", () => {
  const q = contentTokens("עובדת התפטרה עקב הרעת תנאים");
  const cov = absoluteLexicalCoverage(q, "התפטרות מחמת הרעה מוחשית בתנאי העבודה דינה כפיטורים לעניין עובדת");
  assert.ok(cov >= 0.5, `expected morphological matches, got ${cov}`);
});

test("normalization cannot inflate an irrelevant result (raw vs normalized are independent)", async () => {
  // a single candidate is trivially the best in its set (normalized=1.0),
  // but its ABSOLUTE coverage of the query is ~0 → gate must fail.
  const gate = await runRelevanceGate({
    normalizedQuery: "מה הדין בירושת דירה בין אחים?",
    candidates: [candidate({ passage: "גמול שעות נוספות ונטל ההוכחה בתביעות שכר" })],
    normalizedLexicalTop: 1.0,
  });
  assert.equal(gate.status, "fail");
  assert.equal(gate.answerState, "no_answer");
  assert.ok(gate.signals.normalizedLexicalTop === 1.0);
  assert.ok(gate.signals.rawLexicalTop < GATE_THRESHOLDS.ABSOLUTE_LEXICAL_MIN);
});

/* ---------- domain gate ---------- */

test("domain gate: in-domain examples pass, out-of-domain examples are rejected", async () => {
  const inDomain = ["פיטורים בהיריון", "פיצויי פיטורים", "הודעה מוקדמת לעובד", "גמול שעות נוספות", "חובת שימוע לפני פיטורים", "פנסיה חובה לעובד"];
  for (const q of inDomain) {
    const d = await detectDomain(q, 0.5);
    assert.equal(d.detectedDomain, ACTIVE_DOMAIN, `"${q}" detected as ${d.detectedDomain}`);
  }
  const outDomain = ["ירושת דירה", "מעצר עד תום ההליכים", "רישום פטנט", "מס רכישה לדירה", "הליך גירושין ומזונות", "צוואה הדדית"];
  for (const q of outDomain) {
    const d = await detectDomain(q, 0.05);
    assert.notEqual(d.detectedDomain, ACTIVE_DOMAIN, `"${q}" must not be employment`);
  }
});

test("domain gate: decomposed signals are recorded, never one opaque number", async () => {
  const d = await detectDomain("פיצויי פיטורים לעובדת בהיריון", 0.4);
  assert.ok(d.signals.vocabularyScore);
  assert.ok(typeof d.signals.retrievalAgreement === "number");
  assert.ok(d.signals.semanticScores[ACTIVE_DOMAIN] !== undefined);
  assert.ok(d.limitations.length > 10, "deterministic-gate limitations must be stated");
});

/* ---------- evidence rules ---------- */

test("minimum evidence: a secondary source alone is not enough", async () => {
  const passage = "עובד זכאי לפיצויי פיטורים לאחר שנת עבודה רצופה אצל אותו מעסיק";
  const gate = await runRelevanceGate({
    normalizedQuery: "מתי עובד זכאי לפיצויי פיטורים?",
    candidates: [candidate({ passage, authorityClass: "secondary" })],
    normalizedLexicalTop: 1.0,
  });
  assert.equal(gate.status, "fail");
  assert.ok(gate.failureReasons.some((r) => r.code === "insufficient_evidence"));
});

test("minimum evidence: the same passage from a primary source passes", async () => {
  const passage = "עובד זכאי לפיצויי פיטורים לאחר שנת עבודה רצופה אצל אותו מעסיק";
  const gate = await runRelevanceGate({
    normalizedQuery: "מתי עובד זכאי לפיצויי פיטורים?",
    candidates: [candidate({ passage, authorityClass: "legislation" })],
    normalizedLexicalTop: 1.0,
  });
  assert.equal(gate.status, "pass");
});

test("invalid anchors fail the gate", async () => {
  const passage = "עובד זכאי לפיצויי פיטורים לאחר שנת עבודה רצופה אצל אותו מעסיק";
  const gate = await runRelevanceGate({
    normalizedQuery: "מתי עובד זכאי לפיצויי פיטורים?",
    candidates: [candidate({ passage, authorityClass: "legislation", anchorValid: false })],
    normalizedLexicalTop: 1.0,
  });
  assert.equal(gate.status, "fail");
  assert.ok(gate.failureReasons.some((r) => r.code === "invalid_anchors"));
});

test("vague query fails on low query confidence", async () => {
  const gate = await runRelevanceGate({ normalizedQuery: "זכויות?", candidates: [], normalizedLexicalTop: 0 });
  assert.equal(gate.status, "fail");
  assert.ok(gate.failureReasons.some((r) => r.code === "low_query_confidence"));
});

/* ---------- end-to-end through the engine ---------- */

test("engine e2e: pregnancy-dismissal query still answers with correct evidence", async () => {
  const repos = createRepositories();
  await seedThroughRepositories(repos);
  const r = await runDbResearch(repos, { question: "עובדת פוטרה בהיריון ללא שימוע — מה זכויותיה?", legalDomain: "labor" });
  assert.equal(r.answerState, "answered");
  assert.equal(r.gate.status, "pass");
  assert.ok(r.evidence.length > 0);
  assert.ok(r.evidence[0].title.includes("פיטורים בהיריון"), `top: ${r.evidence[0].title}`);
  // raw + normalized both preserved on every item
  for (const e of r.evidence) {
    assert.ok(typeof e.scoreBreakdown.raw.lexicalCoverage === "number");
    assert.ok(typeof e.scoreBreakdown.raw.lexicalRank === "number");
    assert.ok(typeof e.scoreBreakdown.raw.vectorCosine === "number");
    assert.ok(typeof e.scoreBreakdown.lexical === "number");
  }
  // honesty warnings intact
  assert.ok(r.warnings.some((w) => w.includes("סינתטי")));
  assert.ok(r.warnings.some((w) => w.includes("MockEmbeddingProvider")));
});

test("engine e2e: inheritance query returns the structured no-answer state", async () => {
  const repos = createRepositories();
  await seedThroughRepositories(repos);
  const r = await runDbResearch(repos, { question: "מה הדין בירושת דירה בין אחים?", legalDomain: "labor" });
  assert.equal(r.answerState, "no_answer");
  assert.equal(r.gate.status, "fail");
  assert.equal(r.evidence.length, 0, "weak passages must NOT be presented as answers");
  assert.equal(r.missingSourceNotice, NO_ANSWER_MESSAGE_HE);
  assert.notEqual(r.gate.domain.detectedDomain, ACTIVE_DOMAIN);
  assert.ok(r.gate.suggestedActionsHe.length > 0);
  // weak evidence, if shown, is explicitly marked
  for (const w of r.weakEvidence) {
    assert.ok(w.warnings.some((x) => x.includes("מתחת לסף הרלוונטיות")));
  }
});

test("engine e2e: corpus coverage is always reported", async () => {
  const repos = createRepositories();
  await seedThroughRepositories(repos);
  const r = await runDbResearch(repos, { question: "חובת שימוע לפני פיטורים", legalDomain: "labor" });
  assert.equal(r.corpusCoverage.indexedDocuments, 13);
  assert.equal(r.corpusCoverage.latestVerifiedUpdate, null, "synthetic corpus — nothing is verified");
  assert.ok(r.corpusCoverage.missingCategoriesHe.length > 0);
});

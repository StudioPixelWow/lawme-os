/**
 * Legal Reasoning Engine — pure, deterministic tests (Slice 4.0.0). No AI.
 * Uses a real MatterIntelligence + ConversationContext + LegalResearchResult.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLegalOpinion, LEGAL_REASONING_VERSION } from "../engine.ts";
import { buildConversationContext } from "../../dino/conversation/engine.ts";
import { runLegalResearch } from "../../legal-research/orchestrator.ts";
import { buildMatterIntelligence } from "../../matter/intelligence/derive.ts";
import { workspaceFixtureInput } from "../../matter/workspace/fixtures.ts";
import type { MatterIntelligence } from "../../matter/intelligence/types.ts";

const NOW = "2026-07-25T09:00:00+03:00";
const MI = buildMatterIntelligence(workspaceFixtureInput());
const Q_PREG = "האם פיטורי העובדת בהיריון היו כדין לפי חוק עבודת נשים?";
const Q_OOS = "שאלה על ירושה וצוואה";

async function opinionFor(question: string, mi: MatterIntelligence | null = MI) {
  const cc = buildConversationContext({ intelligence: mi, message: question, nowISO: NOW });
  const lr = await runLegalResearch({
    question,
    legalDomainHint: mi?.identity.legalDomain ?? null,
    procedureType: mi?.identity.procedureType ?? null,
    asOfISO: NOW,
    factsConfirmed: (mi?.counts.establishedFacts ?? 0) > 0,
  });
  return buildLegalOpinion({ matterIntelligence: mi, conversationContext: cc, legalResearch: lr, nowISO: NOW });
}

test("issue framing binds to the governing procedure", async () => {
  const o = await opinionFor(Q_PREG);
  assert.equal(o.meta.version, LEGAL_REASONING_VERSION);
  assert.equal(o.issue.domainInScope, true);
  assert.equal(o.issue.procedureType, "pregnancy_dismissal");
  assert.equal(o.issue.procedureTitleHe, "פיטורי עובדת בהיריון");
});

test("element-by-element (IRAC) analysis partitions the cause of action", async () => {
  const o = await opinionFor(Q_PREG);
  const byKey = new Map(o.elements.map((e) => [e.key, e]));
  assert.equal(byKey.get("employment_duration")?.status, "satisfied"); // document_derived
  assert.equal(byKey.get("pregnancy_status")?.status, "satisfied");    // confirmed
  assert.equal(byKey.get("employer_knowledge")?.status, "contested");  // client_alleged
  assert.equal(byKey.get("permit_status")?.status, "contested");       // disputed
  assert.equal(byKey.get("employment_relationship")?.status, "missing");
  assert.ok(o.missingFacts.some((m) => m.key === "dismissal_date"));
  assert.equal(o.establishedFacts.length, 2);
  assert.equal(o.allegedFacts.length, 1);   // employer_knowledge (dismissal_reason isn't an element)
});

test("authorities: binding legislation, persuasive/discovery case law, hierarchy", async () => {
  const o = await opinionFor(Q_PREG);
  assert.ok(o.applicableLegislation.some((a) => a.recordId === "E3B-LEG-007"));
  assert.ok(o.bindingAuthorities.some((a) => a.kind === "legislation"));
  assert.ok(o.authorityHierarchyHe.includes("החקיקה המחייבת גוברת"));
  assert.equal(o.jurisprudence.state, "undetermined"); // case law unverified
});

test("adversarial self-challenge is performed across categories", async () => {
  const o = await opinionFor(Q_PREG);
  const cats = new Set(o.challenges.map((c) => c.category));
  assert.ok(cats.has("statutory_exception"));
  assert.ok(cats.has("procedural_obstacle"));
  assert.ok(cats.has("jurisdictional_limitation"));
  assert.ok(cats.has("contrary_authority"));
  assert.ok(cats.has("factual_weakness"));
  // a contested/missing element becomes an accepted factual-weakness challenge
  assert.ok(o.challenges.some((c) => c.category === "factual_weakness" && c.disposition === "accepted"));
});

test("provisional conclusion: cannot conclude on missing essential elements", async () => {
  const o = await opinionFor(Q_PREG);
  assert.equal(o.preliminaryConclusion.direction, "cannot_conclude");
  assert.equal(o.preliminaryConclusion.isProvisional, true);
  assert.equal(o.answerability.canAnswerNow, false);
  assert.equal(o.confidence.level, "low");
  assert.ok(o.confidence.scaleHe.length > 0);              // confidence is anchored to a scale
});

test("traceability: unsupported statements are surfaced, not hidden", async () => {
  const o = await opinionFor(Q_PREG);
  assert.ok(o.unsupportedStatements.some((u) => u.statementHe.includes("פסיקה")));
  // every element mapping records whether it is supported by authority
  assert.ok(o.supportingAuthorities.length >= o.elements.length);
});

test("risks: legal (from the cause of action) and practical (from the matter)", async () => {
  const o = await opinionFor(Q_PREG);
  assert.ok(o.legalRisks.length > 0);
  assert.ok(o.practicalRisks.some((r) => r.code === "UNSCHEDULED_STRICT_DEADLINE" || r.code === "MISSING_MANDATORY_EVIDENCE" || r.code === "OVERDUE_DEADLINE"));
});

test("assumptions are stated explicitly (uncertainty is never hidden)", async () => {
  const o = await opinionFor(Q_PREG);
  assert.ok(o.assumptions.some((a) => a.code === "EMPLOYMENT_RELATIONSHIP")); // not established
  assert.ok(o.assumptions.some((a) => a.code === "JURISDICTION"));
});

test("out-of-scope question cannot conclude and has no confidence", async () => {
  const o = await opinionFor(Q_OOS);
  assert.equal(o.issue.domainInScope, false);
  assert.equal(o.preliminaryConclusion.direction, "cannot_conclude");
  assert.equal(o.confidence.level, "none");
});

test("the opinion is deeply immutable and deterministic", async () => {
  const a = await opinionFor(Q_PREG);
  assert.ok(Object.isFrozen(a));
  assert.ok(Object.isFrozen(a.elements));
  assert.throws(() => {
    (a as { question?: string }).question = "x";
  });
  const b = await opinionFor(Q_PREG);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

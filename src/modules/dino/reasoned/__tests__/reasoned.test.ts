/**
 * Reasoned Dino — pipeline, provider-validation, citation & failure-mode tests
 * (Slice 4.1.0). Deterministic; a fake provider (no network/key). The LegalOpinion
 * is the exclusive reasoning authority; the provider only phrases it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runReasonedDinoTurn } from "../pipeline.ts";
import { deterministicReasonedProvider, createAnthropicReasonedProvider, buildReasonedRequest } from "../providers.ts";
import { validateProviderProse } from "../validate.ts";
import { splitCitations, buildClaims, verifiedIdSet } from "../citations.ts";
import type { ReasonedProvider, ReasonedAnswerInput } from "../types.ts";
import type { ReasonedDeps } from "../pipeline.ts";
import { buildConversationContext } from "../../conversation/engine.ts";
import { runLegalResearch } from "../../../legal-research/orchestrator.ts";
import { buildLegalOpinion } from "../../../legal-reasoning/engine.ts";
import { buildMatterIntelligence } from "../../../matter/intelligence/derive.ts";
import { workspaceFixtureInput } from "../../../matter/workspace/fixtures.ts";
import type { MatterIntelligence } from "../../../matter/intelligence/types.ts";

const NOW = "2026-07-25T09:00:00+03:00";
const MI = buildMatterIntelligence(workspaceFixtureInput());
const MI_NOFACTS = buildMatterIntelligence({ ...workspaceFixtureInput(), facts: [] });
const Q = "האם פיטורי העובדת בהיריון היו כדין לפי חוק עבודת נשים?";
const Q_OOS = "שאלה על ירושה וצוואה";

let captured: ReasonedAnswerInput | null = null;
const goodProvider: ReasonedProvider = {
  id: "anthropic", available: true,
  async generate(input) {
    captured = input;
    return {
      bottomLineHe: "מסקנה מנוסחת", applicationToMatterHe: "יישום", governingLawHe: "חוק", caseLawHe: "פסיקה", opposingArgumentHe: "נגד", risksHe: "סיכון",
      conclusionDirection: input.opinion.preliminaryConclusion.direction, confidenceLevel: input.opinion.confidence.level,
      usedCitationIds: input.opinion.applicableLegislation.map((a) => a.recordId), providerId: "anthropic",
    };
  },
};
const goodDeps: ReasonedDeps = { provider: goodProvider, fallbackProvider: deterministicReasonedProvider };

async function derive(question: string, mi: MatterIntelligence | null) {
  const cc = buildConversationContext({ intelligence: mi, message: question, nowISO: NOW });
  const research = await runLegalResearch({ question, legalDomainHint: mi?.identity.legalDomain ?? null, procedureType: mi?.identity.procedureType ?? null, asOfISO: NOW, factsConfirmed: (mi?.counts.establishedFacts ?? 0) > 0 });
  const opinion = buildLegalOpinion({ matterIntelligence: mi, conversationContext: cc, legalResearch: research, nowISO: NOW });
  return { cc, research, opinion };
}

test("provider receives ONLY the LegalOpinion — never raw research or matter source", async () => {
  await runReasonedDinoTurn({ question: Q, matterIntelligence: MI, contextKind: "matter", matterId: "m1", nowISO: NOW }, goodDeps);
  assert.ok(captured);
  assert.deepEqual(Object.keys(captured!).sort(), ["citationPresentationRules", "conversationStyle", "locale", "opinion", "userMessage"]);
  assert.ok(captured!.opinion.applicableLegislation.some((a) => a.recordId === "E3B-LEG-007"));
});

test("matter question: provisional, matter application with established/disputed/missing", async () => {
  const r = await runReasonedDinoTurn({ question: Q, matterIntelligence: MI, contextKind: "matter", matterId: "m1", nowISO: NOW }, goodDeps);
  assert.equal(r.status, "provisional");
  assert.equal(r.provider.renderMode, "model_phrased");
  assert.equal(r.applicationToMatter.hasMatter, true);
  assert.equal(r.applicationToMatter.established.length, 2);
  assert.ok(r.applicationToMatter.disputed.length + r.applicationToMatter.alleged.length >= 2);
  assert.ok(r.applicationToMatter.missing.length >= 1);
  assert.equal(r.bottomLine.statementHe, "מסקנה מנוסחת");
});

test("general question differs from matter — no fabricated factual application", async () => {
  const r = await runReasonedDinoTurn({ question: Q, matterIntelligence: null, contextKind: "general", matterId: null, nowISO: NOW }, goodDeps);
  assert.equal(r.applicationToMatter.hasMatter, false);
  assert.equal(r.applicationToMatter.established.length, 0);
});

test("provider output that changes the conclusion is rejected → deterministic fallback", async () => {
  const liar: ReasonedProvider = {
    id: "anthropic", available: true,
    async generate(input) {
      return { bottomLineHe: "טענת שקר", applicationToMatterHe: "", governingLawHe: "", caseLawHe: "", opposingArgumentHe: "", risksHe: "", conclusionDirection: "supports_position", confidenceLevel: input.opinion.confidence.level, usedCitationIds: [], providerId: "anthropic" };
    },
  };
  const r = await runReasonedDinoTurn({ question: Q, matterIntelligence: MI, contextKind: "matter", matterId: "m1", nowISO: NOW }, { provider: liar, fallbackProvider: deterministicReasonedProvider });
  assert.equal(r.provider.rejectedProviderOutput, true);
  assert.equal(r.provider.renderMode, "deterministic_structured");
});

test("validation drops hallucinated citation ids and preserves conclusion/confidence", async () => {
  const { opinion } = await derive(Q, MI);
  const allowed = new Set([...opinion.applicableLegislation, ...opinion.applicableCaseLaw].map((a) => a.recordId));
  const v = validateProviderProse({ bottomLineHe: "x", applicationToMatterHe: "", governingLawHe: "", caseLawHe: "", opposingArgumentHe: "", risksHe: "", conclusionDirection: opinion.preliminaryConclusion.direction, confidenceLevel: opinion.confidence.level, usedCitationIds: ["E3B-LEG-007", "HALLUCINATED"], providerId: "anthropic" }, opinion, allowed);
  assert.equal(v.ok, true);
  assert.deepEqual(v.sanitized.usedCitationIds, ["E3B-LEG-007"]);
});

test("deterministic fallback renders a structured opinion, not a source dump", async () => {
  const r = await runReasonedDinoTurn({ question: Q, matterIntelligence: MI, contextKind: "matter", matterId: "m1", nowISO: NOW }, { provider: createAnthropicReasonedProvider({ apiKey: "" }), fallbackProvider: deterministicReasonedProvider });
  assert.equal(r.provider.renderMode, "deterministic_structured");
  assert.ok(r.provider.labelHe.includes("ללא ניסוח מודל"));
  assert.ok(r.bottomLine.statementHe.length > 10);
  assert.ok(r.applicationToMatter.elementFindings.length >= 1);
});

test("adversarial: strongest opposing argument renders, accepted first", async () => {
  const r = await runReasonedDinoTurn({ question: Q, matterIntelligence: MI, contextKind: "matter", matterId: "m1", nowISO: NOW }, goodDeps);
  assert.ok(r.opposingArgument.length > 0);
  assert.equal(r.opposingArgument[0].disposition, "accepted");
  assert.ok(r.opposingArgument.some((a) => a.category === "factual_weakness"));
});

test("claim-level traceability: no established_law claim without verified support; missing → withheld", async () => {
  const { opinion, research } = await derive(Q, MI);
  const claims = buildClaims(opinion, verifiedIdSet([...research.matchedLegislation, ...research.matchedCases]));
  for (const c of claims) if (c.kind === "established_law") assert.ok(c.supportingCitationIds.length > 0);
  assert.ok(claims.some((c) => c.kind === "withheld"));
});

test("citations: verified vs discovery-only split; honest pinpoint statement", async () => {
  const { research } = await derive(Q, MI);
  const { verified, discoveryOnly } = splitCitations([...research.matchedLegislation, ...research.matchedCases]);
  assert.ok(verified.some((c) => c.recordId === "E3B-LEG-007"));
  assert.ok(discoveryOnly.length >= 1);                         // unverified case law
  assert.ok(verified.every((c) => c.pinpointHe !== null || c.pinpointStatusHe.includes("לא קיימת")));
});

test("confidence is explained; coverage is separate and never 'complete'", async () => {
  const r = await runReasonedDinoTurn({ question: Q, matterIntelligence: MI, contextKind: "matter", matterId: "m1", nowISO: NOW }, goodDeps);
  assert.ok(r.confidence.reasonsHe.length > 0);
  assert.ok(r.confidence.scaleHe.length > 0);
  assert.notEqual(r.coverage.level, "complete");
  assert.ok(r.coverage.uncoveredHe.includes("פסיקה מאומתת"));
});

test("failure modes: out_of_scope and needs_facts are distinct and honest", async () => {
  const oos = await runReasonedDinoTurn({ question: Q_OOS, matterIntelligence: null, contextKind: "general", matterId: null, nowISO: NOW }, goodDeps);
  assert.equal(oos.status, "out_of_scope");
  const needs = await runReasonedDinoTurn({ question: Q, matterIntelligence: MI_NOFACTS, contextKind: "matter", matterId: "m1", nowISO: NOW }, goodDeps);
  assert.equal(needs.status, "needs_facts");
});

test("the Anthropic request carries only the opinion (no raw research)", async () => {
  const { opinion } = await derive(Q, MI);
  const req = buildReasonedRequest({ opinion, locale: "he-IL", conversationStyle: "professional_brief", citationPresentationRules: { requirePinpointForConclusion: false, discoveryOnlyCannotSupport: true }, userMessage: Q }, "m", 500);
  assert.ok(req.system.includes("מנסח בלבד"));
  assert.ok(req.messages[0].content.includes("E3B-LEG-007"));
  assert.ok(!req.messages[0].content.includes("executedSearches")); // research internals not sent
});

test("the response is deeply immutable and deterministic", async () => {
  const a = await runReasonedDinoTurn({ question: Q, matterIntelligence: MI, contextKind: "matter", matterId: "m1", nowISO: NOW }, { provider: createAnthropicReasonedProvider({ apiKey: "" }), fallbackProvider: deterministicReasonedProvider });
  assert.ok(Object.isFrozen(a));
  assert.ok(Object.isFrozen(a.citations));
  const b = await runReasonedDinoTurn({ question: Q, matterIntelligence: MI, contextKind: "matter", matterId: "m1", nowISO: NOW }, { provider: createAnthropicReasonedProvider({ apiKey: "" }), fallbackProvider: deterministicReasonedProvider });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

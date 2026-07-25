/**
 * Dino Experience — pipeline + Anthropic adapter tests (Slice 3.2.0).
 * Deterministic: a fake provider and a fake Anthropic transport (no network,
 * no key). Grounding is decided by LawME's research, not the model.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runDinoTurn } from "../pipeline.ts";
import { deterministicProvider } from "../providers/deterministic.ts";
import { createAnthropicProvider, buildAnthropicRequest } from "../providers/anthropic.ts";
import type { DinoProvider, DinoDeps, ProviderInput } from "../types.ts";
import { buildConversationContext } from "../../conversation/engine.ts";
import { runLegalResearch } from "../../../legal-research/orchestrator.ts";
import { buildMatterIntelligence } from "../../../matter/intelligence/derive.ts";
import { workspaceFixtureInput } from "../../../matter/workspace/fixtures.ts";

const NOW = "2026-07-25T09:00:00+03:00";
const MI = buildMatterIntelligence(workspaceFixtureInput());

const Q_PREG = "האם נדרש היתר לפי סעיף 9 לחוק עבודת נשים לפיטורי עובדת בהריון?";
const Q_OOS = "שאלה על ירושה וצוואה במשפחה";
const Q_NEEDS = "נסח לי משהו בנוגע לפיטורי עובדת בהריון";
const Q_NOAUTH = "האם חובה לקיים שימוע לעובד לפני סיום העסקה?";

const fakeProvider: DinoProvider = {
  id: "anthropic",
  available: true,
  async generate(input: ProviderInput) {
    return {
      executiveSummaryHe: "תקציר בדיקה",
      legalAnalysisHe: "ניתוח בדיקה",
      usedRecordIds: input.legalResearchResult.matchedLegislation.map((s) => s.recordId),
      providerId: "anthropic",
    };
  },
};
const deps: DinoDeps = { provider: fakeProvider, fallbackProvider: deterministicProvider };

function turn(question: string, mi = MI) {
  return runDinoTurn({ question, matterIntelligence: mi, contextKind: mi ? "matter" : "general", matterId: mi ? "m1" : null, nowISO: NOW }, deps);
}

test("answered: in-scope grounded question uses the provider and attributes sources", async () => {
  const r = await turn(Q_PREG);
  assert.equal(r.mode, "answered");
  assert.equal(r.grounded, true);
  assert.equal(r.meta.proseProvider, "anthropic");
  assert.ok(r.legislation.some((l) => l.recordId === "E3B-LEG-007"));
  assert.equal(r.confidence.level, "moderate");
  assert.ok(r.sources.length > 0);
  assert.equal(r.executiveSummaryHe, "תקציר בדיקה");
});

test("out_of_scope: a non-employment question never calls a provider", async () => {
  const r = await turn(Q_OOS);
  assert.equal(r.mode, "out_of_scope");
  assert.equal(r.grounded, false);
  assert.equal(r.meta.proseProvider, "none");
  assert.equal(r.legislation.length, 0);
  assert.ok(r.noticeHe && r.noticeHe.includes("מחוץ לתחום"));
});

test("needs_facts: an ambiguous draft request asks for facts, no provider call", async () => {
  const r = await turn(Q_NEEDS);
  assert.equal(r.mode, "needs_facts");
  assert.equal(r.meta.proseProvider, "none");
  assert.ok(r.followUpQuestions.some((q) => q.code === "DRAFT_TARGET"));
});

test("no_verified_authority: discovery-only sources are shown but not presented as law", async () => {
  // general mode: no matter procedure injecting extra (verified) legislation.
  const r = await runDinoTurn({ question: Q_NOAUTH, matterIntelligence: null, contextKind: "general", matterId: null, nowISO: NOW }, deps);
  assert.equal(r.mode, "no_verified_authority");
  assert.equal(r.grounded, false);
  assert.equal(r.meta.proseProvider, "none");
  assert.ok(r.caseLaw.length >= 1);
  assert.ok(r.caseLaw.every((c) => !c.usableForClaim));
  assert.ok(r.noticeHe && r.noticeHe.includes("אין אסמכתה מאומתת"));
});

test("general mode works with no matter", async () => {
  const r = await runDinoTurn({ question: Q_PREG, matterIntelligence: null, contextKind: "general", matterId: null, nowISO: NOW }, deps);
  assert.equal(r.contextKind, "general");
  assert.equal(r.mode, "answered");
  assert.equal(r.grounded, true);
});

test("the deterministic fallback is used when the provider is unavailable", async () => {
  const offlineDeps: DinoDeps = { provider: createAnthropicProvider({ apiKey: "" }), fallbackProvider: deterministicProvider };
  const r = await runDinoTurn({ question: Q_PREG, matterIntelligence: MI, contextKind: "matter", matterId: "m1", nowISO: NOW }, offlineDeps);
  assert.equal(r.mode, "answered");
  assert.equal(r.meta.proseProvider, "deterministic");
  assert.ok(r.executiveSummaryHe.length > 0);
});

test("Anthropic adapter: builds a source-only request and validates cited ids", async () => {
  const cc = buildConversationContext({ intelligence: MI, message: Q_PREG, nowISO: NOW });
  const lr = await runLegalResearch({ question: Q_PREG, asOfISO: NOW });
  const providerInput: ProviderInput = { conversationContext: cc, matterIntelligence: MI, legalResearchResult: lr };

  // request shape (pure) — only the verified sources, strict grounding system.
  const req = buildAnthropicRequest(providerInput, "test-model", 512);
  assert.ok(req.system.includes("אתה דינו"));
  assert.ok(req.system.includes("אין לגשת למקורות חיצוניים"));
  assert.ok(req.messages[0].content.includes("E3B-LEG-007"));

  let capturedKey = "";
  const provider = createAnthropicProvider({
    apiKey: "sk-test", model: "test-model",
    transport: async ({ headers }) => {
      capturedKey = headers["x-api-key"];
      const text = JSON.stringify({ executiveSummaryHe: "ת", legalAnalysisHe: "נ", usedRecordIds: ["E3B-LEG-007", "HALLUCINATED-999"] });
      return { status: 200, json: { content: [{ type: "text", text }] } };
    },
  });
  assert.equal(provider.available, true);
  const prose = await provider.generate(providerInput);
  assert.equal(prose.providerId, "anthropic");
  assert.deepEqual(prose.usedRecordIds, ["E3B-LEG-007"]); // hallucinated id filtered out
  assert.equal(capturedKey, "sk-test");
});

test("Anthropic adapter is unavailable without a key", () => {
  assert.equal(createAnthropicProvider({ apiKey: "" }).available, false);
});

test("the response is deeply immutable and deterministic", async () => {
  const a = await turn(Q_PREG);
  assert.ok(Object.isFrozen(a));
  assert.ok(Object.isFrozen(a.legislation));
  const b = await turn(Q_PREG);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

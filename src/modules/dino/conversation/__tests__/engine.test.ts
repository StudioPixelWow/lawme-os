/**
 * Dino Conversation Engine — pure, deterministic tests (Slice 3.0.0).
 * Uses a real MatterIntelligence built from the Slice 2.0.0 fixtures. No AI.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConversationContext, DINO_CONVERSATION_VERSION } from "../engine.ts";
import { classifyIntent } from "../intents.ts";
import { buildMatterIntelligence } from "../../../matter/intelligence/derive.ts";
import { workspaceFixtureInput, workspaceEmptyFixtureInput } from "../../../matter/workspace/fixtures.ts";
import type { ConversationTurn } from "../types.ts";

const MI = buildMatterIntelligence(workspaceFixtureInput());
const EMPTY = buildMatterIntelligence(workspaceEmptyFixtureInput());

function ctx(message: string, history?: ConversationTurn[]) {
  return buildConversationContext({ intelligence: MI, message, history });
}

test("intent classification maps Hebrew messages to the supported intents", () => {
  assert.equal(classifyIntent("סכם לי את התיק").intent, "summarize_matter");
  assert.equal(classifyIntent("הצג את ציר הזמן").intent, "explain_timeline");
  assert.equal(classifyIntent("מה חסר בתיק?").intent, "show_missing_information");
  assert.equal(classifyIntent("מי הצדדים המעורבים?").intent, "explain_participants");
  assert.equal(classifyIntent("הצג את העובדות").intent, "explain_facts");
  assert.equal(classifyIntent("אילו ראיות קיימות?").intent, "explain_evidence");
  assert.equal(classifyIntent("מתי המועד הבא?").intent, "explain_deadlines");
  assert.equal(classifyIntent("תכין אותי לדיון").intent, "prepare_for_hearing");
  assert.equal(classifyIntent("נסח מכתב דרישה").intent, "draft_request");
  assert.equal(classifyIntent("מה שלומך היום?").intent, "general_question");
  assert.equal(classifyIntent("").intent, "unknown");
});

test("classification is confident on a clear single-intent message", () => {
  const c = classifyIntent("סכם את מצב התיק");
  assert.equal(c.intent, "summarize_matter");
  assert.ok(c.confidence >= 0.7);
});

test("summarize on a populated matter is ready and scoped", () => {
  const c = ctx("סכם לי את התיק");
  assert.equal(c.meta.version, DINO_CONVERSATION_VERSION);
  assert.equal(c.intent, "summarize_matter");
  assert.equal(c.scope, "whole_matter");
  assert.equal(c.answerability.level, "ready");
  assert.ok(c.relevantSections.includes("health"));
  assert.ok(c.matterContext.sections.health);
  assert.ok(c.matterContext.sections.identity);
  assert.equal(c.matterContext.sections.participants, undefined); // not a summarize section
  assert.equal(c.recommendedPromptInputs.answerable, true);
  assert.equal(c.recommendedPromptInputs.directives.length, 6); // 5 base + 1 intent
  assert.equal(c.recommendedPromptInputs.grounding, c.matterContext);
});

test("explain_participants on an empty matter is insufficient_data (blocking missing fact)", () => {
  const c = buildConversationContext({ intelligence: EMPTY, message: "מי מעורב בתיק?" });
  assert.equal(c.intent, "explain_participants");
  assert.equal(c.missingFacts.length, 1);
  assert.equal(c.missingFacts[0].code, "PARTICIPANTS");
  assert.equal(c.missingFacts[0].blocking, true);
  assert.equal(c.answerability.level, "insufficient_data");
  assert.equal(c.recommendedPromptInputs.answerable, false);
});

test("draft_request without a named target asks for clarification", () => {
  const c = ctx("תכין טיוטה");
  assert.equal(c.intent, "draft_request");
  const codes = c.clarificationQuestions.map((q) => q.code);
  assert.ok(codes.includes("DRAFT_TARGET"));
  assert.equal(c.answerability.level, "needs_clarification");
  // naming the document resolves the ambiguity (client is present in the fixture)
  const c2 = ctx("נסח מכתב דרישה למעסיק");
  assert.equal(c2.clarificationQuestions.length, 0);
  assert.equal(c2.answerability.level, "ready");
});

test("show_missing_information is always answerable and surfaces known unknowns", () => {
  const c = buildConversationContext({ intelligence: EMPTY, message: "מה חסר בתיק?" });
  assert.equal(c.intent, "show_missing_information");
  assert.equal(c.answerability.level, "ready");
  assert.ok((c.matterContext.sections.knownUnknowns?.length ?? 0) > 0);
  assert.ok(c.matterContext.sections.completeness);
});

test("unknown intent is out_of_scope with a blocking clarification", () => {
  const c = ctx("");
  assert.equal(c.intent, "unknown");
  assert.equal(c.answerability.level, "out_of_scope");
  assert.ok(c.clarificationQuestions.some((q) => q.blocking));
  assert.equal(c.recommendedPromptInputs.answerable, false);
});

test("a vague follow-up inherits the prior turn's concrete intent", () => {
  const history: ConversationTurn[] = [
    { role: "user", content: "סכם את התיק" },
    { role: "assistant", content: "…" },
  ];
  const c = ctx("ומה עוד?", history);
  assert.equal(c.isFollowUp, true);
  assert.equal(c.previousIntent, "summarize_matter");
  assert.equal(c.intent, "summarize_matter"); // inherited
});

test("prepare_for_hearing on a matter with a deadline needs no hearing-target clarification", () => {
  const c = ctx("הכן אותי לדיון");
  assert.equal(c.intent, "prepare_for_hearing");
  assert.ok(!c.clarificationQuestions.some((q) => q.code === "HEARING_TARGET"));
  assert.equal(c.answerability.level, "ready");
});

test("the conversation context is deeply immutable and deterministic", () => {
  const c = ctx("סכם את התיק");
  assert.ok(Object.isFrozen(c));
  assert.ok(Object.isFrozen(c.recommendedPromptInputs));
  assert.ok(Object.isFrozen(c.matterContext.sections));
  assert.throws(() => {
    (c as { intent: string }).intent = "x";
  });
  const again = ctx("סכם את התיק");
  assert.equal(JSON.stringify(c), JSON.stringify(again));
});

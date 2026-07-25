/**
 * Dino Conversation Engine (Capability 3, Slice 3.0.0). PURE + DETERMINISTIC.
 *
 * `buildConversationContext({ intelligence, history, message })` produces the
 * canonical `ConversationContext` that fully prepares a future AI turn WITHOUT
 * any AI: it classifies intent, sets scope, selects the relevant matter
 * sections, detects required/missing facts, raises clarification questions,
 * estimates answerability, projects an intent-scoped `MatterContext`, and emits
 * `RecommendedPromptInputs` — the ONE object a provider adapter will consume.
 * No LLM, no prompt templates, no model invocation, no streaming, no search.
 */
import type { MatterIntelligence } from "../../matter/intelligence/types.ts";
import type {
  ConversationContext, ConversationRequest, ConversationTurn, DinoIntent,
  MatterContext, MatterContextSections, MatterSection, RequiredFact, MissingFact,
  ClarificationQuestion, Answerability, AnswerabilityLevel, RecommendedPromptInputs,
} from "./types.ts";
import { INTENT_CONFIG, classifyIntent, hasNamedDraftTarget } from "./intents.ts";

export const DINO_CONVERSATION_VERSION = "dino-conversation-v1";

const BASE_DIRECTIVES: readonly string[] = [
  "ענה בעברית, בסגנון מקצועי, ברור ותמציתי.",
  "הסתמך אך ורק על נתוני התיק שסופקו (MatterIntelligence); אין להמציא עובדות, שמות או מקורות.",
  "הבחן בין עובדה מבוססת לבין טענה שנויה במחלוקת או מידע חסר.",
  "כל טענה משפטית מחייבת מקור מאומת; בהיעדר מקור, ציין זאת במפורש.",
  "פעולות בעלות תוצאה (שליחה, הגשה, ניסוח סופי) טעונות אישור אנושי.",
];

/** Required-fact registry — each maps to a predicate over MatterIntelligence. */
const FACT_REQUIREMENTS: Record<string, { labelHe: string; section: MatterSection; satisfied: (mi: MatterIntelligence) => boolean; reasonHe: string }> = {
  CLIENT: { labelHe: "לקוח", section: "client", satisfied: (mi) => mi.client.present, reasonHe: "לא זוהה לקוח בתיק" },
  PARTICIPANTS: { labelHe: "גורמים מעורבים", section: "participants", satisfied: (mi) => mi.counts.participants > 0, reasonHe: "טרם הוזנו גורמים מעורבים" },
  FACTS: { labelHe: "עובדות", section: "facts", satisfied: (mi) => mi.counts.facts > 0, reasonHe: "טרם הוזנו עובדות" },
  ESTABLISHED_FACTS: { labelHe: "עובדות מבוססות", section: "facts", satisfied: (mi) => mi.counts.establishedFacts > 0, reasonHe: "אין עובדות מבוססות" },
  EVIDENCE: { labelHe: "ראיות", section: "evidence", satisfied: (mi) => mi.counts.evidence > 0, reasonHe: "טרם הוגדרו ראיות" },
  DEADLINES: { labelHe: "מועדים", section: "deadlines", satisfied: (mi) => mi.counts.deadlines > 0, reasonHe: "טרם הוגדרו מועדים" },
  TIMELINE: { labelHe: "אירועי ציר זמן", section: "timeline", satisfied: (mi) => mi.counts.timelineEvents > 0, reasonHe: "אין אירועים בציר הזמן" },
};

const FOLLOW_UP_CUES: readonly string[] = ["וגם", "ומה", "תרחיב", "הרחב", "עוד", "וגם כן", "and", "also", "more", "what about", "expand"];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

/** Project only the relevant sections of MatterIntelligence into a MatterContext. */
function buildMatterContext(mi: MatterIntelligence, sections: readonly MatterSection[]): MatterContext {
  const set = new Set(sections);
  const s: Record<string, unknown> = {};
  if (set.has("identity")) s.identity = mi.identity;
  if (set.has("stage")) s.stage = mi.stage;
  if (set.has("client")) s.client = mi.client;
  if (set.has("responsible_lawyer")) s.responsibleLawyer = mi.responsibleLawyer;
  if (set.has("participants")) s.participants = mi.participants;
  if (set.has("facts")) s.facts = mi.facts;
  if (set.has("documents")) s.documents = mi.documents;
  if (set.has("evidence")) s.evidence = mi.evidence;
  if (set.has("deadlines")) s.deadlines = mi.deadlines;
  if (set.has("timeline")) s.timeline = mi.timeline;
  if (set.has("relationships")) s.relationships = mi.relationships;
  if (set.has("counts")) s.counts = mi.counts;
  if (set.has("timing")) s.timing = mi.timing;
  if (set.has("completeness")) s.completeness = mi.completeness;
  if (set.has("health")) s.health = mi.health;
  if (set.has("scores")) s.scores = mi.scores;
  if (set.has("outstanding_issues")) s.outstandingIssues = mi.outstandingIssues;
  if (set.has("known_unknowns")) s.knownUnknowns = mi.knownUnknowns;
  return {
    matterId: mi.identity.matterId,
    titleHe: mi.identity.titleHe,
    procedureLabelHe: mi.identity.procedureLabelHe,
    stageLabelHe: mi.stage.stageLabelHe,
    status: mi.identity.status,
    healthStatus: mi.health.status,
    includedSections: sections,
    sections: s as MatterContextSections,
  };
}

export function buildConversationContext(request: ConversationRequest): ConversationContext {
  const mi = request.intelligence;
  const message = request.message;
  const history: readonly ConversationTurn[] = request.history ?? [];
  const nowISO = request.nowISO ?? mi.meta.generatedAtISO;

  // -- classification (with light follow-up inheritance) --------------------
  const priorUserTurns = history.filter((t) => t.role === "user");
  const lastUserTurn = priorUserTurns[priorUserTurns.length - 1];
  const previousIntent: DinoIntent | null = lastUserTurn ? classifyIntent(lastUserTurn.content).intent : null;
  const wordCount = message.trim().length ? message.trim().split(/\s+/).length : 0;
  const isFollowUp = history.length > 0 && (wordCount <= 4 || FOLLOW_UP_CUES.some((c) => message.toLowerCase().includes(c)));

  const cls = classifyIntent(message);
  let intent = cls.intent;
  let confidence = cls.confidence;
  // A vague follow-up ("ומה עוד?") inherits the prior turn's concrete intent so
  // the conversation stays on subject — deterministic, never a guess of content.
  const vague = intent === "unknown" || (intent === "general_question" && confidence < 0.6);
  if (vague && isFollowUp && previousIntent && previousIntent !== "unknown" && previousIntent !== "general_question") {
    intent = previousIntent;
    confidence = 0.5; // inherited from the prior turn
  }

  const cfg = INTENT_CONFIG[intent];

  // -- required / missing facts --------------------------------------------
  const requiredFacts: RequiredFact[] = cfg.required.map((r) => {
    const spec = FACT_REQUIREMENTS[r.code];
    return { code: r.code, labelHe: spec.labelHe, section: spec.section, satisfied: spec.satisfied(mi) };
  });
  const missingFacts: MissingFact[] = cfg.required
    .filter((r) => !FACT_REQUIREMENTS[r.code].satisfied(mi))
    .map((r) => {
      const spec = FACT_REQUIREMENTS[r.code];
      return { code: r.code, labelHe: spec.labelHe, section: spec.section, reasonHe: spec.reasonHe, blocking: r.blocking };
    });

  // -- clarification questions (request-side ambiguity) --------------------
  const clarifications: ClarificationQuestion[] = [];
  if (intent === "unknown") {
    clarifications.push({ code: "INTENT_UNCLEAR", questionHe: "לא הבנתי את הבקשה. תרצה סיכום התיק, הסבר על מועדים, פירוט הגורמים, או מה שחסר בתיק?", reasonHe: "לא זוהתה כוונה", blocking: true });
  }
  if (intent === "draft_request" && !hasNamedDraftTarget(message)) {
    clarifications.push({ code: "DRAFT_TARGET", questionHe: "איזה מסמך תרצה שאכין? (למשל מכתב דרישה, כתב תביעה, תצהיר)", reasonHe: "סוג המסמך לא צוין", blocking: true });
  }
  if (intent === "prepare_for_hearing" && mi.timing.nearestDeadlineISO === null) {
    clarifications.push({ code: "HEARING_TARGET", questionHe: "לאיזה דיון להתכונן ומהו מועדו? לא נמצא מועד דיון בתיק.", reasonHe: "לא נמצא מועד דיון בתיק", blocking: false });
  }
  if (intent === "general_question" && confidence < 0.6) {
    clarifications.push({ code: "SCOPE", questionHe: "תוכל לחדד את השאלה? אוכל להתמקד בעובדות, במועדים, בגורמים או בסיכום התיק.", reasonHe: "שאלה כללית", blocking: false });
  }

  // -- answerability --------------------------------------------------------
  const blockingClar = clarifications.some((c) => c.blocking);
  const blockingMissing = missingFacts.some((m) => m.blocking);
  let level: AnswerabilityLevel;
  let reasonHe: string;
  if (intent === "unknown") { level = "out_of_scope"; reasonHe = "לא זוהתה כוונה ברורה"; }
  else if (blockingClar) { level = "needs_clarification"; reasonHe = "נדרשת הבהרה מהמשתמש לפני מענה"; }
  else if (blockingMissing) { level = "insufficient_data"; reasonHe = "חסרים נתונים בתיק כדי לענות במלואו"; }
  else { level = "ready"; reasonHe = "ניתן להכין מענה מתוך נתוני התיק"; }
  const score = level === "ready" ? clamp(0.7 + 0.25 * confidence, 0.7, 0.98)
    : level === "needs_clarification" ? 0.4
      : level === "insufficient_data" ? 0.3 : 0.1;
  const answerability: Answerability = { level, score, reasonHe };

  // -- matter context + recommended prompt inputs (the adapter seam) --------
  const matterContext = buildMatterContext(mi, cfg.sections);
  const openQuestions = [
    ...clarifications.map((c) => c.questionHe),
    ...missingFacts.filter((m) => m.blocking).map((m) => m.reasonHe),
  ];
  const recommendedPromptInputs: RecommendedPromptInputs = {
    intent,
    locale: "he-IL",
    taskLabelHe: cfg.taskLabelHe,
    directives: [...BASE_DIRECTIVES, cfg.directiveHe],
    grounding: matterContext,
    userMessage: message,
    conversation: history,
    openQuestions,
    answerable: level === "ready",
  };

  const context: ConversationContext = {
    meta: { version: DINO_CONVERSATION_VERSION, engine: "dino-conversation-engine", generatedAtISO: nowISO },
    userMessage: message,
    intent,
    intentConfidence: confidence,
    scope: cfg.scope,
    isFollowUp,
    previousIntent,
    matterContext,
    relevantSections: cfg.sections,
    requiredFacts,
    missingFacts,
    clarificationQuestions: clarifications,
    answerability,
    recommendedPromptInputs,
    history,
  };

  return deepFreeze(context);
}

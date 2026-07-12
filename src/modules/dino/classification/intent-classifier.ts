/**
 * DinoIntentClassifier — deterministic rules FIRST (Epic 3A, Phase 2).
 * A provider may later ASSIST (via the provider layer) but never replaces
 * these rules; provider output is untrusted until validated against them.
 */
import { normalizeText } from "../../legal-knowledge/extraction/normalize-text.ts";
import type { DinoIntent, DinoRequest, IntentClassification } from "../core/request.ts";
import { POC_ALLOWED_INTENTS } from "../core/request.ts";

export const INTENT_RULES_VERSION = "intent-rules-1.0.0";

interface IntentRule {
  intent: DinoIntent;
  patterns: RegExp[];
  weight: number;
}

/** Reviewed, closed rule set — every match is auditable evidence. */
const RULES: IntentRule[] = [
  { intent: "document_drafting", weight: 2, patterns: [/נסח|לנסח|טיוט[הת]|כתוב (מכתב|כתב|הסכם|חוזה)|הכן (מסמך|כתב)/] },
  { intent: "contract_review", weight: 2, patterns: [/בדוק (את )?החוזה|סקירת חוזה|הסכם.*(בדיקה|סקירה)|review.*contract/i] },
  { intent: "document_review", weight: 1.5, patterns: [/בדוק (את )?המסמך|סקור (את )?המסמך|הערות למסמך/] },
  { intent: "judgment_analysis", weight: 2, patterns: [/נתח (את )?פסק הדין|ניתוח פסק דין|מה נקבע בפסק|ע"ע \d|בג"ץ \d|סע"ש \d/] },
  { intent: "statute_analysis", weight: 2, patterns: [/מה קובע (סעיף|החוק)|פרש (את )?סעיף|ניתוח (סעיף|חוק)|לפי סעיף \d+/] },
  { intent: "case_analysis", weight: 1.5, patterns: [/נתח (את )?התיק|ניתוח התיק|סיכויי התביעה|הערכת סיכון בתיק/] },
  { intent: "hearing_preparation", weight: 2, patterns: [/הכנה לדיון|הכן אותי לדיון|דיון (מחר|בבית)/] },
  { intent: "meeting_preparation", weight: 1.5, patterns: [/הכנה לפגישה|הכן אותי לפגישה/] },
  { intent: "evidence_analysis", weight: 1.5, patterns: [/נתח (את )?הראיות|ניתוח ראיות|חומר הראיות/] },
  { intent: "deadline_analysis", weight: 2, patterns: [/מועד אחרון|התיישנות|דדליין|תוך כמה (ימים|זמן) (יש|ניתן|אפשר)/] },
  { intent: "client_update", weight: 1.5, patterns: [/עדכן (את )?הלקוח|עדכון ללקוח/] },
  { intent: "communication_draft", weight: 1.5, patterns: [/נסח (מייל|הודעה|מכתב ללקוח)|תשובה ללקוח/] },
  { intent: "office_operation", weight: 2, patterns: [/חשבונית|גביי[הת]|פתח תיק חדש|קבע פגישה|לוח זמנים של המשרד/] },
  // research/question — the broad default for legal questions:
  { intent: "legal_research", weight: 1, patterns: [/מחקר|חפש פסיקה|אילו מקורות|סקירת פסיקה|מצא (פסקי דין|אסמכתאות)/] },
  { intent: "legal_question", weight: 0.8, patterns: [/מה (הדין|הזכויות|זכויותי|החוק)|האם (מותר|אסור|חוקי|זכאי)|זכויותיה|זכאי ל|מהן הזכויות|איך החוק/] },
];

const UNSUPPORTED_PATTERNS: RegExp[] = [
  /ייצג אותי|תגיש (תביעה|כתב)|שלח (ל|את זה ל)בית המשפט/, // autonomous legal action
  /השקעה|מניות|קריפטו/,                                    // not legal work
];

export function classifyIntent(request: DinoRequest): IntentClassification {
  const q = normalizeText(request.question);
  const evidence: { pattern: string; matched: string }[] = [];
  const scores = new Map<DinoIntent, number>();

  for (const rule of RULES) {
    for (const p of rule.patterns) {
      const m = q.match(p);
      if (m) {
        scores.set(rule.intent, (scores.get(rule.intent) ?? 0) + rule.weight);
        evidence.push({ pattern: p.source.slice(0, 60), matched: m[0].slice(0, 60) });
      }
    }
  }
  for (const p of UNSUPPORTED_PATTERNS) {
    const m = q.match(p);
    if (m) {
      scores.set("unsupported_request", (scores.get("unsupported_request") ?? 0) + 3);
      evidence.push({ pattern: p.source.slice(0, 60), matched: m[0].slice(0, 60) });
    }
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const primaryIntent: DinoIntent = ranked[0]?.[0] ?? (q.includes("?") || /מה|האם|איך|מתי|כמה/.test(q) ? "legal_question" : "unsupported_request");
  const secondaryIntents = ranked.slice(1, 3).map(([i]) => i);

  const topScore = ranked[0]?.[1] ?? 0;
  const secondScore = ranked[1]?.[1] ?? 0;
  const confidence = topScore === 0 ? 0.3 : Math.min(1, 0.5 + 0.15 * topScore - 0.1 * (secondScore >= topScore ? 1 : 0));

  const ambiguity: string[] = [];
  if (ranked.length > 1 && secondScore === topScore) ambiguity.push("שני סוגי כוונה בעוצמה זהה");
  if (topScore === 0) ambiguity.push("לא זוהתה כוונה מפורשת — סווג כשאלה משפטית כללית");

  const prohibitedPipeline = [...new Set([primaryIntent, ...secondaryIntents])]
    .filter((i) => !POC_ALLOWED_INTENTS.has(i))
    .map((intent) => ({
      intent,
      reasonHe: intent === "unsupported_request"
        ? "בקשה מחוץ לתחום הפעולה של Dino"
        : "סוג משימה שאינו מאושר בשלב ה-POC (נדרש אישור מייסד והרחבת צינור)",
    }));

  return {
    primaryIntent,
    secondaryIntents,
    confidence: Number(confidence.toFixed(2)),
    evidence,
    ambiguity,
    requiredClarification: ambiguity.length && topScore > 0 ? ["אנא הבהר מה המטרה העיקרית של הבקשה"] : [],
    allowedPipeline: [...POC_ALLOWED_INTENTS],
    prohibitedPipeline,
  };
}

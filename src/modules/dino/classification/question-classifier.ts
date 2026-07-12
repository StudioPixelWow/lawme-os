/**
 * DinoQuestionClassifier (Epic 3A, Phase 5).
 * Deterministic, reuses the Relevance Gate's domain detection (single
 * source of truth for domains). Extensible: new domains are added to
 * DOMAIN_PROFILES in the relevance gate, not here.
 */
import { normalizeText } from "../../legal-knowledge/extraction/normalize-text.ts";
import { detectDomain } from "../../legal-knowledge/research/relevance-gate.ts";
import type { DinoRequest } from "../core/request.ts";
import type { QuestionClassification } from "./types.ts";

export const QUESTION_CLASSIFIER_VERSION = "question-classifier-1.0.0";

// patterns tolerate the Hebrew definite article ה between words
// (e.g. "פיצויי הפיטורים") so subdomain detection is not defeated by it.
const SUBDOMAIN_RULES: { key: string; pattern: RegExp }[] = [
  { key: "pregnancy_dismissal", pattern: /היריון|הריון/ },
  { key: "severance", pattern: /פיצויי ה?פיטורים|פיצויי ה?פיטורין|סעיף 14/ },
  { key: "constructive_dismissal", pattern: /התפטר|הרעת ה?תנאים|הרעה מוחשית/ },
  { key: "hearing_duty", pattern: /שימוע/ },
  { key: "overtime", pattern: /שעות ה?נוספות|שעות נוספות/ },
  { key: "notice_period", pattern: /הודעה מוקדמת/ },
  { key: "pension", pattern: /פנסיה|ביטוח ה?פנסיוני|הפרשות/ },
  { key: "worker_classification", pattern: /קבלן|פרילנסר|עצמאי|יחסי עובד/ },
  { key: "wage_claims", pattern: /הלנת ה?שכר|שכר ה?עבודה/ },
  { key: "harassment", pattern: /הטרדה/ },
];

const PROCEDURAL = /סדר דין|אגרה|סמכות (עניינית|מקומית)|ערעור|הליך|התיישנות|מועד להגשה/;

export async function classifyQuestion(request: DinoRequest): Promise<QuestionClassification> {
  const q = normalizeText(request.question);
  // domain via the SAME detector the relevance gate uses (agreement=0 here:
  // classification runs before retrieval; the gate re-checks after)
  const domain = await detectDomain(q, 0);

  const subdomain = SUBDOMAIN_RULES.find((s) => s.pattern.test(q))?.key ?? null;
  const procedural = PROCEDURAL.test(q);
  const factualMarkers = /(האם )?(העובד|העובדת|המעסיק) (קיבל|ידע|עבד|הועסק)|כמה (חודשים|שנים)/.test(q);
  const legalMarkers = /מה (הדין|קובע החוק)|האם (חוקי|מותר|אסור)|זכויות|זכאי|לפי (חוק|סעיף)/.test(q);

  const historical = /בעבר|לפני תיקון|הנוסח הישן|היסטורי/.test(q);
  const urgency: QuestionClassification["urgency"] =
    request.urgency ?? (/דחוף|מחר|היום|מועד אחרון/.test(q) ? "urgent" : "routine");

  // inherently high-risk subdomains (regardless of exact noun/verb form),
  // plus explicit high-stakes keywords
  const HIGH_RISK_SUBDOMAINS = new Set(["pregnancy_dismissal", "harassment", "severance", "constructive_dismissal"]);
  const highRisk =
    (subdomain !== null && HIGH_RISK_SUBDOMAINS.has(subdomain)) ||
    /פיטורים|פוטר|הפליה|אפליה|הטרדה|התיישנות/.test(q);
  const complexity: QuestionClassification["complexity"] =
    (q.length > 120 || (subdomain && procedural)) ? "complex" : q.length > 50 ? "moderate" : "simple";

  const likelyAmbiguity: string[] = [];
  if (!subdomain && domain.detectedDomain === "employment") likelyAmbiguity.push("לא זוהתה תת-סוגיה מובהקת");
  if (factualMarkers && legalMarkers) likelyAmbiguity.push("שאלה מעורבת — עובדתית ומשפטית");

  return {
    domain: domain.detectedDomain,
    domainLabelHe: domain.detectedDomainLabelHe,
    subdomain,
    jurisdiction: request.jurisdiction ?? "IL",
    proceduralOrSubstantive: procedural ? (legalMarkers ? "mixed" : "procedural") : "substantive",
    questionNature: factualMarkers && legalMarkers ? "mixed" : factualMarkers ? "factual" : "legal",
    temporalScope: historical ? "historical_law" : "current_law",
    requirements: {
      primarySource: true, // legal questions always require primary sources
      caseLaw: /פסיקה|פסק דין|הלכה/.test(q) || subdomain !== null,
      regulation: /תקנות/.test(q),
      extensionOrder: /צו הרחבה|פנסיה|הבראה/.test(q),
      officialGuidance: /הנחיה|משרד העבודה/.test(q) || subdomain === "harassment",
      internalFirmKnowledge: !!request.matterId,
    },
    urgency,
    riskLevel: highRisk ? "high" : subdomain ? "medium" : "low",
    complexity,
    likelyAmbiguity,
    confidence: Number((domain.detectedDomain === "unknown" ? 0.3 : subdomain ? 0.85 : 0.65).toFixed(2)),
    limitationsHe: [
      "סיווג דטרמיניסטי (כללים סגורים) — ללא סיוע מודל בשלב זה",
      domain.limitations,
    ],
  };
}

/**
 * DinoClarificationGate (Epic 3A, Phase 4).
 * Dino must stop and ask when key information is missing — it NEVER
 * silently invents facts. Deterministic: matter-specific questions
 * (first-person or attached to a matter) require critical facts;
 * general legal-research questions may proceed without them.
 */
import { normalizeText } from "../../legal-knowledge/extraction/normalize-text.ts";
import type { DinoRequest } from "../core/request.ts";
import type { MatterContextPackage } from "../context/types.ts";
import type { ClarificationQuestion, ClarificationResult } from "./types.ts";

export const CLARIFICATION_RULES_VERSION = "clarification-rules-1.0.0";

const FIRST_PERSON = /אותי|שלי|אני |לי |פיטרו אותי|התפטרתי|קיבלתי מכתב/;

interface CriticalFieldRule {
  field: string;
  /** applies when the question matches */
  appliesWhen: RegExp;
  questionHe: string;
  whyHe: string;
}

/** Critical facts per fact-pattern (employment-law POC rules). */
const CRITICAL_FIELD_RULES: CriticalFieldRule[] = [
  {
    field: "employment_duration",
    appliesWhen: /היריון|הריון|פיטורים|פוטר/,
    questionHe: "מהו משך ההעסקה של העובדת אצל המעסיק (בחודשים)?",
    whyHe: "הגנת סעיף 9 לחוק עבודת נשים תלויה בהשלמת שישה חודשי העסקה",
  },
  {
    field: "employer_knowledge",
    appliesWhen: /היריון|הריון/,
    questionHe: "האם המעסיק ידע על ההיריון בעת הפיטורים?",
    whyHe: "ידיעת המעסיק משפיעה על עילת ההפליה ועל הסעדים",
  },
  {
    field: "permit_status",
    appliesWhen: /היריון|הריון/,
    questionHe: "האם המעסיק ביקש או קיבל היתר פיטורים ממשרד העבודה?",
    whyHe: "פיטורים בהיריון ללא היתר הם שאלה סטטוטורית נפרדת",
  },
  {
    field: "dismissal_date",
    appliesWhen: /פיטורים|פוטר/,
    questionHe: "מתי נמסרה הודעת הפיטורים ומתי נכנסו לתוקף?",
    whyHe: "עיתוי הפיטורים קובע תקופות מוגנות והתיישנות",
  },
  {
    field: "employment_relationship",
    appliesWhen: /פיטורים|פוטר|שכר|זכויות/,
    questionHe: "האם מתקיימים יחסי עובד-מעסיק (ולא קבלנות/פרילנס)?",
    whyHe: "תחולת דיני העבודה מותנית בקיום יחסי עבודה",
  },
];

const OPTIONAL_FIELDS: { field: string; questionHe: string }[] = [
  { field: "representation", questionHe: "את מי אנחנו מייצגים — את העובדת או את המעסיק?" },
  { field: "jurisdiction", questionHe: "האם יש זיקה לסמכות שיפוט מיוחדת?" },
  { field: "requested_output", questionHe: "מה הפלט המבוקש — סקירת מקורות, מזכר או רשימת שאלות?" },
  { field: "deadline", questionHe: "האם קיים מועד דיוני קרוב?" },
  { field: "tone", questionHe: "האם נדרש ניסוח מייעץ, אסרטיבי או ניטרלי?" },
];

export function runClarificationGate(
  request: DinoRequest,
  matterContext: MatterContextPackage,
): ClarificationResult {
  const q = normalizeText(request.question);
  const matterSpecific = FIRST_PERSON.test(q) || !!request.matterId || matterContext.items.length > 0;

  const knownFields = new Set(matterContext.items.filter((i) => i.status !== "unknown").map((i) => i.field));
  const disputedFields = new Set(matterContext.items.filter((i) => i.status === "disputed_fact").map((i) => i.field));

  const missingCritical: string[] = [];
  const questions: ClarificationQuestion[] = [];

  if (matterSpecific) {
    for (const rule of CRITICAL_FIELD_RULES) {
      if (!rule.appliesWhen.test(q)) continue;
      if (knownFields.has(rule.field) && !disputedFields.has(rule.field)) continue;
      missingCritical.push(rule.field);
      questions.push({
        id: `clar-${rule.field}`,
        field: rule.field,
        questionHe: rule.questionHe,
        critical: true,
        whyHe: disputedFields.has(rule.field) ? `${rule.whyHe} (העובדה שנויה במחלוקת)` : rule.whyHe,
      });
    }
  }

  const missingOptional = OPTIONAL_FIELDS.filter((o) => !knownFields.has(o.field)).map((o) => o.field);
  for (const o of OPTIONAL_FIELDS.filter((o) => !knownFields.has(o.field)).slice(0, 3)) {
    questions.push({ id: `clar-${o.field}`, field: o.field, questionHe: o.questionHe, critical: false, whyHe: "משפר דיוק אך אינו חוסם מחקר כללי" });
  }

  const canProceed = missingCritical.length === 0;
  return {
    canProceed,
    missingCriticalFields: missingCritical,
    missingOptionalFields: missingOptional,
    clarificationQuestions: questions,
    assumptionsThatWouldBeRequired: canProceed ? [] : missingCritical.map((f) => `הנחה בדבר ${f} — אסורה ללא אישור המשתמש`),
    prohibitedAssumptions: [
      "אין להניח משך העסקה",
      "אין להניח ידיעת מעסיק",
      "אין להניח קיום או היעדר היתר",
      "אין להסיק עובדה מטענה של צד",
    ],
    recommendedNextStepHe: canProceed
      ? (matterSpecific ? "העובדות הקריטיות זמינות — ניתן להמשיך למחקר" : "שאלה כללית — ממשיכים למחקר עקרוני ללא מסקנה קונקרטית לתיק")
      : "יש להשיב על שאלות ההבהרה הקריטיות לפני מסקנה משפטית לתיק זה",
  };
}

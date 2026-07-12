/**
 * DinoResearchPlanner (Epic 3A, Phase 6).
 * Does NOT answer the question — produces a structured, stored plan
 * derived from the classification and the issue graph.
 */
import type { DinoRequest } from "../core/request.ts";
import type { QuestionClassification } from "../classification/types.ts";
import type { IssueGraph } from "../issues/types.ts";
import type { ResearchPlan, ResearchPlanStep } from "./types.ts";
import { normalizeText } from "../../legal-knowledge/extraction/normalize-text.ts";

export const RESEARCH_PLANNER_VERSION = "research-planner-1.0.0";

const STATUTES_BY_SUBDOMAIN: Record<string, string[]> = {
  pregnancy_dismissal: ["חוק עבודת נשים", "חוק שוויון ההזדמנויות בעבודה"],
  severance: ["חוק פיצויי פיטורים"],
  constructive_dismissal: ["חוק פיצויי פיטורים"],
  hearing_duty: [],
  overtime: ["חוק שעות עבודה ומנוחה", "חוק הגנת השכר"],
  notice_period: ["חוק הודעה מוקדמת לפיטורים ולהתפטרות"],
  pension: [],
  worker_classification: [],
  wage_claims: ["חוק הגנת השכר"],
  harassment: ["החוק למניעת הטרדה מינית"],
};

const EXTENSION_ORDERS: Record<string, string[]> = {
  pension: ["צו הרחבה לביטוח פנסיוני מקיף במשק"],
};

export function buildResearchPlan(
  request: DinoRequest,
  classification: QuestionClassification,
  issueGraph: IssueGraph,
): ResearchPlan {
  const sub = classification.subdomain ?? "general";
  const steps: ResearchPlanStep[] = [];
  let order = 1;

  // per-issue statutory + case-law steps, in dependency order (roots first)
  const ordered = [...issueGraph.issues].sort((a, b) => a.dependsOn.length - b.dependsOn.length);
  for (const issue of ordered) {
    steps.push({
      id: `step-${order}`, orderIndex: order++, issueId: issue.id, kind: "statutory",
      objectiveHe: `איתור המסגרת הסטטוטורית: ${issue.titleHe}`,
    });
    if (classification.requirements.caseLaw) {
      steps.push({
        id: `step-${order}`, orderIndex: order++, issueId: issue.id, kind: "case_law",
        objectiveHe: `איתור פסיקה מחייבת ומנחה: ${issue.titleHe}`,
      });
    }
  }
  steps.push({
    id: `step-${order}`, orderIndex: order++, issueId: null, kind: "contrary_authority",
    objectiveHe: "חיפוש אסמכתאות סותרות או מגבילות (חובה)",
  });
  const anyMissing = issueGraph.issues.some((i) => i.missingFacts.length > 0);
  if (anyMissing) {
    steps.push({
      id: `step-${order}`, orderIndex: order++, issueId: null, kind: "factual",
      objectiveHe: "זיהוי עובדות חסרות (משך העסקה, ידיעת מעסיק, היתר) — ללא הנחות",
    });
    steps.push({
      id: `step-${order}`, orderIndex: order++, issueId: null, kind: "refusal_rule",
      objectiveHe: "סירוב למסקנה סופית אם עובדות מכריעות חסרות",
    });
  }

  return {
    normalizedQuestion: normalizeText(request.question),
    objectiveHe: "מיפוי הזכויות והחובות הרלוונטיות, מעוגן במקורות בלבד — ללא מסקנה ללא אסמכתה",
    legalIssueIds: issueGraph.issues.map((i) => i.id),
    subQuestions: issueGraph.issues.map((i, idx) => ({ id: `sq-${idx + 1}`, questionHe: i.statementHe, issueId: i.id })),
    factualDependencies: issueGraph.issues.flatMap((i) =>
      i.missingFacts.map((f) => ({ fact: f, neededForHe: i.titleHe })),
    ),
    requiredSourceCategories: [
      "current_statutory_text",
      ...(classification.requirements.caseLaw ? ["binding_case_law", "persuasive_case_law"] : []),
      ...(classification.requirements.extensionOrder ? ["extension_order"] : []),
      ...(classification.requirements.officialGuidance ? ["official_guidance"] : []),
    ],
    preferredAuthorityLevels: ["legislation", "supreme", "national_labor", "regional"],
    relevantStatutes: STATUTES_BY_SUBDOMAIN[sub] ?? [],
    likelyRegulations: classification.requirements.regulation ? ["תקנות רלוונטיות לתחום"] : [],
    likelyExtensionOrders: EXTENSION_ORDERS[sub] ?? [],
    likelyCaseLawCategories: issueGraph.issues.map((i) => i.titleHe),
    dateConstraints: { asOf: request.dateContext ?? null, cutoff: request.temporalCutoff ?? null },
    jurisdictionFilters: [classification.jurisdiction],
    exclusionCriteria: [
      "מקורות שאינם בתחום דיני העבודה",
      "גרסאות חקיקה שאינן בתוקף במועד הרלוונטי",
      ...(request.sourceRestrictions?.includes("primary_only") ? ["מקורות משניים"] : []),
    ],
    contradictionSearchPlanHe: [
      "חיפוש עמדות מנוגדות בין ערכאות",
      "חיפוש חריגים סטטוטוריים",
      "בדיקת טיפול מאוחר בהלכה",
    ],
    negativeAuthorityPlanHe: ["חיפוש אסמכתאות הפוכות לכל טענה מרכזית לפני קיבועה"],
    missingInformationPlanHe: issueGraph.issues
      .filter((i) => i.missingFacts.length > 0)
      .map((i) => `עובדות חסרות עבור "${i.titleHe}": ${i.missingFacts.join(", ")}`),
    stopConditionsHe: [
      "שער הרלוונטיות נכשל",
      "אין מקור ראשי נדרש",
      "סתירה מהותית בלתי פתורה",
      "עובדה מכריעה חסרה למסקנה קונקרטית",
    ],
    completionCriteriaHe: [
      "כל סוגיה נתמכת או מסומנת ככזו שאינה נתמכת",
      "בוצע חיפוש סתירות",
      "כל ציטוט מאומת מול המקור",
    ],
    steps,
    plannerVersion: RESEARCH_PLANNER_VERSION,
  };
}

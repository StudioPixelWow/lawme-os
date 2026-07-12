/**
 * DinoLegalIssueDecomposer (Epic 3A, Phase 7).
 * Deterministic issue templates per employment-law subdomain, instantiated
 * against the matter context → an ISSUE GRAPH with dependencies, not a
 * flat list. Extending domains = adding reviewed templates.
 */
import type { MatterContextPackage } from "../context/types.ts";
import type { QuestionClassification } from "../classification/types.ts";
import type { IssueGraph, LegalIssue, IssueType } from "./types.ts";

export const ISSUE_DECOMPOSER_VERSION = "issue-decomposer-1.0.0";

interface IssueTemplate {
  key: string;
  titleHe: string;
  statementHe: string;
  issueType: IssueType;
  legalElementsHe: string[];
  requiredFacts: string[];
  burdenOfProofHe: string;
  authorityThreshold: "binding" | "persuasive_ok";
  risk: "low" | "medium" | "high";
  dependsOn: string[];
}

const TEMPLATES: Record<string, IssueTemplate[]> = {
  pregnancy_dismissal: [
    {
      key: "protected_status",
      titleHe: "תחולת ההגנה לפי חוק עבודת נשים",
      statementHe: "האם העובדת מוגנת לפי סעיף 9 לחוק עבודת נשים (שישה חודשי העסקה)?",
      issueType: "applicability",
      legalElementsHe: ["השלמת שישה חודשי העסקה", "קיום יחסי עבודה", "היריון במועד הפיטורים"],
      requiredFacts: ["employment_duration", "employment_relationship", "pregnancy_status"],
      burdenOfProofHe: "על העובדת להראות תחולה; נטל ההיתר על המעסיק",
      authorityThreshold: "binding",
      risk: "high",
      dependsOn: [],
    },
    {
      key: "permit_requirement",
      titleHe: "דרישת היתר פיטורים",
      statementHe: "האם נדרש היתר ממשרד העבודה והאם ניתן?",
      issueType: "statutory_entitlement",
      legalElementsHe: ["חובת היתר לפי סעיף 9", "היעדר היתר = בטלות/פיצוי"],
      requiredFacts: ["permit_status", "employer_knowledge"],
      burdenOfProofHe: "נטל קבלת ההיתר על המעסיק",
      authorityThreshold: "binding",
      risk: "high",
      dependsOn: ["protected_status"],
    },
    {
      key: "hearing_duty",
      titleHe: "חובת השימוע",
      statementHe: "האם קוימה חובת השימוע לפני הפיטורים?",
      issueType: "procedural_requirement",
      legalElementsHe: ["זימון כדין", "פירוט טענות", "הזדמנות להשמיע", "שקילה בלב פתוח"],
      requiredFacts: ["hearing_held"],
      burdenOfProofHe: "על המעסיק להראות הליך תקין",
      authorityThreshold: "persuasive_ok",
      risk: "medium",
      dependsOn: ["protected_status"],
    },
    {
      key: "discrimination",
      titleHe: "הפליה מחמת היריון",
      statementHe: "האם הפיטורים מהווים הפליה אסורה לפי חוק שוויון ההזדמנויות בעבודה?",
      issueType: "statutory_entitlement",
      legalElementsHe: ["קשר סיבתי בין ההיריון לפיטורים", "היפוך נטל לפי סעיף 9 לחוק השוויון"],
      requiredFacts: ["employer_knowledge", "dismissal_date"],
      burdenOfProofHe: "בהתקיים ראשית ראיה — הנטל עובר למעסיק",
      authorityThreshold: "binding",
      risk: "high",
      dependsOn: ["protected_status"],
    },
    {
      key: "remedies",
      titleHe: "סעדים",
      statementHe: "אילו סעדים עומדים לעובדת (פיצוי ממוני, סטטוטורי, לא-ממוני)?",
      issueType: "remedy",
      legalElementsHe: ["אובדן השתכרות לתקופה המוגנת", "פיצוי ללא הוכחת נזק", "נזק לא ממוני", "פגם דיוני עצמאי"],
      requiredFacts: ["salary", "dismissal_date"],
      burdenOfProofHe: "על העובדת להוכיח נזק ממוני; פיצוי סטטוטורי אינו דורש הוכחת נזק",
      authorityThreshold: "persuasive_ok",
      risk: "medium",
      dependsOn: ["permit_requirement", "hearing_duty", "discrimination"],
    },
  ],
  severance: [
    {
      key: "entitlement",
      titleHe: "זכאות לפיצויי פיטורים",
      statementHe: "האם קמה זכאות לפיצויי פיטורים?",
      issueType: "statutory_entitlement",
      legalElementsHe: ["שנת עבודה רצופה", "פיטורים או התפטרות בדין מפוטר"],
      requiredFacts: ["employment_duration", "employment_relationship"],
      burdenOfProofHe: "על העובד",
      authorityThreshold: "binding",
      risk: "medium",
      dependsOn: [],
    },
    {
      key: "constructive",
      titleHe: "התפטרות בדין מפוטר",
      statementHe: "האם הרעה מוחשית בתנאים מקנה דין מפוטר (סעיף 11(א))?",
      issueType: "applicability",
      legalElementsHe: ["הרעה מוחשית", "מתן הזדמנות לתקן", "קשר סיבתי"],
      requiredFacts: ["employment_duration"],
      burdenOfProofHe: "על העובד",
      authorityThreshold: "binding",
      risk: "medium",
      dependsOn: ["entitlement"],
    },
    {
      key: "remedies",
      titleHe: "חישוב הפיצויים",
      statementHe: "כיצד מחושבים הפיצויים ומה דין סעיף 14?",
      issueType: "remedy",
      legalElementsHe: ["שכר אחרון × שנות ותק", "הסדר סעיף 14 אם הוחל"],
      requiredFacts: ["salary", "employment_duration"],
      burdenOfProofHe: "על העובד להוכיח רכיבי שכר",
      authorityThreshold: "persuasive_ok",
      risk: "low",
      dependsOn: ["entitlement"],
    },
  ],
  hearing_duty: [
    {
      key: "duty_scope",
      titleHe: "היקף חובת השימוע",
      statementHe: "מהם רכיבי החובה של הליך שימוע תקין?",
      issueType: "procedural_requirement",
      legalElementsHe: ["זימון מראש ובכתב", "פירוט הטענות", "הזדמנות אמיתית להשמיע", "החלטה מנומקת"],
      requiredFacts: [],
      burdenOfProofHe: "על המעסיק",
      authorityThreshold: "persuasive_ok",
      risk: "medium",
      dependsOn: [],
    },
    {
      key: "breach_remedy",
      titleHe: "סעד בגין פגם בשימוע",
      statementHe: "מהו הסעד בגין הפרת חובת השימוע?",
      issueType: "remedy",
      legalElementsHe: ["פיצוי כספי עצמאי", "שיקולי מידתיות"],
      requiredFacts: [],
      burdenOfProofHe: "על העובד להוכיח את הפגם",
      authorityThreshold: "persuasive_ok",
      risk: "low",
      dependsOn: ["duty_scope"],
    },
  ],
};

/** generic fallback — a single research issue for any in-domain question */
const GENERIC: IssueTemplate[] = [
  {
    key: "general",
    titleHe: "השאלה המשפטית הכללית",
    statementHe: "זיהוי המסגרת הנורמטיבית והמקורות הרלוונטיים",
    issueType: "applicability",
    legalElementsHe: ["איתור החקיקה החלה", "איתור פסיקה מנחה"],
    requiredFacts: [],
    burdenOfProofHe: "לא רלוונטי בשלב המחקר",
    authorityThreshold: "persuasive_ok",
    risk: "low",
    dependsOn: [],
  },
];

export function decomposeIssues(
  classification: QuestionClassification,
  matterContext: MatterContextPackage,
): IssueGraph {
  const templates = (classification.subdomain && TEMPLATES[classification.subdomain]) || GENERIC;
  const available = new Set(matterContext.items.filter((i) => i.status !== "unknown").map((i) => i.field));
  const disputed = new Set(matterContext.items.filter((i) => i.status === "disputed_fact").map((i) => i.field));

  const prefix = classification.subdomain ?? "general";
  const issues: LegalIssue[] = templates.map((t) => {
    const availableFacts = t.requiredFacts.filter((f) => available.has(f));
    const missingFacts = t.requiredFacts.filter((f) => !available.has(f));
    const disputedFacts = t.requiredFacts.filter((f) => disputed.has(f));
    return {
      id: `issue-${prefix}-${t.key}`,
      titleHe: t.titleHe,
      statementHe: t.statementHe,
      issueType: t.issueType,
      legalElementsHe: t.legalElementsHe,
      requiredFacts: t.requiredFacts,
      availableFacts,
      missingFacts,
      disputedFacts,
      burdenOfProofHe: t.burdenOfProofHe,
      sourceRequirementIds: [],
      authorityThreshold: t.authorityThreshold,
      risk: t.risk,
      dependsOn: t.dependsOn.map((d) => `issue-${prefix}-${d}`),
      resolution: "unresolved",
    };
  });

  const edges = issues.flatMap((i) =>
    i.dependsOn.map((from) => ({ from, to: i.id, whyHe: "תלות משפטית: הכרעה במקדים נדרשת" })),
  );

  return {
    issues,
    edges,
    rootIssueIds: issues.filter((i) => i.dependsOn.length === 0).map((i) => i.id),
    decomposerVersion: ISSUE_DECOMPOSER_VERSION,
  };
}

/**
 * DinoRedTeam (Epic 3A, Phase 22).
 * Structurally SEPARATE from the drafting engine: it challenges the
 * proposed output, it never writes it. Deterministic adversarial checks
 * over the issue graph, coverage, contradictions and claims.
 */
import type { IssueGraph } from "../issues/types.ts";
import type { CoverageReport } from "../coverage/types.ts";
import type { ContradictionReport } from "../contradictions/types.ts";
import type { ClaimPlan } from "../claims/types.ts";
import type { EvidenceLedger } from "../evidence/types.ts";
import type { DinoRequest } from "../core/request.ts";
import type { RedTeamChallenge, RedTeamReport } from "./types.ts";

export const RED_TEAM_VERSION = "red-team-1.0.0";

export function runRedTeam(
  request: DinoRequest,
  issueGraph: IssueGraph,
  coverage: CoverageReport,
  contradictions: ContradictionReport,
  claimPlan: ClaimPlan,
  ledger: EvidenceLedger,
): RedTeamReport {
  const challenges: RedTeamChallenge[] = [];
  let n = 1;
  const C = (o: Omit<RedTeamChallenge, "id">): void => { challenges.push({ id: `rt-${n++}`, ...o }); };

  // 1. What fact would change the conclusion? (missing critical facts)
  const factGaps = issueGraph.issues.filter((i) => i.missingFacts.length > 0);
  if (factGaps.length > 0) {
    C({
      challengeHe: "אילו עובדות חסרות עשויות לשנות את המסקנה?",
      affectedClaimIds: claimPlan.claims.filter((c) => factGaps.some((i) => i.id === c.issueId)).map((c) => c.claimId),
      evidenceHe: `סוגיות עם עובדות חסרות: ${factGaps.map((i) => i.titleHe).join("; ")}`,
      severity: "high",
      responseHe: "המסקנה מסויגת עד להשלמת העובדות — אין לקבע מסקנה סופית",
      unresolved: true,
      confidenceImpact: -0.15,
      requiresHumanReview: true,
    });
  }

  // 2. Opposing authority exists?
  if (contradictions.records.length > 0) {
    C({
      challengeHe: "האם קיימת אסמכתה מנוגדת שלא טופלה?",
      affectedClaimIds: [],
      evidenceHe: `אותרו ${contradictions.records.length} סתירות, מתוכן ${contradictions.unresolvedMaterialCount} מהותיות בלתי פתורות`,
      severity: contradictions.unresolvedMaterialCount > 0 ? "blocking" : "medium",
      responseHe: contradictions.unresolvedMaterialCount > 0
        ? "סתירה מהותית בלתי פתורה — חוסמת מסקנה בביטחון גבוה"
        : "הסתירות נפתרו לפי היררכיית סמכות",
      unresolved: contradictions.unresolvedMaterialCount > 0,
      confidenceImpact: contradictions.unresolvedMaterialCount > 0 ? -0.3 : -0.05,
      requiresHumanReview: contradictions.unresolvedMaterialCount > 0,
    });
  }

  // 3. Is a secondary source being overstated?
  const secondaryClaims = claimPlan.claims.filter((c) => c.claimType === "secondary_explanation" || c.claimType === "official_guidance");
  if (secondaryClaims.length > 0) {
    C({
      challengeHe: "האם מקור משני מוצג כבעל משקל מכריע?",
      affectedClaimIds: secondaryClaims.map((c) => c.claimId),
      evidenceHe: `${secondaryClaims.length} טענות נשענות על מקור משני/הנחיה`,
      severity: "medium",
      responseHe: "טענות משניות סומנו כלא-בטוחות ולא נוסחו כקביעה עצמאית",
      unresolved: false,
      confidenceImpact: -0.05,
      requiresHumanReview: false,
    });
  }

  // 4. Is the corpus incomplete?
  if (coverage.overallState !== "complete_for_poc") {
    C({
      challengeHe: "האם הקורפוס אינו שלם ביחס לשאלה?",
      affectedClaimIds: [],
      evidenceHe: `מצב כיסוי: ${coverage.overallState}; מקורות חסרים: ${coverage.missingSourceCategories.join(", ") || "—"}`,
      severity: "medium",
      responseHe: "מוצהר כי הקורפוס סינתטי וחלקי — אין להסתמך משפטית",
      unresolved: true,
      confidenceImpact: -0.1,
      requiresHumanReview: true,
    });
  }

  // 5. Has the user's preferred conclusion biased the analysis?
  if (request.tone === "assertive" || request.documentObjective) {
    C({
      challengeHe: "האם מטרת המשתמש הטתה את הניתוח לעבר מסקנה מועדפת?",
      affectedClaimIds: [],
      evidenceHe: "המשתמש ציין מטרה/טון אסרטיבי",
      severity: "low",
      responseHe: "הניתוח נשען על ראיות מעוגנות בלבד; חיפוש סתירות בוצע במנותק מהמטרה",
      unresolved: false,
      confidenceImpact: -0.02,
      requiresHumanReview: false,
    });
  }

  // 6a. Is the analysis resting on thin/indirect evidence?
  const indirectOnly = ledger.items.length > 0 && ledger.items.every((i) => i.supportDirectness === "indirect");
  if (indirectOnly) {
    C({
      challengeHe: "האם הניתוח נשען רק על תמיכה עקיפה?",
      affectedClaimIds: [],
      evidenceHe: `כל ${ledger.items.length} פריטי הראיה בעלי תמיכה עקיפה`,
      severity: "medium",
      responseHe: "נדרשת ראיה בתמיכה ישירה לפני קביעה — הפלט לגילוי בלבד",
      unresolved: true,
      confidenceImpact: -0.08,
      requiresHumanReview: true,
    });
  }

  // 6. Is the forum/binding authority correct? (no binding source where required)
  const bindingGap = coverage.matrix.filter((m) => !m.bindingAuthorityMet && m.missingSourceTypes.length > 0);
  if (bindingGap.length > 0) {
    C({
      challengeHe: "האם קיים מקור מחייב לכל סוגיה שדורשת זאת?",
      affectedClaimIds: [],
      evidenceHe: `סוגיות ללא סמכות מחייבת: ${bindingGap.map((m) => m.titleHe).join("; ")}`,
      severity: "high",
      responseHe: "סוגיות ללא סמכות מחייבת אינן נתמכות לקביעה — נדרש מקור ראשי",
      unresolved: true,
      confidenceImpact: -0.1,
      requiresHumanReview: true,
    });
  }

  return {
    challenges,
    blockingCount: challenges.filter((c) => c.severity === "blocking").length,
    unresolvedCount: challenges.filter((c) => c.unresolved).length,
    redTeamVersion: RED_TEAM_VERSION,
  };
}

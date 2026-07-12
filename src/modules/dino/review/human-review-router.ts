/**
 * DinoHumanReviewRouter (Epic 3A, Phase 24).
 * Routes work by risk, domain, claim type, source confidence,
 * confidentiality, client policy, objective, deadline, destination.
 */
import type { DinoRequest } from "../core/request.ts";
import type { QuestionClassification } from "../classification/types.ts";
import type { CoverageReport } from "../coverage/types.ts";
import type { ContradictionReport } from "../contradictions/types.ts";
import type { ConfidenceReport } from "../confidence/types.ts";
import type { RedTeamReport } from "../red-team/types.ts";
import type { ReviewRoute, ReviewRouteTarget } from "./types.ts";

export const REVIEW_ROUTER_VERSION = "human-review-router-1.0.0";

export function routeHumanReview(
  request: DinoRequest,
  classification: QuestionClassification,
  coverage: CoverageReport,
  contradictions: ContradictionReport,
  redTeam: RedTeamReport,
  confidence: ConfidenceReport,
): ReviewRoute {
  const targets = new Set<ReviewRouteTarget>();
  const reasons: string[] = [];

  // AI-restricted matter → do not proceed
  if (request.aiPolicy === "prohibited") {
    targets.add("do_not_proceed");
    reasons.push("מדיניות הלקוח/תיק אוסרת שימוש ב-AI");
  }

  // filing-ready objective → partner review (and out of POC scope anyway)
  if (request.documentObjective && /כתב טענות|תביעה|הגשה|בית משפט/.test(request.documentObjective)) {
    targets.add("partner_review");
    reasons.push("יעד מסמך מוכן להגשה — מחוץ להיקף ה-POC, מחייב שותף");
  }

  // conflicting binding authority → partner review
  if (contradictions.unresolvedMaterialCount > 0) {
    targets.add("partner_review");
    reasons.push("סתירה מהותית בלתי פתורה בין מקורות");
  }

  // high-risk domain / limitation → senior review
  if (classification.riskLevel === "high") {
    targets.add("senior_lawyer_review");
    reasons.push("סוגיה בסיכון גבוה (פיטורים/הפליה/התיישנות)");
  }

  // confidentiality → privacy/compliance
  if (request.confidentiality === "privileged") {
    targets.add("privacy_review");
    reasons.push("חיסיון עו\"ד-לקוח");
  }

  // low confidence / blocking red team → lawyer review at minimum
  if (confidence.band === "human_review_required" || confidence.band === "low" || redTeam.blockingCount > 0) {
    targets.add("lawyer_review");
    reasons.push("ביטחון נמוך או ממצא Red Team חוסם");
  }

  // insufficient coverage → lawyer review (research discovery only)
  if (coverage.overallState !== "complete_for_poc") {
    targets.add("lawyer_review");
    reasons.push("כיסוי חלקי — הפלט לגילוי מחקרי בלבד");
  }

  // POC baseline: any legal output requires at least lawyer review
  if (targets.size === 0) {
    targets.add("lawyer_review");
    reasons.push("בסיס POC: כל פלט משפטי טעון בדיקת עורך דין");
  }

  // primary target = most severe
  const severity: ReviewRouteTarget[] = [
    "do_not_proceed", "partner_review", "compliance_review", "privacy_review",
    "senior_lawyer_review", "finance_review", "lawyer_review", "no_review_internal_list",
  ];
  const primaryTarget = severity.find((t) => targets.has(t)) ?? "lawyer_review";

  return {
    targets: [...targets],
    primaryTarget,
    reasonsHe: reasons,
    mandatoryBeforeAction: true,
    routerVersion: REVIEW_ROUTER_VERSION,
  };
}

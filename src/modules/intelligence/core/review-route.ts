/**
 * Shared intelligence primitive — Human Review Route (Epic 4.1).
 * The canonical shape every domain emits to route work to a human. Domains
 * compute the route independently (different rules) but emit this contract.
 */
import type { Severity } from "./severity.ts";

export type ReviewRouteTarget =
  | "no_review"
  | "lawyer_review"
  | "senior_lawyer_review"
  | "partner_review"
  | "specialist_review"
  | "compliance_review"
  | "privacy_review"
  | "finance_review"
  | "do_not_proceed";

export interface ReviewRoute {
  targets: ReviewRouteTarget[];
  primaryTarget: ReviewRouteTarget;
  reasonsHe: string[];
  severity: Severity;
  requiredExpertiseHe?: string[];
  dueHint?: string | null;
  /** review is mandatory before any external/irreversible action */
  blocking: boolean;
  sourceAssessmentIds?: string[];
  routerVersion?: string;
}

/** Dino's legacy review-route target values → canonical. */
export type DinoReviewTargetLegacy =
  | "no_review_internal_list" | "lawyer_review" | "senior_lawyer_review"
  | "partner_review" | "compliance_review" | "privacy_review"
  | "finance_review" | "do_not_proceed";

const DINO_TARGET_TO_SHARED: Record<DinoReviewTargetLegacy, ReviewRouteTarget> = {
  no_review_internal_list: "no_review",
  lawyer_review: "lawyer_review",
  senior_lawyer_review: "senior_lawyer_review",
  partner_review: "partner_review",
  compliance_review: "compliance_review",
  privacy_review: "privacy_review",
  finance_review: "finance_review",
  do_not_proceed: "do_not_proceed",
};

export function dinoReviewTargetToShared(t: DinoReviewTargetLegacy): ReviewRouteTarget {
  return DINO_TARGET_TO_SHARED[t];
}

/** Build a review route from a simple boolean + reason (Matter's current model). */
export function reviewRouteFromFlag(
  requiresHumanReview: boolean,
  target: ReviewRouteTarget,
  severity: Severity,
  reasonsHe: string[],
): ReviewRoute {
  return {
    targets: requiresHumanReview ? [target] : ["no_review"],
    primaryTarget: requiresHumanReview ? target : "no_review",
    reasonsHe,
    severity,
    blocking: target === "do_not_proceed",
  };
}

/** Human-review routing model (Epic 3A, Phase 24). */

export type ReviewRouteTarget =
  | "no_review_internal_list"
  | "lawyer_review"
  | "senior_lawyer_review"
  | "partner_review"
  | "compliance_review"
  | "privacy_review"
  | "finance_review"
  | "do_not_proceed";

export interface ReviewRoute {
  targets: ReviewRouteTarget[];
  primaryTarget: ReviewRouteTarget;
  reasonsHe: string[];
  mandatoryBeforeAction: boolean;
  routerVersion: string;
}

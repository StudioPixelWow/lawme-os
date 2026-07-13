# Human Review Contract (Epic 4.1)

`src/modules/intelligence/core/review-route.ts`

## Purpose

Every domain routes work to a human in the same canonical shape. Domains compute
the route with their own rules; they emit one `ReviewRoute`.

## Contract

```ts
type ReviewRouteTarget =
  | "no_review"
  | "lawyer_review" | "senior_lawyer_review" | "partner_review"
  | "specialist_review"
  | "compliance_review" | "privacy_review" | "finance_review"
  | "do_not_proceed";

interface ReviewRoute {
  targets: ReviewRouteTarget[];
  primaryTarget: ReviewRouteTarget;
  reasonsHe: string[];
  severity: Severity;
  requiredExpertiseHe?: string[];
  dueHint?: string | null;
  blocking: boolean;               // must review before external/irreversible action
  sourceAssessmentIds?: string[];
  routerVersion?: string;
}
```

## Canonical vs legacy

The canonical target set adds `specialist_review` (the Matter Legal engine routes
to specialists on insufficient legal coverage) and renames Dino's
`no_review_internal_list` → `no_review`. Dino keeps its existing `ReviewRoute`
internally; `dinoReviewTargetToShared` maps its targets to canonical (tested).

Matter currently emits a bare `requiresHumanReview: boolean` per engine plus a
rolled-up `MatterState.requiresHumanReview`. `reviewRouteFromFlag(...)` lifts that
boolean into a canonical `ReviewRoute`, so Matter can emit the full route
incrementally.

## Semantics

- `primaryTarget` is the single most senior/blocking destination.
- `blocking: true` means no external or irreversible action may proceed until the
  review happens — the same discipline as Dino's `mandatoryBeforeAction` and
  Matter's `requiresHumanApproval` on actions.
- `sourceAssessmentIds` ties the route back to the engine/stage assessments that
  triggered it (auditability).

## Adoption

Contract + adapters defined and tested now. Domain emission of full `ReviewRoute`
objects (vs the current boolean/legacy route) is incremental and documented; the
shared contract is the target every domain converges to.

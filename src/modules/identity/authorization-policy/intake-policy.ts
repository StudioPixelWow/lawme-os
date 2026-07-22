/**
 * Intake Draft authorization policy (Capability 0.8, Slice 0.8.3).
 *
 * Mirrors the APPLIED, hardened DB model (`app.can_access_intake_draft`): access
 * is the CREATOR or an EXPLICITLY ASSIGNED reviewer — never generic same-org.
 * `confirm` decides authorization READINESS ONLY; it performs no transition and
 * does not bypass the DB confirmation lockdown (confirming/confirmed remain
 * blocked for every client, and Matter creation still waits for
 * `app.bootstrap_matter_v1()`).
 */
import type { ActorContext } from "../actor-context.ts";
import type { IntakeDraftAction } from "./actions.ts";
import type { AuthorizationActor, IntakeDraftPolicyFacts, IntakeDraftPolicyStatus } from "./contracts.ts";
import { isIntakeDraftStatus } from "./contracts.ts";
import {
  authorized,
  denied,
  type AuthorizationRequirement,
  type ResourceAuthorizationDecision,
} from "./decision.ts";
import {
  asUserActor,
  denyMissingCapability,
  denyNonUser,
  denyTenantMismatch,
  isNonEmptyString,
} from "./common.ts";

const RT = "intake_draft" as const;

const EDITABLE: readonly IntakeDraftPolicyStatus[] = ["active", "needs_clarification", "ready_for_review"];
const REVIEWABLE: readonly IntakeDraftPolicyStatus[] = ["active", "needs_clarification", "ready_for_review"];
const REJECTABLE: readonly IntakeDraftPolicyStatus[] = ["active", "needs_clarification", "ready_for_review"];

const REVIEWER_REQ: AuthorizationRequirement = { requirement: "reviewer_assignment_required" };

function factsValid(f: IntakeDraftPolicyFacts): boolean {
  return (
    isNonEmptyString(f.draftId) &&
    isNonEmptyString(f.organizationId) &&
    Array.isArray(f.reviewerProfileIds) &&
    f.reviewerProfileIds.every((r) => typeof r === "string") &&
    isIntakeDraftStatus(f.status)
  );
}

function isCreator(actor: ActorContext, f: IntakeDraftPolicyFacts): boolean {
  return isNonEmptyString(f.createdByProfileId) && f.createdByProfileId === actor.actor.profileId;
}
function isReviewer(actor: ActorContext, f: IntakeDraftPolicyFacts): boolean {
  return f.reviewerProfileIds.includes(actor.actor.profileId);
}

export function authorizeIntakeDraft(
  actor: AuthorizationActor,
  action: IntakeDraftAction,
  facts: IntakeDraftPolicyFacts,
): ResourceAuthorizationDecision {
  const nonUser = denyNonUser(actor, action, RT);
  if (nonUser) return nonUser;
  const user = asUserActor(actor)!;

  if (!factsValid(facts)) return denied("RESOURCE_INVALID_POLICY_FACTS", action, RT, user.request.correlationId);
  const tenant = denyTenantMismatch(user, facts.organizationId, action, RT);
  if (tenant) return tenant;

  const cid = user.request.correlationId;
  const creator = isCreator(user, facts);
  const reviewer = isReviewer(user, facts);
  const hasAccess = creator || reviewer;

  switch (action) {
    case "intake.read": {
      const cap = denyMissingCapability(user, "intake.read", action, RT);
      if (cap) return cap;
      if (!hasAccess) return denied("RESOURCE_MEMBERSHIP_REQUIRED", action, RT, cid, [REVIEWER_REQ]);
      return authorized(action, RT, cid);
    }
    case "intake.edit": {
      if (!hasAccess) return denied("RESOURCE_MEMBERSHIP_REQUIRED", action, RT, cid, [REVIEWER_REQ]);
      // creator edits with intake.read; a reviewer edits with intake.review.
      const cap = creator ? "intake.read" : "intake.review";
      const capDenied = denyMissingCapability(user, cap, action, RT);
      if (capDenied) return capDenied;
      if (!EDITABLE.includes(facts.status)) return denied("RESOURCE_STATUS_DENIED", action, RT, cid);
      return authorized(action, RT, cid);
    }
    case "intake.review": {
      const cap = denyMissingCapability(user, "intake.review", action, RT);
      if (cap) return cap;
      if (!hasAccess) return denied("RESOURCE_REVIEWER_REQUIRED", action, RT, cid, [REVIEWER_REQ]);
      if (!REVIEWABLE.includes(facts.status)) return denied("RESOURCE_STATUS_DENIED", action, RT, cid);
      return authorized(action, RT, cid);
    }
    case "intake.assign_reviewers": {
      const cap = denyMissingCapability(user, "intake.assign_reviewers", action, RT);
      if (cap) return cap;
      // Only the creator may assign reviewers this slice — no generic reviewer
      // escalation. (A future explicit owner/manager policy may widen this.)
      if (!creator) return denied("RESOURCE_MEMBERSHIP_REQUIRED", action, RT, cid, [REVIEWER_REQ]);
      return authorized(action, RT, cid);
    }
    case "intake.confirm": {
      const cap = denyMissingCapability(user, "intake.confirm", action, RT);
      if (cap) return cap;
      if (!hasAccess) return denied("RESOURCE_MEMBERSHIP_REQUIRED", action, RT, cid, [REVIEWER_REQ]);
      // Readiness ONLY. No transition happens here; the DB lockdown still governs.
      if (facts.status !== "ready_for_review") return denied("RESOURCE_STATUS_DENIED", action, RT, cid);
      return authorized(action, RT, cid);
    }
    case "intake.reject": {
      if (!hasAccess) return denied("RESOURCE_MEMBERSHIP_REQUIRED", action, RT, cid, [REVIEWER_REQ]);
      const cap = creator ? "intake.read" : "intake.review";
      const capDenied = denyMissingCapability(user, cap, action, RT);
      if (capDenied) return capDenied;
      if (!REJECTABLE.includes(facts.status)) return denied("RESOURCE_STATUS_DENIED", action, RT, cid);
      return authorized(action, RT, cid);
    }
    default:
      return denied("RESOURCE_ACTION_UNSUPPORTED", action, RT, cid);
  }
}

/** Exposed for callers/tests that need the status classifications. */
export const INTAKE_EDITABLE_STATUSES = EDITABLE;
export const INTAKE_REVIEWABLE_STATUSES = REVIEWABLE;

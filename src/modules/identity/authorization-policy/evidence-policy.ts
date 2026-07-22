/**
 * Evidence authorization policy (Capability 0.8, Slice 0.8.3).
 *
 * `matter_evidence` carries the requirement; review/approval OUTCOMES live on
 * documents, so this policy authorizes ACTIONS only — it never asserts evidence
 * validity (that stays a separate Evidence decision boundary). Every action
 * composes with parent-Matter access. Approval requires explicit approval
 * authority (`matter_members.can_approve`); ownership alone is insufficient.
 */
import type { EvidenceAction } from "./actions.ts";
import type { AuthorizationActor, EvidencePolicyFacts } from "./contracts.ts";
import { authorized, denied, type ResourceAuthorizationDecision } from "./decision.ts";
import {
  activeMatterMembership,
  asUserActor,
  denyMissingCapability,
  denyNonUser,
  denyTenantMismatch,
  isNonEmptyString,
  matterFactsValid,
} from "./common.ts";
import { requireParentMatterRead } from "./matter-policy.ts";

const RT = "evidence" as const;

function factsValid(f: EvidencePolicyFacts): boolean {
  if (!isNonEmptyString(f.organizationId) || !isNonEmptyString(f.matterId)) return false;
  if (!matterFactsValid(f.matterPolicy)) return false;
  if (f.matterPolicy.matterId !== f.matterId) return false;
  if (f.matterPolicy.organizationId !== f.organizationId) return false;
  return true;
}

export function authorizeEvidence(
  actor: AuthorizationActor,
  action: EvidenceAction,
  facts: EvidencePolicyFacts,
): ResourceAuthorizationDecision {
  const nonUser = denyNonUser(actor, action, RT);
  if (nonUser) return nonUser;
  const user = asUserActor(actor)!;

  if (!factsValid(facts)) return denied("RESOURCE_INVALID_POLICY_FACTS", action, RT, user.request.correlationId);
  const tenant = denyTenantMismatch(user, facts.organizationId, action, RT);
  if (tenant) return tenant;

  const cid = user.request.correlationId;
  const matterDenied = requireParentMatterRead(user, facts.matterPolicy, action, RT, cid);
  if (matterDenied) return matterDenied;

  switch (action) {
    case "evidence.read": {
      const cap = denyMissingCapability(user, "evidence.read", action, RT);
      return cap ?? authorized(action, RT, cid);
    }
    case "evidence.create_requirement": {
      const cap = denyMissingCapability(user, "evidence.create_requirement", action, RT);
      return cap ?? authorized(action, RT, cid);
    }
    case "evidence.review": {
      const cap = denyMissingCapability(user, "evidence.review", action, RT);
      return cap ?? authorized(action, RT, cid);
    }
    case "evidence.approve": {
      const cap = denyMissingCapability(user, "evidence.approve", action, RT);
      if (cap) return cap;
      const membership = activeMatterMembership(user, facts.matterPolicy);
      if (!membership || membership.canApprove !== true) {
        return denied("RESOURCE_APPROVAL_DENIED", action, RT, cid, [{ requirement: "owner_or_member_required" }]);
      }
      return authorized(action, RT, cid);
    }
    default:
      return denied("RESOURCE_ACTION_UNSUPPORTED", action, RT, cid);
  }
}

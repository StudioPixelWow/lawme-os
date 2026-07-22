/**
 * Document authorization policy (Capability 0.8, Slice 0.8.3).
 *
 * Document access COMPOSES with parent-Matter access: no one reads a document in
 * a Matter they cannot read. Privileged/restricted documents additionally demand
 * explicit Matter base access (owner/member/override) — a broad-read grant is
 * not enough. Approval requires explicit approval authority
 * (`matter_members.can_approve`); ownership alone never approves a document.
 *
 * A signed-token PREVIEW is a SEPARATE authorization mode and is intentionally
 * absent here: this engine has no token input, so a preview token can never be
 * mistaken for actor authorization.
 */
import type { DocumentAction } from "./actions.ts";
import type { AuthorizationActor, DocumentPolicyFacts } from "./contracts.ts";
import { isDocumentConfidentiality } from "./contracts.ts";
import { authorized, denied, type ResourceAuthorizationDecision } from "./decision.ts";
import {
  activeMatterMembership,
  asUserActor,
  denyMissingCapability,
  denyNonUser,
  denyTenantMismatch,
  hasMatterBaseAccess,
  isNonEmptyString,
  matterFactsValid,
} from "./common.ts";
import { requireParentMatterRead } from "./matter-policy.ts";

const RT = "document" as const;

function factsValid(f: DocumentPolicyFacts): boolean {
  if (!isNonEmptyString(f.documentId) || !isNonEmptyString(f.organizationId) || !isNonEmptyString(f.matterId)) return false;
  if (!isDocumentConfidentiality(f.confidentiality)) return false;
  if (!matterFactsValid(f.matterPolicy)) return false;
  // Parent-Matter facts must describe THIS document's matter + org (no crossing).
  if (f.matterPolicy.matterId !== f.matterId) return false;
  if (f.matterPolicy.organizationId !== f.organizationId) return false;
  return true;
}

export function authorizeDocument(
  actor: AuthorizationActor,
  action: DocumentAction,
  facts: DocumentPolicyFacts,
): ResourceAuthorizationDecision {
  const nonUser = denyNonUser(actor, action, RT);
  if (nonUser) return nonUser;
  const user = asUserActor(actor)!;

  if (!factsValid(facts)) return denied("RESOURCE_INVALID_POLICY_FACTS", action, RT, user.request.correlationId);
  const tenant = denyTenantMismatch(user, facts.organizationId, action, RT);
  if (tenant) return tenant;

  const cid = user.request.correlationId;

  // Parent-Matter READ authorization is the floor for every document action.
  const matterDenied = requireParentMatterRead(user, facts.matterPolicy, action, RT, cid);
  if (matterDenied) return matterDenied;

  // Privileged/restricted documents demand explicit Matter base access.
  const strict = facts.confidentiality === "privileged" || facts.confidentiality === "restricted";
  if (strict && !hasMatterBaseAccess(user, facts.matterPolicy)) {
    return denied("RESOURCE_CONFIDENTIALITY_DENIED", action, RT, cid, [
      { requirement: "owner_or_member_required" },
      { requirement: "confidentiality_override_required" },
    ]);
  }

  switch (action) {
    case "document.read":
    case "document.preview": {
      const cap = denyMissingCapability(user, "documents.read", action, RT);
      return cap ?? authorized(action, RT, cid);
    }
    case "document.upload": {
      const cap = denyMissingCapability(user, "documents.upload", action, RT);
      return cap ?? authorized(action, RT, cid);
    }
    case "document.update": {
      const cap = denyMissingCapability(user, "documents.update", action, RT);
      if (cap) return cap;
      if (facts.approvalState === "approved") return denied("RESOURCE_STATUS_DENIED", action, RT, cid);
      return authorized(action, RT, cid);
    }
    case "document.review": {
      const cap = denyMissingCapability(user, "documents.review", action, RT);
      return cap ?? authorized(action, RT, cid);
    }
    case "document.approve": {
      const cap = denyMissingCapability(user, "documents.approve", action, RT);
      if (cap) return cap;
      // Explicit approval authority — ownership/role alone never approves.
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

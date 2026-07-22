/**
 * Audit authorization policy (Capability 0.8, Slice 0.8.3).
 *
 * Audit access is highly restricted. `audit.read` alone NEVER grants access to
 * every Matter audit record: a MATTER-classified audit additionally requires
 * authorized access to that Matter (composing with the Matter policy +
 * confidentiality). The capability map already restricts `audit.read` to
 * oversight roles. The decision NEVER carries audit payload or confidential
 * content. `classification` is a derived fact (not a schema column); an
 * unknown/absent classification fails closed.
 */
import type { AuditAction } from "./actions.ts";
import type { AuthorizationActor, AuditPolicyFacts } from "./contracts.ts";
import { isAuditClassification } from "./contracts.ts";
import { authorized, denied, type ResourceAuthorizationDecision } from "./decision.ts";
import { asUserActor, denyMissingCapability, denyNonUser, denyTenantMismatch, isNonEmptyString } from "./common.ts";
import { requireParentMatterRead } from "./matter-policy.ts";

const RT = "audit" as const;

export function authorizeAudit(
  actor: AuthorizationActor,
  action: AuditAction,
  facts: AuditPolicyFacts,
): ResourceAuthorizationDecision {
  const nonUser = denyNonUser(actor, action, RT);
  if (nonUser) return nonUser;
  const user = asUserActor(actor)!;

  // Fail closed on missing org or unknown/absent classification.
  if (!isNonEmptyString(facts.organizationId) || !isAuditClassification(facts.classification)) {
    return denied("RESOURCE_INVALID_POLICY_FACTS", action, RT, user.request.correlationId);
  }
  const tenant = denyTenantMismatch(user, facts.organizationId, action, RT);
  if (tenant) return tenant;

  const cid = user.request.correlationId;

  if (action !== "audit.read") return denied("RESOURCE_ACTION_UNSUPPORTED", action, RT, cid);

  const cap = denyMissingCapability(user, "audit.read", action, RT);
  if (cap) return cap;

  // Organization / security audit: capability + same tenant is the gate (the
  // capability itself encodes the oversight restriction).
  if (facts.classification === "organization" || facts.classification === "security") {
    return authorized(action, RT, cid);
  }

  // Matter audit: MUST also satisfy Matter read authorization + confidentiality.
  if (!facts.matterPolicy) {
    return denied("RESOURCE_INVALID_POLICY_FACTS", action, RT, cid, [{ requirement: "matter_access_required" }]);
  }
  const matterDenied = requireParentMatterRead(user, facts.matterPolicy, action, RT, cid);
  if (matterDenied) {
    // Collapse any Matter-access failure into a single audit-access denial —
    // never reveal the specific Matter reason to an audit caller.
    return denied("RESOURCE_AUDIT_ACCESS_DENIED", action, RT, cid, [{ requirement: "matter_access_required" }]);
  }
  return authorized(action, RT, cid);
}

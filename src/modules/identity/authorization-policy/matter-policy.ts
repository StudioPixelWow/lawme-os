/**
 * Matter authorization policy (Capability 0.8, Slice 0.8.3).
 *
 * Pure. Answers "may THIS actor perform THIS action on THIS matter?" by
 * composing capability + ownership/membership + confidentiality. Generic
 * organization membership is NEVER sufficient — the actor must be the assigned
 * owner, hold an active Matter membership, or carry an EXPLICIT grant/override
 * fact. Role labels are never read here.
 */
import type { ActorContext } from "../actor-context.ts";
import type { MatterAction } from "./actions.ts";
import type { AuthorizationActor, MatterPolicyFacts } from "./contracts.ts";
import {
  authorized,
  denied,
  type AuthorizationRequirement,
  type ResourceAuthorizationCode,
  type ResourceAuthorizationDecision,
} from "./decision.ts";
import {
  activeMatterMembership,
  asUserActor,
  denyMissingCapability,
  denyNonUser,
  denyTenantMismatch,
  hasInactiveOwnMembership,
  hasMatterBaseAccess,
  isMatterOwner,
  matterFactsValid,
} from "./common.ts";

const RT = "matter" as const;

/** Result of the pure resource-visibility gate (before action-specific rules). */
type AccessGate =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: Exclude<ResourceAuthorizationCode, "RESOURCE_AUTHORIZED">; readonly requirements: readonly AuthorizationRequirement[] };

const OWNER_OR_MEMBER: AuthorizationRequirement = { requirement: "owner_or_member_required" };
const OVERRIDE_REQ: AuthorizationRequirement = { requirement: "confidentiality_override_required" };
const ACTIVE_MEMBERSHIP_REQ: AuthorizationRequirement = { requirement: "active_membership_required" };

/**
 * The Matter READ-visibility gate: owner / active membership / explicit grant,
 * modulated by confidentiality. An explicit extra restriction lifts an internal
 * matter to at least the confidential tier. This is the seam every other
 * matter-scoped resource (document/evidence/audit) composes with.
 */
export function evaluateMatterReadGate(actor: ActorContext, facts: MatterPolicyFacts): AccessGate {
  const base = hasMatterBaseAccess(actor, facts); // owner || active membership || override
  const effectiveConfidential =
    facts.confidentiality !== "internal" || facts.isExplicitlyRestricted === true;

  if (!effectiveConfidential) {
    // internal tier: base access OR an explicit organization broad-read grant.
    if (base || facts.organizationBroadReadGranted === true) return { ok: true };
    if (hasInactiveOwnMembership(actor, facts)) {
      return { ok: false, code: "RESOURCE_INACTIVE_ASSIGNMENT", requirements: [ACTIVE_MEMBERSHIP_REQ] };
    }
    return { ok: false, code: "RESOURCE_OWNER_OR_MEMBER_REQUIRED", requirements: [OWNER_OR_MEMBER] };
  }

  // client_confidential / privileged / explicitly-restricted: base access only.
  if (base) return { ok: true };
  if (hasInactiveOwnMembership(actor, facts)) {
    return { ok: false, code: "RESOURCE_INACTIVE_ASSIGNMENT", requirements: [ACTIVE_MEMBERSHIP_REQ] };
  }
  return { ok: false, code: "RESOURCE_CONFIDENTIALITY_DENIED", requirements: [OWNER_OR_MEMBER, OVERRIDE_REQ] };
}

/** Owner or active membership (broad-read/override do NOT grant write). */
function hasWriteBase(actor: ActorContext, facts: MatterPolicyFacts): boolean {
  return isMatterOwner(actor, facts) || activeMatterMembership(actor, facts) !== null;
}

export function authorizeMatter(
  actor: AuthorizationActor,
  action: MatterAction,
  facts: MatterPolicyFacts,
): ResourceAuthorizationDecision {
  const nonUser = denyNonUser(actor, action, RT);
  if (nonUser) return nonUser;
  const user = asUserActor(actor)!;

  if (!matterFactsValid(facts)) {
    return denied("RESOURCE_INVALID_POLICY_FACTS", action, RT, user.request.correlationId);
  }
  const tenant = denyTenantMismatch(user, facts.organizationId, action, RT);
  if (tenant) return tenant;

  const cid = user.request.correlationId;
  const gate = evaluateMatterReadGate(user, facts);

  switch (action) {
    case "matter.read": {
      const cap = denyMissingCapability(user, "matters.read", action, RT);
      if (cap) return cap;
      return gate.ok ? authorized(action, RT, cid) : denied(gate.code, action, RT, cid, gate.requirements);
    }
    case "matter.view_privileged": {
      const cap = denyMissingCapability(user, "matters.read", action, RT);
      if (cap) return cap;
      // Privileged view demands explicit base access — a broad-read grant or a
      // role label never grants it.
      if (hasMatterBaseAccess(user, facts)) return authorized(action, RT, cid);
      return denied("RESOURCE_CONFIDENTIALITY_DENIED", action, RT, cid, [OWNER_OR_MEMBER, OVERRIDE_REQ]);
    }
    case "matter.update": {
      const cap = denyMissingCapability(user, "matters.update", action, RT);
      if (cap) return cap;
      if (!gate.ok) return denied(gate.code, action, RT, cid, gate.requirements);
      if (!hasWriteBase(user, facts)) return denied("RESOURCE_OWNER_OR_MEMBER_REQUIRED", action, RT, cid, [OWNER_OR_MEMBER]);
      return authorized(action, RT, cid);
    }
    case "matter.archive": {
      // No `matters.archive` capability exists; archive maps to `matters.update`
      // (documented) + write access — never invent a silent capability.
      const cap = denyMissingCapability(user, "matters.update", action, RT);
      if (cap) return cap;
      if (!gate.ok) return denied(gate.code, action, RT, cid, gate.requirements);
      if (!hasWriteBase(user, facts)) return denied("RESOURCE_OWNER_OR_MEMBER_REQUIRED", action, RT, cid, [OWNER_OR_MEMBER]);
      return authorized(action, RT, cid);
    }
    case "matter.assign_owner": {
      const cap = denyMissingCapability(user, "matters.assign_owner", action, RT);
      if (cap) return cap;
      // read access to the matter; the capability IS the authority to manage
      // assignments. The requested target user is validated later (use-case layer).
      if (!gate.ok) return denied(gate.code, action, RT, cid, gate.requirements);
      return authorized(action, RT, cid);
    }
    case "matter.assign_members": {
      const cap = denyMissingCapability(user, "matters.assign_members", action, RT);
      if (cap) return cap;
      if (!gate.ok) return denied(gate.code, action, RT, cid, gate.requirements);
      return authorized(action, RT, cid);
    }
    default:
      return denied("RESOURCE_ACTION_UNSUPPORTED", action, RT, cid);
  }
}

/**
 * Compose parent-Matter READ authorization for a matter-scoped child resource
 * (document / evidence / audit). Returns null when the actor may read the parent
 * Matter, otherwise a denial re-tagged with the CHILD's action + resource type
 * (preserving the parent's stable reason code — no resource details leak). The
 * caller passes an already-known user actor + correlation id.
 */
export function requireParentMatterRead(
  actor: AuthorizationActor,
  matterFacts: MatterPolicyFacts,
  childAction: ResourceAuthorizationDecision["action"],
  childResourceType: ResourceAuthorizationDecision["resourceType"],
  correlationId: string,
): ResourceAuthorizationDecision | null {
  const decision = authorizeMatter(actor, "matter.read", matterFacts);
  if (decision.allowed) return null;
  return denied(
    decision.code as Exclude<ResourceAuthorizationCode, "RESOURCE_AUTHORIZED">,
    childAction,
    childResourceType,
    correlationId,
    decision.requirements,
  );
}

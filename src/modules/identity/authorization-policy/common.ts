/**
 * Shared, pure policy primitives (Capability 0.8, Slice 0.8.3).
 *
 * Reusable building blocks so no policy module re-implements tenant/capability/
 * actor-type checks or membership evaluation. These are the ONLY place those
 * rules live. Nothing here fetches, mutates, or imports a framework/DB.
 */
import type { ActorContext } from "../actor-context.ts";
import type { Capability } from "../capabilities.ts";
import { newCorrelationId } from "../correlation.ts";
import type { ResourceAction, ResourceType } from "./actions.ts";
import { denied, type ResourceAuthorizationDecision } from "./decision.ts";
import type { AuthorizationActor, MatterPolicyFacts } from "./contracts.ts";
import { isMatterConfidentiality } from "./contracts.ts";

/** True for a fully-resolved human ActorContext. Note the discriminant is the
 *  NESTED `actor.type` ("user"); SystemActor/ServiceActor carry a TOP-LEVEL
 *  `type` and no `actor`/`request`, so this guard cleanly separates them. */
export function isUserActor(actor: AuthorizationActor): actor is ActorContext {
  return (actor as ActorContext).actor?.type === "user";
}

/** A correlation id for the decision: the user's request id, or a fresh id for
 *  non-user actors (which carry none). */
export function correlationOf(actor: AuthorizationActor): string {
  return isUserActor(actor) ? actor.request.correlationId : newCorrelationId();
}

/** Narrow to a real human ActorContext, or null. */
export function asUserActor(actor: AuthorizationActor): ActorContext | null {
  return isUserActor(actor) ? actor : null;
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/** Deny-by-default: returns a denial when the actor is not a human user
 *  (system/service fail closed), else null. Checked BEFORE any resource fact is
 *  parsed so non-human actors never touch resource facts. */
export function denyNonUser(
  actor: AuthorizationActor,
  action: ResourceAction,
  resourceType: ResourceType,
): ResourceAuthorizationDecision | null {
  if (isUserActor(actor)) return null;
  return denied("RESOURCE_ACTOR_TYPE_DENIED", action, resourceType, correlationOf(actor));
}

/** Same-tenant guard: the actor's active org must equal the resource org. */
export function denyTenantMismatch(
  actor: ActorContext,
  organizationId: unknown,
  action: ResourceAction,
  resourceType: ResourceType,
): ResourceAuthorizationDecision | null {
  if (!isNonEmptyString(organizationId)) {
    return denied("RESOURCE_INVALID_POLICY_FACTS", action, resourceType, actor.request.correlationId);
  }
  if (actor.organization.id !== organizationId) {
    return denied("RESOURCE_TENANT_MISMATCH", action, resourceType, actor.request.correlationId);
  }
  return null;
}

export function actorHasCapability(actor: ActorContext, capability: Capability): boolean {
  return actor.capabilities.has(capability);
}

/** Require a category capability, else a `RESOURCE_CAPABILITY_DENIED` decision. */
export function denyMissingCapability(
  actor: ActorContext,
  capability: Capability,
  action: ResourceAction,
  resourceType: ResourceType,
): ResourceAuthorizationDecision | null {
  if (actorHasCapability(actor, capability)) return null;
  return denied("RESOURCE_CAPABILITY_DENIED", action, resourceType, actor.request.correlationId, [
    { requirement: "capability_required", capability },
  ]);
}

/* ── Matter membership / ownership primitives ─────────────────────────────── */

/** True when the actor is the Matter's assigned owner. */
export function isMatterOwner(actor: ActorContext, facts: MatterPolicyFacts): boolean {
  return isNonEmptyString(facts.ownerProfileId) && facts.ownerProfileId === actor.actor.profileId;
}

/** The actor's OWN active Matter membership, or null. A membership for another
 *  profile never grants the actor access; an inactive membership never grants. */
export function activeMatterMembership(actor: ActorContext, facts: MatterPolicyFacts) {
  const m = facts.actorMatterMembership;
  if (!m) return null;
  if (m.profileId !== actor.actor.profileId) return null;
  if (m.active !== true) return null;
  return m;
}

/** True when the membership object is present, is the actor's, but is inactive. */
export function hasInactiveOwnMembership(actor: ActorContext, facts: MatterPolicyFacts): boolean {
  const m = facts.actorMatterMembership;
  return !!m && m.profileId === actor.actor.profileId && m.active !== true;
}

/** "Base access" to a Matter: owner, active membership, or an explicit
 *  confidentiality override. Broad-read grants are NOT base access. */
export function hasMatterBaseAccess(actor: ActorContext, facts: MatterPolicyFacts): boolean {
  return (
    isMatterOwner(actor, facts) ||
    activeMatterMembership(actor, facts) !== null ||
    facts.confidentialityOverrideGranted === true
  );
}

/** Validate the shared Matter fact shape (ids + known confidentiality + membership). */
export function matterFactsValid(facts: MatterPolicyFacts | null | undefined): facts is MatterPolicyFacts {
  if (!facts) return false;
  if (!isNonEmptyString(facts.matterId)) return false;
  if (!isNonEmptyString(facts.organizationId)) return false;
  if (!isMatterConfidentiality(facts.confidentiality)) return false;
  const m = facts.actorMatterMembership;
  if (m) {
    if (!isNonEmptyString(m.membershipId) || !isNonEmptyString(m.profileId)) return false;
    if (typeof m.active !== "boolean") return false;
  }
  return true;
}

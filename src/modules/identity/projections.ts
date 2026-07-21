/**
 * Identity projections (Capability 0.8, Slice 0.8.1).
 *
 * Stable, minimal seams that downstream systems will consume. These are
 * SHAPES + pure builders only — no Bootstrap logic, no Audit/Activity writes.
 *   - Bootstrap  : exactly what app.bootstrap_matter_v1() will later receive.
 *   - Audit      : immutable IDs only — NO names/emails/confidential content.
 *   - Activity   : user-facing ref, deliberately NOT an authority record.
 */
import type { ActorContext, ActorType, ServiceActor, SystemActor } from "./actor-context.ts";
import type { Capability } from "./capabilities.ts";

/** Exactly what Matter Bootstrap authorization will consume (no more). */
export interface BootstrapAuthorizationContext {
  /** Canonical actor id (profiles.id). */
  readonly actorId: string;
  readonly organizationId: string;
  readonly membershipId: string;
  readonly capabilities: ReadonlySet<Capability>;
  readonly correlationId: string;
  readonly capabilityMapVersion: string;
  readonly authorizationPolicyVersion: string;
}

export function toBootstrapAuthorizationContext(actor: ActorContext): BootstrapAuthorizationContext {
  return Object.freeze({
    actorId: actor.actor.profileId,
    organizationId: actor.organization.id,
    membershipId: actor.membership.id,
    capabilities: actor.capabilities,
    correlationId: actor.request.correlationId,
    capabilityMapVersion: actor.policy.capabilityMapVersion,
    authorizationPolicyVersion: actor.policy.authorizationPolicyVersion,
  });
}

/** Immutable audit attribution — IDs only, safe to persist. Never names/emails/content. */
export interface AuditActorRef {
  readonly actorType: ActorType;
  readonly actorProfileId?: string;
  readonly membershipId?: string;
  readonly organizationId: string;
  readonly correlationId: string;
}

export function toAuditActorRef(actor: ActorContext): AuditActorRef {
  return Object.freeze({
    actorType: actor.actor.type,
    actorProfileId: actor.actor.profileId,
    membershipId: actor.membership.id,
    organizationId: actor.organization.id,
    correlationId: actor.request.correlationId,
  });
}

/** Distinct audit ref for a SYSTEM actor (no profile/membership). */
export function systemAuditActorRef(system: SystemActor, organizationId: string, correlationId: string): AuditActorRef {
  return Object.freeze({ actorType: system.type, organizationId, correlationId });
}

/** Distinct audit ref for a SERVICE actor (no profile/membership). */
export function serviceAuditActorRef(service: ServiceActor, organizationId: string, correlationId: string): AuditActorRef {
  return Object.freeze({ actorType: service.type, organizationId, correlationId });
}

/** User-facing actor reference. NOT authoritative; displayName hydrated later. */
export interface ActivityActorRef {
  readonly actorType: ActorType;
  readonly actorProfileId?: string;
  readonly displayName?: string;
}

export function toActivityActorRef(actor: ActorContext): ActivityActorRef {
  return Object.freeze({ actorType: actor.actor.type, actorProfileId: actor.actor.profileId });
}

/** Safe identity data for the shell/UI. The role label is for DISPLAY ONLY and
 *  must never be used as an authorization signal. No tokens/emails/capabilities. */
export interface SafeIdentityDisplay {
  readonly profileDisplayName?: string;
  readonly organizationDisplayName?: string;
  /** Display-only role label (NOT an authorization input). */
  readonly roleLabel: string;
}

export function toSafeIdentityDisplay(
  actor: ActorContext,
  names?: { readonly profileDisplayName?: string; readonly organizationDisplayName?: string },
): SafeIdentityDisplay {
  return Object.freeze({
    profileDisplayName: names?.profileDisplayName,
    organizationDisplayName: names?.organizationDisplayName,
    roleLabel: actor.membership.role,
  });
}

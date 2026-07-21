/**
 * Identity & Authorization — public API (Capability 0.8, Slice 0.8.1).
 *
 * The ONLY surface other modules import. Deliberately excludes: test-support
 * (test-only factories/adapter), any Supabase implementation internals, private
 * role-map internals, and all secret/session data.
 */

// ── Actor context + trusted input ──
export type { ActorContext, ActorType, SystemActor, ServiceActor, TrustedIdentityInput } from "./actor-context.ts";

// ── Capabilities vocabulary ──
export type { Capability, CapabilityScope, CapabilityModule, CapabilityMeta } from "./capabilities.ts";
export { CAPABILITIES, ALL_CAPABILITIES, CAPABILITY_VOCABULARY_VERSION, isCapability, requiresResourceAuthorization } from "./capabilities.ts";

// ── Role → capability map ──
export type { OrganizationRole } from "./role-capabilities.ts";
export { ROLE_CAPABILITIES, CAPABILITY_MAP_VERSION, AUTHORIZATION_POLICY_VERSION, capabilitiesForRole, isOrganizationRole } from "./role-capabilities.ts";

// ── Identity data-source interface ──
export type { ActorIdentityRepository, ProfileIdentity, OrganizationMembershipIdentity } from "./repository.ts";

// ── Resolution ──
export type { OrganizationSelection } from "./resolution.ts";
export { resolveActorContext, selectFromActiveMemberships } from "./resolution.ts";

// ── Authorization helpers + resource seam ──
export type { ResourceRef, ResourceAuthorization } from "./authorization.ts";
export { hasCapability, requireCapability, requireActorType, requireOrganizationContext, authorizeCapability } from "./authorization.ts";

// ── Errors + decision ──
export type { IdentityAuthorizationCode, AuthorizationDecisionCode, AuthorizationDecision, IdentityAuthorizationErrorOptions } from "./errors.ts";
export { IdentityAuthorizationError, authorizedDecision } from "./errors.ts";

// ── Correlation id ──
export { newCorrelationId, isValidCorrelationId, ensureCorrelationId } from "./correlation.ts";

// ── Projections (Bootstrap / Audit / Activity readiness) ──
export type { BootstrapAuthorizationContext, AuditActorRef, ActivityActorRef, SafeIdentityDisplay } from "./projections.ts";
export { toBootstrapAuthorizationContext, toAuditActorRef, systemAuditActorRef, serviceAuditActorRef, toActivityActorRef, toSafeIdentityDisplay } from "./projections.ts";

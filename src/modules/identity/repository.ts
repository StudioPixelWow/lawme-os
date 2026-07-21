/**
 * Actor identity data-source interface (Capability 0.8, Slice 0.8.1).
 *
 * Isolates ActorContext resolution from any persistence implementation. The
 * domain/resolution layer depends ONLY on this interface — never on Supabase.
 * Value types mirror the real schema (public.profiles, public.organization_
 * memberships). Role/status are returned as raw strings so the resolver decides
 * validity (fail-closed on unknown role or non-active status).
 */

/** Projection of public.profiles for identity resolution. */
export interface ProfileIdentity {
  /** public.profiles.id — canonical domain actor id. */
  readonly profileId: string;
  /** auth.users.id — equals profileId for a user (profiles.id references auth.users.id). */
  readonly authUserId: string;
  /** Optional non-identity display name (for later Activity hydration only). */
  readonly displayName?: string;
}

/** Projection of public.organization_memberships for identity resolution. */
export interface OrganizationMembershipIdentity {
  /** organization_memberships.id — the membership identity (distinct from profile). */
  readonly membershipId: string;
  readonly organizationId: string;
  readonly profileId: string;
  /** Raw role string from the schema CHECK; validated by the resolver. */
  readonly role: string;
  /** Raw status string ('invited' | 'active' | 'suspended'); validated by the resolver. */
  readonly status: string;
}

/**
 * Read-only identity source. Implementations MUST tenant-isolate as appropriate;
 * they return only identity projections (never tokens/emails-as-identity/secrets).
 */
export interface ActorIdentityRepository {
  /** The profile whose id equals the given auth user id, or null. */
  findProfileByAuthUserId(authUserId: string): Promise<ProfileIdentity | null>;
  /** All ACTIVE memberships for a profile (may be empty). */
  listActiveMemberships(profileId: string): Promise<readonly OrganizationMembershipIdentity[]>;
  /** The ACTIVE membership for (profile, organization), or null. */
  findActiveMembership(profileId: string, organizationId: string): Promise<OrganizationMembershipIdentity | null>;
  /** The membership for (profile, organization) of ANY status, or null — lets the
   *  resolver distinguish a non-member (TENANT_MISMATCH) from an inactive member
   *  (INACTIVE_MEMBERSHIP) when a specific organization is requested. */
  findMembership(profileId: string, organizationId: string): Promise<OrganizationMembershipIdentity | null>;
}

/**
 * Production ActorIdentityRepository adapter (Capability 0.8, Slice 0.8.2).
 *
 * The ONLY place Supabase is imported for identity. It runs on the AUTHENTICATED,
 * RLS-enforced client (never the service client), returns domain identity
 * contracts (never raw rows / emails / tokens), validates required fields, and
 * fails safely on malformed data. Tenant resolution stays in the pure resolver.
 */
import type { ActorIdentityRepository, OrganizationMembershipIdentity, ProfileIdentity } from "../repository.ts";
import type { AuthDb } from "./supabase-auth-client.ts";

const MEMBERSHIP_COLUMNS = "id, organization_id, profile_id, role, status";

interface RawMembership {
  id: unknown;
  organization_id: unknown;
  profile_id: unknown;
  role: unknown;
  status: unknown;
}

/** Map + validate a membership row; returns null on malformed data (fail safe). */
function mapMembership(row: RawMembership | null | undefined): OrganizationMembershipIdentity | null {
  if (!row) return null;
  const { id, organization_id, profile_id, role, status } = row;
  if (typeof id !== "string" || typeof organization_id !== "string" || typeof profile_id !== "string" ||
      typeof role !== "string" || typeof status !== "string") {
    return null;
  }
  return { membershipId: id, organizationId: organization_id, profileId: profile_id, role, status };
}

/** Build the repository over an authenticated (RLS-enforced) Supabase client. */
export function createSupabaseActorIdentityRepository(db: AuthDb): ActorIdentityRepository {
  return {
    async findProfileByAuthUserId(authUserId: string): Promise<ProfileIdentity | null> {
      // profiles.id === auth.users.id (schema PK/FK); RLS restricts to self.
      const { data, error } = await db.from("profiles").select("id").eq("id", authUserId).maybeSingle();
      if (error || !data || typeof (data as { id?: unknown }).id !== "string") return null;
      const id = (data as { id: string }).id;
      return { profileId: id, authUserId: id };
    },

    async listActiveMemberships(profileId: string): Promise<readonly OrganizationMembershipIdentity[]> {
      const { data, error } = await db
        .from("organization_memberships")
        .select(MEMBERSHIP_COLUMNS)
        .eq("profile_id", profileId)
        .eq("status", "active");
      if (error || !data) return [];
      const mapped: OrganizationMembershipIdentity[] = [];
      for (const row of data as unknown as RawMembership[]) {
        const m = mapMembership(row);
        if (m && m.status === "active") mapped.push(m);
      }
      return mapped;
    },

    async findActiveMembership(profileId: string, organizationId: string): Promise<OrganizationMembershipIdentity | null> {
      const { data, error } = await db
        .from("organization_memberships")
        .select(MEMBERSHIP_COLUMNS)
        .eq("profile_id", profileId)
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .maybeSingle();
      if (error) return null;
      const m = mapMembership(data as unknown as RawMembership | null);
      return m && m.status === "active" ? m : null;
    },

    async findMembership(profileId: string, organizationId: string): Promise<OrganizationMembershipIdentity | null> {
      const { data, error } = await db
        .from("organization_memberships")
        .select(MEMBERSHIP_COLUMNS)
        .eq("profile_id", profileId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error) return null;
      return mapMembership(data as unknown as RawMembership | null);
    },
  };
}

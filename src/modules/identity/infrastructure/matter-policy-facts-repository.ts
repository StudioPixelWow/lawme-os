/**
 * Matter authorization-fact loader (Capability 0.8, Slice 0.8.4).
 *
 * Loads the NORMALIZED `MatterPolicyFacts` for a matter using the AUTHENTICATED
 * (RLS-enforcing) client — never the service client. It reports facts only; it
 * makes no authorization decision and never infers access from an org role. It
 * scopes every query by the actor's active organization even though RLS also
 * exists, returns null for absent/inaccessible matters (no cross-tenant
 * existence leak), validates rows at runtime, and fails closed on malformed data.
 *
 * It does NOT set `organizationBroadReadGranted` / `confidentialityOverrideGranted`
 * — no persisted source exists, so those stay absent (⇒ deny), never fabricated.
 */
import { z } from "zod";
import type { AuthDb } from "./supabase-auth-client.ts";
import type { ActorContext } from "../actor-context.ts";
import type { MatterMembershipFacts, MatterPolicyFacts } from "../authorization-policy/index.ts";
import type { MatterAuthorizationFactsRepository } from "../authorization-policy/index.ts";
import { fetchMaybeRow, isCanonicalUuid, parseRowOrNull, PolicyFactsLoadError } from "./authorization-facts-support.ts";

const MATTER_COLUMNS = "id, organization_id, assigned_owner_id, confidentiality, status" as const;
const MEMBER_COLUMNS = "id, profile_id, can_review, can_approve" as const;

const matterRowSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
  assigned_owner_id: z.string().nullable(),
  confidentiality: z.enum(["internal", "client_confidential", "privileged"]),
  status: z.string().min(1),
});

const memberRowSchema = z.object({
  id: z.string().min(1),
  profile_id: z.string().min(1),
  can_review: z.boolean(),
  can_approve: z.boolean(),
});

/** Build the RLS-bound Matter fact loader over an authenticated client. */
export function createMatterPolicyFactsRepository(db: AuthDb): MatterAuthorizationFactsRepository {
  return {
    async loadMatterPolicyFacts(actor: ActorContext, matterIdOrSlug: string): Promise<MatterPolicyFacts | null> {
      const organizationId = actor.organization.id;
      const byUuid = isCanonicalUuid(matterIdOrSlug);

      const row = await fetchMaybeRow("matter", () => {
        const base = db.from("matters").select(MATTER_COLUMNS).eq("organization_id", organizationId).is("deleted_at", null).limit(1);
        return byUuid ? base.eq("id", matterIdOrSlug) : base.eq("slug", matterIdOrSlug);
      });
      if (!row) return null;
      const m = parseRowOrNull(matterRowSchema, row);
      if (!m) return null; // malformed ⇒ fail closed

      const membership = await loadActorMembership(db, organizationId, m.id, actor.actor.profileId);

      return Object.freeze({
        matterId: m.id,
        organizationId: m.organization_id,
        ownerProfileId: m.assigned_owner_id,
        confidentiality: m.confidentiality,
        actorMatterMembership: membership,
        isArchived: m.status === "archived" || m.status === "closed",
      });
    },
  };
}

/** The actor's OWN matter membership (or null). `matter_members` has no active
 *  column, so a present row is normalized to `active: true`. */
async function loadActorMembership(
  db: AuthDb,
  organizationId: string,
  matterId: string,
  profileId: string,
): Promise<MatterMembershipFacts | null> {
  const row = await fetchMaybeRow("membership", () =>
    db
      .from("matter_members")
      .select(MEMBER_COLUMNS)
      .eq("organization_id", organizationId)
      .eq("matter_id", matterId)
      .eq("profile_id", profileId)
      .limit(1),
  );
  if (!row) return null;
  const parsed = parseRowOrNull(memberRowSchema, row);
  if (!parsed) return null;
  return {
    membershipId: parsed.id,
    profileId: parsed.profile_id,
    canReview: parsed.can_review,
    canApprove: parsed.can_approve,
    active: true,
  };
}

/**
 * The set of matter ids the actor may READ, computed as the sanctioned
 * owner-OR-member candidate query (Matter List Strategy B) — the exact predicate
 * the Matter read policy uses for owner/active-membership access. This is NOT a
 * re-implementation of confidentiality: owner/member grants read at every tier,
 * and no broad-read grant has a persisted source, so the candidate set equals the
 * readable set. It never returns full matter payloads. Fail closed on error.
 */
export interface ReadableMatterIndex {
  listReadableMatterIds(actor: ActorContext): Promise<readonly string[]>;
}

export function createReadableMatterIndex(db: AuthDb): ReadableMatterIndex {
  return {
    async listReadableMatterIds(actor: ActorContext): Promise<readonly string[]> {
      const organizationId = actor.organization.id;
      const profileId = actor.actor.profileId;

      const owned = await runIdList("owned-matters", () =>
        db.from("matters").select("id").eq("organization_id", organizationId).eq("assigned_owner_id", profileId).is("deleted_at", null),
      );
      const memberOf = await runIdList("member-matters", () =>
        db.from("matter_members").select("matter_id").eq("organization_id", organizationId).eq("profile_id", profileId),
      );

      const ids = new Set<string>();
      for (const r of owned) if (typeof (r as { id?: unknown }).id === "string") ids.add((r as { id: string }).id);
      for (const r of memberOf) if (typeof (r as { matter_id?: unknown }).matter_id === "string") ids.add((r as { matter_id: string }).matter_id);
      return [...ids];
    },
  };
}

async function runIdList(stage: string, run: () => PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<unknown[]> {
  const { data, error } = await run();
  if (error) throw new PolicyFactsLoadError(stage);
  return data ?? [];
}

export { PolicyFactsLoadError };

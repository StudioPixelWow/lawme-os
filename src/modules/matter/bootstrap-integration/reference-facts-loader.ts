/**
 * Capability 1 · Slice 1.0.5 — Resolved Bootstrap reference-fact loader.
 *
 * DATABASE READS ONLY — makes NO domain decisions (the Validation Engine does).
 * Every lookup is organization-scoped through the authenticated (RLS) client, so
 * cross-tenant references surface as ABSENT normalized facts without leaking
 * whether the foreign resource exists. No fuzzy Contact matching.
 */

import { z } from "zod";
import type { ActorContext } from "../../identity/actor-context.ts";
import type { AuthDb } from "../../identity/infrastructure/supabase-auth-client.ts";
import {
  BOOTSTRAP_VALIDATION_VERSION,
  type RawBootstrapDraft,
  type ResolvedBootstrapReferenceFacts,
  type ResolvedContactFact,
  type ResolvedMemberFact,
  type ContactKind,
} from "../bootstrap/index.ts";
import { MATTER_INTAKE_CONTRACT_VERSION } from "../intake/contracts.ts";
import { INTAKE_ENGINE_VERSION } from "../intake/pipeline.ts";

/** Server-authoritative supported employment procedure types (mirror of the 12 RPC stages). */
export const SUPPORTED_MATTER_PROCEDURE_TYPES = [
  "pre_dismissal_dispute",
  "pregnancy_dismissal",
  "hearing_before_dismissal",
  "severance_claim",
  "wage_overtime_claim",
  "pension_rights_claim",
  "discrimination_claim",
  "harassment_complaint",
  "regional_labor_court_civil",
  "appeal_to_national_labor_court",
  "national_insurance_claim",
  "settlement_enforcement",
] as const;

const MAX_REFERENCED_CONTACTS = 200;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const orgRowSchema = z.object({ id: z.string().min(1), deleted_at: z.string().nullable() });
const membershipRowSchema = z.object({ profile_id: z.string().min(1), status: z.string().min(1) });
const contactRowSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
  kind: z.enum(["person", "company"]),
});

export interface BootstrapReferenceFactsLoader {
  load(actor: ActorContext, rawDraft: RawBootstrapDraft): Promise<ResolvedBootstrapReferenceFacts>;
}

export function createBootstrapReferenceFactsLoader(db: AuthDb): BootstrapReferenceFactsLoader {
  return {
    async load(actor, rawDraft) {
      const organizationId = actor.organization.id;

      // Organization fact (active = present + not soft-deleted).
      const orgRes = await db
        .from("organizations")
        .select("id, deleted_at")
        .eq("id", organizationId)
        .limit(1)
        .maybeSingle();
      if (orgRes.error) throw new Error("reference facts: organization read failed");
      const orgParsed = orgRes.data ? orgRowSchema.safeParse(orgRes.data) : null;
      const organizationActive = orgParsed?.success === true && orgParsed.data.deleted_at === null;

      // Confirming-actor membership fact (active membership in this org).
      const memRes = await db
        .from("organization_memberships")
        .select("profile_id, status")
        .eq("organization_id", organizationId)
        .eq("profile_id", actor.actor.profileId)
        .limit(1)
        .maybeSingle();
      if (memRes.error) throw new Error("reference facts: membership read failed");
      const memParsed = memRes.data ? membershipRowSchema.safeParse(memRes.data) : null;
      const ownerActive = memParsed?.success === true && memParsed.data.status === "active";
      const owner: ResolvedMemberFact = {
        profileId: actor.actor.profileId,
        organizationId,
        activeMember: ownerActive,
      };

      // Same-tenant Contacts explicitly referenced by the draft (link-existing only).
      const referencedIds = extractReferencedContactIds(rawDraft.structuredDraft);
      let resolvedContacts: readonly ResolvedContactFact[] = [];
      if (referencedIds.length > 0) {
        const contactsRes = await db
          .from("contacts")
          .select("id, organization_id, kind")
          .eq("organization_id", organizationId)
          .in("id", referencedIds);
        if (contactsRes.error) throw new Error("reference facts: contacts read failed");
        const rows = Array.isArray(contactsRes.data) ? contactsRes.data : [];
        resolvedContacts = rows
          .map((r) => contactRowSchema.safeParse(r))
          .filter((p): p is { success: true; data: z.infer<typeof contactRowSchema> } => p.success)
          .map((p) => ({
            contactId: p.data.id,
            organizationId: p.data.organization_id,
            kind: p.data.kind as ContactKind,
          }));
      }

      const facts: ResolvedBootstrapReferenceFacts = {
        organization: { id: organizationId, active: organizationActive },
        owner,
        members: [owner],
        resolvedContacts,
        supportedMatterTypes: [...SUPPORTED_MATTER_PROCEDURE_TYPES],
        existingConfirmation: rawDraft.confirmedMatterId ? { matterId: rawDraft.confirmedMatterId } : null,
        supportedSchemaVersions: [MATTER_INTAKE_CONTRACT_VERSION],
        supportedDraftEngineVersions: [`${INTAKE_ENGINE_VERSION}|${MATTER_INTAKE_CONTRACT_VERSION}`],
        supportedValidationVersion: BOOTSTRAP_VALIDATION_VERSION,
      };
      return Object.freeze(facts);
    },
  };
}

/**
 * Defensive, bounded extraction of explicitly-referenced existing Contact ids
 * from the persisted structured draft. Intelligent intake proposes new Contacts,
 * so this is usually empty; only valid uuids under a `contacts[].contactId` path
 * are considered. Any other shape yields none (the engine then treats a
 * link-existing reference as unknown — fail safe).
 */
export function extractReferencedContactIds(structuredDraft: unknown): readonly string[] {
  if (structuredDraft === null || typeof structuredDraft !== "object" || Array.isArray(structuredDraft)) {
    return [];
  }
  const contacts = (structuredDraft as Record<string, unknown>)["contacts"];
  if (!Array.isArray(contacts)) return [];
  const ids: string[] = [];
  for (const entry of contacts) {
    if (entry === null || typeof entry !== "object") continue;
    const candidate = (entry as Record<string, unknown>)["contactId"];
    if (typeof candidate === "string" && UUID_RE.test(candidate) && !ids.includes(candidate)) {
      ids.push(candidate);
      if (ids.length >= MAX_REFERENCED_CONTACTS) break;
    }
  }
  return ids;
}

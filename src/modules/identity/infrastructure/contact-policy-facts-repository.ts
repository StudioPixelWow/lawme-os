/**
 * Contact authorization-fact loader (Capability 0.8, Slice 0.8.4).
 *
 * Contacts are organization-scoped identities. This loader reports ONLY the
 * facts the Contact policy needs (id + organization). It never decides Matter
 * access — link-to-matter composition happens in the orchestration service,
 * which pairs a Contact decision with a target Matter decision. Authenticated
 * client; absent/cross-tenant ⇒ null; malformed ⇒ fail closed.
 */
import { z } from "zod";
import type { AuthDb } from "./supabase-auth-client.ts";
import type { ActorContext } from "../actor-context.ts";
import type { ContactPolicyFacts } from "../authorization-policy/index.ts";
import type { ContactAuthorizationFactsRepository } from "../authorization-policy/index.ts";
import { fetchMaybeRow, parseRowOrNull } from "./authorization-facts-support.ts";

const CONTACT_COLUMNS = "id, organization_id" as const;

const contactRowSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
});

export function createContactPolicyFactsRepository(db: AuthDb): ContactAuthorizationFactsRepository {
  return {
    async loadContactPolicyFacts(actor: ActorContext, contactId: string): Promise<ContactPolicyFacts | null> {
      const row = await fetchMaybeRow("contact", () =>
        db.from("contacts").select(CONTACT_COLUMNS).eq("organization_id", actor.organization.id).eq("id", contactId).limit(1),
      );
      if (!row) return null;
      const c = parseRowOrNull(contactRowSchema, row);
      if (!c) return null;
      return Object.freeze({ contactId: c.id, organizationId: c.organization_id });
    },
  };
}

/**
 * Audit authorization-fact loader (Capability 0.8, Slice 0.8.4).
 *
 * `audit_events` has no `matter_id` or classification column (matter linkage is
 * via `object_type`/`object_id`), so classification is supplied by the caller and
 * matter linkage is resolved to the parent MatterPolicyFacts. This loader builds
 * the AUTHORIZATION facts only — it never returns an audit payload or event
 * content. There is no audit read route yet, so this is a contract + tests seam.
 * Authenticated client; inaccessible matter ⇒ null; fail closed.
 */
import type { AuthDb } from "./supabase-auth-client.ts";
import type { ActorContext } from "../actor-context.ts";
import type { AuditClassification, AuditPolicyFacts } from "../authorization-policy/index.ts";
import type { AuditAuthorizationFactsRepository } from "../authorization-policy/index.ts";
import { createMatterPolicyFactsRepository } from "./matter-policy-facts-repository.ts";

/** What identifies the audit scope being authorized. */
export interface AuditFactsQuery {
  readonly classification: AuditClassification;
  /** Required when classification === "matter". */
  readonly matterId?: string;
}

export function createAuditPolicyFactsRepository(db: AuthDb): AuditAuthorizationFactsRepository {
  const matters = createMatterPolicyFactsRepository(db);
  return {
    async loadAuditPolicyFacts(actor: ActorContext, query: AuditFactsQuery): Promise<AuditPolicyFacts | null> {
      const organizationId = actor.organization.id;

      if (query.classification === "matter") {
        if (typeof query.matterId !== "string" || query.matterId.length === 0) return null;
        const matterPolicy = await matters.loadMatterPolicyFacts(actor, query.matterId);
        if (!matterPolicy) return null; // inaccessible matter ⇒ no matter-audit facts
        return Object.freeze({
          organizationId,
          matterId: matterPolicy.matterId,
          matterPolicy,
          classification: "matter" as AuditClassification,
        });
      }

      // organization / security: org-scoped only, never a matter payload.
      return Object.freeze({ organizationId, classification: query.classification });
    },
  };
}

/**
 * Intake Draft authorization-fact loader (Capability 0.8, Slice 0.8.4).
 *
 * Loads the NORMALIZED `IntakeDraftPolicyFacts` for a draft using the
 * AUTHENTICATED (RLS-enforcing) client, so the hardened creator/reviewer RLS
 * (`app.can_access_intake_draft`) stays active. It reads ONLY the authorization
 * columns — never `confidential_input` or `structured_draft`. RLS success is not
 * a substitute for policy evaluation: the application policy still runs on the
 * returned facts. Absent/inaccessible ⇒ null (no cross-tenant existence leak);
 * malformed ⇒ fail closed.
 */
import { z } from "zod";
import type { AuthDb } from "./supabase-auth-client.ts";
import type { ActorContext } from "../actor-context.ts";
import type { IntakeDraftPolicyFacts } from "../authorization-policy/index.ts";
import type { IntakeAuthorizationFactsRepository } from "../authorization-policy/index.ts";
import { fetchMaybeRow, parseRowOrNull } from "./authorization-facts-support.ts";

// NOTE: confidential_input and structured_draft are deliberately NOT selected.
const DRAFT_COLUMNS = "id, organization_id, created_by, reviewer_ids, status" as const;

const draftRowSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
  created_by: z.string().nullable(),
  reviewer_ids: z.array(z.string()),
  status: z.enum(["active", "needs_clarification", "ready_for_review", "confirming", "confirmed", "rejected", "expired"]),
});

export function createIntakeDraftPolicyFactsRepository(db: AuthDb): IntakeAuthorizationFactsRepository {
  return {
    async loadIntakeDraftPolicyFacts(actor: ActorContext, draftId: string): Promise<IntakeDraftPolicyFacts | null> {
      const row = await fetchMaybeRow("intake_draft", () =>
        db.from("matter_intake_drafts").select(DRAFT_COLUMNS).eq("organization_id", actor.organization.id).eq("id", draftId).limit(1),
      );
      if (!row) return null;
      const d = parseRowOrNull(draftRowSchema, row);
      if (!d) return null;
      return Object.freeze({
        draftId: d.id,
        organizationId: d.organization_id,
        createdByProfileId: d.created_by,
        reviewerProfileIds: Object.freeze([...d.reviewer_ids]),
        status: d.status,
      });
    },
  };
}

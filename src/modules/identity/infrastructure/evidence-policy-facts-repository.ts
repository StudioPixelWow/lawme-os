/**
 * Evidence authorization-fact loader (Capability 0.8, Slice 0.8.4).
 *
 * Loads NORMALIZED `EvidencePolicyFacts` (with the parent MatterPolicyFacts)
 * using the AUTHENTICATED client. `matter_evidence` has no persisted review/
 * approval-state columns (outcomes live on documents), so none are invented and
 * evidence validity is never inferred. Binds the evidence row to the supplied
 * matter + organization; absent/mismatch ⇒ null; malformed ⇒ fail closed.
 */
import { z } from "zod";
import type { AuthDb } from "./supabase-auth-client.ts";
import type { ActorContext } from "../actor-context.ts";
import type { EvidencePolicyFacts } from "../authorization-policy/index.ts";
import type { EvidenceAuthorizationFactsRepository } from "../authorization-policy/index.ts";
import { fetchMaybeRow, parseRowOrNull } from "./authorization-facts-support.ts";
import { createMatterPolicyFactsRepository } from "./matter-policy-facts-repository.ts";

const EVIDENCE_COLUMNS = "id, organization_id, matter_id, status" as const;

const evidenceRowSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
  matter_id: z.string().min(1),
  status: z.string().min(1),
});

export function createEvidencePolicyFactsRepository(db: AuthDb): EvidenceAuthorizationFactsRepository {
  const matters = createMatterPolicyFactsRepository(db);
  return {
    async loadEvidencePolicyFacts(actor: ActorContext, matterId: string, evidenceId: string): Promise<EvidencePolicyFacts | null> {
      const row = await fetchMaybeRow("evidence", () =>
        db
          .from("matter_evidence")
          .select(EVIDENCE_COLUMNS)
          .eq("organization_id", actor.organization.id)
          .eq("matter_id", matterId)
          .eq("id", evidenceId)
          .limit(1),
      );
      if (!row) return null;
      const e = parseRowOrNull(evidenceRowSchema, row);
      if (!e) return null;

      const matterPolicy = await matters.loadMatterPolicyFacts(actor, matterId);
      if (!matterPolicy) return null;
      if (e.matter_id !== matterId) return null;
      if (e.organization_id !== matterPolicy.organizationId) return null;

      return Object.freeze({
        evidenceId: e.id,
        organizationId: e.organization_id,
        matterId: e.matter_id,
        matterPolicy,
        // `reviewState` intentionally omitted — no persisted source on matter_evidence.
      });
    },
  };
}

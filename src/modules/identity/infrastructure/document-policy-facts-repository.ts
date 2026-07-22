/**
 * Document authorization-fact loader (Capability 0.8, Slice 0.8.4).
 *
 * Loads NORMALIZED `DocumentPolicyFacts` (including the parent MatterPolicyFacts)
 * using the AUTHENTICATED client. It binds the document to the supplied matter:
 * the row must belong to that matter and share its organization — no cross-matter
 * replay, no cross-tenant visibility. It selects ONLY policy-relevant columns —
 * never a storage path, filename, or document content. Absent/mismatch ⇒ null;
 * malformed ⇒ fail closed.
 */
import { z } from "zod";
import type { AuthDb } from "./supabase-auth-client.ts";
import type { ActorContext } from "../actor-context.ts";
import type { DocumentPolicyFacts } from "../authorization-policy/index.ts";
import type { DocumentAuthorizationFactsRepository } from "../authorization-policy/index.ts";
import { fetchMaybeRow, parseRowOrNull } from "./authorization-facts-support.ts";
import { createMatterPolicyFactsRepository } from "./matter-policy-facts-repository.ts";

// Only authorization-relevant columns — NO storage path, filename, or content.
const DOC_COLUMNS = "id, organization_id, matter_id, confidentiality, approval_state, uploaded_by_id, assigned_reviewer_id" as const;

const docRowSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
  matter_id: z.string().min(1),
  confidentiality: z.enum(["standard", "confidential", "privileged", "restricted"]),
  approval_state: z.enum(["draft", "in_review", "approved", "rejected"]),
  uploaded_by_id: z.string().nullable(),
  assigned_reviewer_id: z.string().nullable(),
});

export function createDocumentPolicyFactsRepository(db: AuthDb): DocumentAuthorizationFactsRepository {
  const matters = createMatterPolicyFactsRepository(db);
  return {
    async loadDocumentPolicyFacts(actor: ActorContext, matterId: string, documentId: string): Promise<DocumentPolicyFacts | null> {
      const row = await fetchMaybeRow("document", () =>
        db
          .from("matter_documents")
          .select(DOC_COLUMNS)
          .eq("organization_id", actor.organization.id)
          .eq("matter_id", matterId)
          .eq("id", documentId)
          .is("deleted_at", null)
          .limit(1),
      );
      if (!row) return null;
      const doc = parseRowOrNull(docRowSchema, row);
      if (!doc) return null;

      // Load the parent matter's facts through the same RLS client. Inaccessible
      // parent ⇒ deny (the document is unreachable without matter access).
      const matterPolicy = await matters.loadMatterPolicyFacts(actor, matterId);
      if (!matterPolicy) return null;

      // Bind: no cross-matter replay, no cross-tenant crossing.
      if (doc.matter_id !== matterId) return null;
      if (doc.organization_id !== matterPolicy.organizationId) return null;

      return Object.freeze({
        documentId: doc.id,
        organizationId: doc.organization_id,
        matterId: doc.matter_id,
        matterPolicy,
        confidentiality: doc.confidentiality,
        approvalState: doc.approval_state,
        uploadedByProfileId: doc.uploaded_by_id,
        assignedReviewerProfileId: doc.assigned_reviewer_id,
      });
    },
  };
}

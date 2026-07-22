/**
 * Intake Draft repository (Capability 0.8, Slice 0.8.4). SERVER-ONLY.
 *
 * Reads a persisted `matter_intake_drafts` row through the AUTHENTICATED (RLS)
 * client, so the hardened creator/reviewer policy (`app.can_access_intake_draft`)
 * stays active. `getReviewable` returns the REVIEWABLE payload (status + the
 * structured draft) and is called ONLY after authorization succeeds — it never
 * fetches `confidential_input`. Absent ⇒ null; malformed ⇒ fail closed.
 *
 * (No draft is persisted by the app yet — the analyze route is stateless — so no
 * read route is wired. This repository + the authorize-then-read loader exist so
 * the chain is real and tested for when persistence lands.)
 */
import { z } from "zod";
import type { ActorContext } from "../../identity";
import type { AuthDb } from "../../identity/infrastructure/supabase-auth-client.ts";

// confidential_input is deliberately NOT selected here either.
const REVIEWABLE_COLUMNS = "id, organization_id, status, structured_draft, review_state" as const;

const reviewableRowSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
  status: z.string().min(1),
  structured_draft: z.unknown(),
  review_state: z.unknown().nullable(),
});

export interface ReviewableDraft {
  readonly draftId: string;
  readonly organizationId: string;
  readonly status: string;
  readonly structuredDraft: unknown;
  readonly reviewState: unknown;
}

export interface DraftRepository {
  getReviewable(actor: ActorContext, draftId: string): Promise<ReviewableDraft | null>;
}

export function createDraftRepository(db: AuthDb): DraftRepository {
  return {
    async getReviewable(actor: ActorContext, draftId: string): Promise<ReviewableDraft | null> {
      const { data, error } = await db
        .from("matter_intake_drafts")
        .select(REVIEWABLE_COLUMNS)
        .eq("organization_id", actor.organization.id)
        .eq("id", draftId)
        .limit(1);
      if (error) throw new Error("draft read failed");
      const row = (data ?? [])[0];
      if (!row) return null;
      const parsed = reviewableRowSchema.safeParse(row);
      if (!parsed.success) return null;
      return Object.freeze({
        draftId: parsed.data.id,
        organizationId: parsed.data.organization_id,
        status: parsed.data.status,
        structuredDraft: parsed.data.structured_draft,
        reviewState: parsed.data.review_state,
      });
    },
  };
}

/**
 * Authorize-then-read for Intake Drafts (Capability 0.8, Slice 0.8.4).
 * SERVER-ONLY.
 *
 * The canonical chain for a draft resume/review: load NORMALIZED authorization
 * facts (auth columns only), run the canonical `intake.read` policy, and ONLY on
 * an authorized decision fetch the reviewable payload. Reviewable content — and
 * `confidential_input` in particular — is never fetched before authorization
 * succeeds. A denial returns the safe decision; no route consumes this yet
 * (drafts are not persisted), but the chain is real and tested.
 */
import type { ActorContext } from "../../identity";
import type { AuthDb } from "../../identity/infrastructure/supabase-auth-client.ts";
import { createResourceAuthorizationService } from "../../identity/authorization-integration/index.ts";
import type { ResourceAuthorizationDecision } from "../../identity";
import { createDraftRepository, type ReviewableDraft } from "./draft-repository.ts";

export type AuthorizedDraftResult =
  | { readonly ok: true; readonly draft: ReviewableDraft }
  | { readonly ok: false; readonly decision: ResourceAuthorizationDecision };

/** Authorize `intake.read`, then (only if allowed) read the reviewable draft. */
export async function loadAuthorizedDraftForReview(
  db: AuthDb,
  actor: ActorContext,
  draftId: string,
): Promise<AuthorizedDraftResult> {
  const service = createResourceAuthorizationService(db);
  const decision = await service.authorizeResourceRequest(actor, { resourceType: "intake_draft", action: "intake.read", draftId });
  if (!decision.allowed) return { ok: false, decision };

  // Authorized → NOW fetch the reviewable payload (still no confidential_input).
  const draft = await createDraftRepository(db).getReviewable(actor, draftId);
  if (!draft) return { ok: false, decision };
  return { ok: true, draft };
}

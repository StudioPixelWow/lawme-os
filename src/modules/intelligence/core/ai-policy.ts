/**
 * Shared intelligence primitive — AI Policy (Epic 4.1).
 * The client/matter-level policy governing AI processing. Defined ONCE and
 * consumed by every domain. The shared layer describes the policy; it does not
 * make policy decisions — domains read it and act. (Was duplicated as
 * DinoAiPolicy and MatterClient.aiPolicy with byte-identical values.)
 */

export type AiPolicy =
  | "allowed"
  | "allowed_with_review"
  | "restricted_no_private_context"
  | "prohibited";

/** AI processing is entirely disallowed for this matter/client. */
export function aiProcessingProhibited(p: AiPolicy): boolean {
  return p === "prohibited";
}

/** AI output must be human-reviewed before reliance. */
export function aiRequiresReview(p: AiPolicy): boolean {
  return p === "allowed_with_review";
}

/** Private/identifying client context must be stripped before AI processing. */
export function aiRequiresPrivateContextStripping(p: AiPolicy): boolean {
  return p === "restricted_no_private_context";
}

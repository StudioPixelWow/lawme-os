/**
 * Provider-output validation (Slice 4.1.0, Phase 13). PURE.
 * The provider is a legal-language RENDERER only. This gate rejects any output
 * that materially changes the canonical reasoning — a changed conclusion
 * direction or confidence level — and drops hallucinated citation ids. On
 * rejection the pipeline falls back to the deterministic structured opinion.
 */
import type { LegalOpinion } from "../../legal-reasoning/types.ts";
import type { ReasonedProse } from "./types.ts";

export interface ValidationResult {
  readonly ok: boolean;
  readonly reasonHe: string | null;
  readonly sanitized: ReasonedProse;
}

export function validateProviderProse(prose: ReasonedProse, opinion: LegalOpinion, allowedCitationIds: Set<string>): ValidationResult {
  // Reject a changed conclusion or confidence — the provider must preserve them.
  if (prose.conclusionDirection !== opinion.preliminaryConclusion.direction) {
    return { ok: false, reasonHe: "המודל שינה את מסקנת חוות הדעת — נדחה.", sanitized: prose };
  }
  if (prose.confidenceLevel !== opinion.confidence.level) {
    return { ok: false, reasonHe: "המודל שינה את רמת הביטחון — נדחה.", sanitized: prose };
  }
  // Empty prose is unusable.
  if (!prose.bottomLineHe || prose.bottomLineHe.trim().length === 0) {
    return { ok: false, reasonHe: "פלט ריק מהמודל — נדחה.", sanitized: prose };
  }
  // Drop any citation id the provider invented (never add a legal authority).
  const sanitizedIds = prose.usedCitationIds.filter((id) => allowedCitationIds.has(id));
  return { ok: true, reasonHe: null, sanitized: { ...prose, usedCitationIds: sanitizedIds } };
}

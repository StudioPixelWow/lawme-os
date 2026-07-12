/** Citation-verification model (Epic 3A, Phase 20). */

export type CitationStatus =
  | "verified"
  | "verified_with_limitation"
  | "anchor_valid_source_unverified"
  | "quote_mismatch"
  | "broken_anchor"
  | "insufficient_support"
  | "stale_version"
  | "superseded"
  | "requires_human_review";

export interface CitationCheck {
  evidenceId: string;
  claimId: string | null;
  documentExists: boolean;
  versionExists: boolean;
  anchorExists: boolean;
  quoteMatches: boolean;
  rangeMatches: boolean;
  sourceUrlPresent: boolean;
  authorityCorrect: boolean;
  quoteSupportsClaim: boolean;
  status: CitationStatus;
  /** true → the associated claim is BLOCKED from final output */
  blocksClaim: boolean;
  notesHe: string[];
}

export interface CitationVerificationReport {
  checks: CitationCheck[];
  blockedClaimIds: string[];
  verifierVersion: string;
}

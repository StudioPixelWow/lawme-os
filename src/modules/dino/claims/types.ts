/** Atomic-claim model (Epic 3A, Phase 16). */

export type ClaimType =
  | "verified_fact"
  | "statutory_text"
  | "regulatory_requirement"
  | "extension_order_requirement"
  | "judicial_interpretation"
  | "official_guidance"
  | "secondary_explanation"
  | "inference"
  | "recommendation"
  | "unresolved";

export interface AtomicClaim {
  claimId: string;
  issueId: string;
  propositionHe: string;
  claimType: ClaimType;
  requiredEvidenceHe: string;
  supportingEvidenceIds: string[];
  opposingEvidenceIds: string[];
  factualDependencies: string[];      // context fields the claim depends on
  confidence: number;                 // deterministic 0..1
  safeToState: boolean;
  unsafeReasonsHe: string[];
  wordingConstraintsHe: string[];
  citationRequired: boolean;
  requiresHumanReview: boolean;
}

export interface ClaimPlan {
  claims: AtomicClaim[];
  safeCount: number;
  unsafeCount: number;
  plannerVersion: string;
}

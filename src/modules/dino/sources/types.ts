/** Required-source model (Epic 3A, Phase 8). */

export type SourceRequirementType =
  | "current_statutory_text"
  | "historical_statutory_version"
  | "regulation"
  | "extension_order"
  | "binding_supreme_authority"
  | "national_labor_authority"
  | "regional_persuasive_authority"
  | "official_guidance"
  | "licensed_secondary_commentary"
  | "internal_firm_document";

export interface SourceRequirement {
  id: string;
  issueId: string;
  sourceType: SourceRequirementType;
  authorityLevel: "binding" | "persuasive" | "informative";
  minimumCount: number;
  freshnessHe: string;
  versionDate: string | null;
  mandatory: boolean;
  acceptableSubstitutes: SourceRequirementType[];
  unacceptableSubstitutesHe: string[];
}

export interface SourcePlan {
  requirements: SourceRequirement[];
  /** codified substitution law — the rules Dino "knows" */
  substitutionRulesHe: string[];
  plannerVersion: string;
}

/** Contradiction model (Epic 3A, Phase 12). */

export type ContradictionType =
  | "opposite_conclusion"
  | "limiting_exception"
  | "conflicting_statutory_version"
  | "conflicting_extension_order"
  | "contrary_case_law"
  | "factual_distinction"
  | "procedural_difference"
  | "jurisdictional_difference"
  | "later_amendment"
  | "later_judicial_treatment";

export interface ContradictionRecord {
  id: string;
  propositionAHe: string;
  sourceA: { documentId: string; anchorKey: string; titleHe: string; authorityClass: string };
  propositionBHe: string;
  sourceB: { documentId: string; anchorKey: string; titleHe: string; authorityClass: string };
  contradictionType: ContradictionType;
  directOrApparent: "direct" | "apparent";
  distinctionFactorsHe: string[];
  authorityComparisonHe: string;
  temporalComparisonHe: string;
  recommendedHumanReview: boolean;
  resolutionStatus: "unresolved" | "resolved_by_hierarchy" | "resolved_by_distinction" | "requires_human";
  material: boolean;
}

export interface ContradictionReport {
  records: ContradictionRecord[];
  searchedHe: string[];      // what the engine actually looked for
  unresolvedMaterialCount: number;
  engineVersion: string;
}

/** Coverage model (Epic 3A, Phase 13). Coverage ≠ relevance. */

export type CoverageState =
  | "complete_for_poc"
  | "partially_covered"
  | "insufficient_primary_sources"
  | "insufficient_case_law"
  | "insufficient_facts"
  | "domain_not_covered"
  | "corpus_not_covered"
  | "conflicting_authority"
  | "requires_human_research";

export interface IssueCoverageRow {
  issueId: string;
  titleHe: string;
  supported: boolean;
  primarySourceMet: boolean;
  bindingAuthorityMet: boolean;
  mandatoryRequirementsMet: number;
  mandatoryRequirementsTotal: number;
  missingSourceTypes: string[];
  missingFacts: string[];
  notesHe: string[];
}

export interface CoverageReport {
  matrix: IssueCoverageRow[];
  issuesIdentified: number;
  issuesSupported: number;
  issuesUnsupported: number;
  primarySourceCoverage: number;     // 0..1
  bindingAuthorityCoverage: number;  // 0..1
  currentVersionCoverage: "unknown_poc" | "verified";
  contradictionSearchDone: boolean;
  factualContextCoverage: number;    // 0..1
  corpusDomainCovered: boolean;
  missingSourceCategories: string[];
  missingFacts: string[];
  missingJurisdictionInfo: string[];
  overallState: CoverageState;
  evaluatorVersion: string;
}

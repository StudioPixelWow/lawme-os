/** Legal-issue model + issue GRAPH (Epic 3A, Phase 7). */

export type IssueType =
  | "statutory_entitlement"
  | "procedural_requirement"
  | "jurisdiction"
  | "limitation"
  | "evidentiary_burden"
  | "defense"
  | "remedy"
  | "damages"
  | "enforceability"
  | "applicability"
  | "exception"
  | "temporal_validity";

export type IssueResolution =
  | "unresolved"
  | "supported"
  | "unsupported"
  | "blocked_on_facts"
  | "blocked_on_sources";

export interface LegalIssue {
  id: string;
  titleHe: string;
  statementHe: string;
  issueType: IssueType;
  legalElementsHe: string[];
  requiredFacts: string[];       // context field names
  availableFacts: string[];
  missingFacts: string[];
  disputedFacts: string[];
  burdenOfProofHe: string;
  sourceRequirementIds: string[]; // filled by the source planner
  authorityThreshold: "binding" | "persuasive_ok";
  risk: "low" | "medium" | "high";
  dependsOn: string[];           // issue ids — the GRAPH edges
  resolution: IssueResolution;
}

export interface IssueGraph {
  issues: LegalIssue[];
  edges: { from: string; to: string; whyHe: string }[];
  rootIssueIds: string[];
  decomposerVersion: string;
}

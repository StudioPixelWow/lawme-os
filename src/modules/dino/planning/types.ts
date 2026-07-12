/** Research-plan model (Epic 3A, Phase 6) — structured data, not prose. */

export interface ResearchPlanStep {
  id: string;
  orderIndex: number;
  objectiveHe: string;
  issueId: string | null;           // link into the issue graph
  kind: "statutory" | "case_law" | "contrary_authority" | "factual" | "procedural" | "refusal_rule";
}

export interface ResearchPlan {
  normalizedQuestion: string;
  objectiveHe: string;
  legalIssueIds: string[];
  subQuestions: { id: string; questionHe: string; issueId: string }[];
  factualDependencies: { fact: string; neededForHe: string }[];
  requiredSourceCategories: string[];
  preferredAuthorityLevels: string[];
  relevantStatutes: string[];
  likelyRegulations: string[];
  likelyExtensionOrders: string[];
  likelyCaseLawCategories: string[];
  dateConstraints: { asOf: string | null; cutoff: string | null };
  jurisdictionFilters: string[];
  exclusionCriteria: string[];
  contradictionSearchPlanHe: string[];
  negativeAuthorityPlanHe: string[];
  missingInformationPlanHe: string[];
  stopConditionsHe: string[];
  completionCriteriaHe: string[];
  steps: ResearchPlanStep[];
  plannerVersion: string;
}

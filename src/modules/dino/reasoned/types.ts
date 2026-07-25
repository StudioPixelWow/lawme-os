/**
 * Reasoned Dino (Capability 4, Slice 4.1.0) — response contract + provider seam.
 * PURE types.
 *
 * The live path is: Conversation Engine → Matter Intelligence → Legal Research →
 * Legal Reasoning Engine → LegalOpinion → provider adapter → ReasonedDinoResponse.
 * The `LegalOpinion` is the EXCLUSIVE legal-reasoning authority; the provider
 * consumes only `ReasonedAnswerInput` (the opinion + presentation rules) and may
 * only convert it into excellent Hebrew.
 */
import type { LegalOpinion, ChallengeCategory, ChallengeDisposition, ConclusionDirection } from "../../legal-reasoning/types.ts";

/* -------- provider seam -------- */

export interface CitationPresentationRules {
  readonly requirePinpointForConclusion: boolean;
  readonly discoveryOnlyCannotSupport: boolean;
}

export interface ReasonedAnswerInput {
  readonly opinion: LegalOpinion;
  readonly locale: "he-IL";
  readonly conversationStyle: "professional_brief";
  readonly citationPresentationRules: CitationPresentationRules;
  /** Only for natural phrasing — never to re-derive reasoning. */
  readonly userMessage: string;
}

/** What a provider returns — prose sections + which opinion elements it used.
 *  It restates the conclusion status so we can verify it did not change it. */
export interface ReasonedProse {
  readonly bottomLineHe: string;
  readonly applicationToMatterHe: string;
  readonly governingLawHe: string;
  readonly caseLawHe: string;
  readonly opposingArgumentHe: string;
  readonly risksHe: string;
  readonly conclusionDirection: ConclusionDirection;   // must equal the opinion's
  readonly confidenceLevel: string;                    // must equal the opinion's
  readonly usedCitationIds: readonly string[];
  readonly providerId: string;
}

export interface ReasonedProvider {
  readonly id: string;
  readonly available: boolean;
  generate(input: ReasonedAnswerInput): Promise<ReasonedProse>;
}

/* -------- response contract -------- */

export type ReasonedStatus =
  | "answered" | "provisional" | "needs_facts" | "no_verified_authority"
  | "conflicting_authority" | "insufficient_coverage" | "out_of_scope";

export type CoverageLevel = "complete" | "substantial" | "partial" | "insufficient";
export type ContextKind = "matter" | "general";
export type ClaimKind = "established_law" | "analysis" | "inference" | "assumption" | "unresolved" | "withheld";

export interface CitationView {
  readonly recordId: string;
  readonly kind: "legislation" | "case_law";
  readonly citationHe: string;              // conventional formatting where metadata supports it
  readonly sectionHe: string | null;
  readonly verification: "verified" | "unverified" | "to_verify";
  readonly verificationLabelHe: string;     // מאומת / טעון אימות
  readonly authorityLabelHe: string;        // מחייב / מנחה
  readonly officialSource: boolean;
  readonly url: string | null;
  readonly pinpointHe: string | null;
  readonly pinpointStatusHe: string;        // honest pinpoint statement
  readonly usableForClaim: boolean;
}

export interface SupportedClaim {
  readonly claimId: string;
  readonly textHe: string;
  readonly kind: ClaimKind;
  readonly supportingCitationIds: readonly string[];
  readonly supported: boolean;
}

export interface FactView {
  readonly id: string;
  readonly labelHe: string;
  readonly statementHe: string;
  readonly effectHe: string;                // how it affects the analysis
}

export interface ElementFinding {
  readonly labelHe: string;
  readonly status: "satisfied" | "contested" | "missing";
  readonly statusLabelHe: string;
  readonly noteHe: string;
}

export interface OpposingArgumentView {
  readonly category: ChallengeCategory;
  readonly categoryLabelHe: string;
  readonly argumentHe: string;
  readonly disposition: ChallengeDisposition;
  readonly dispositionLabelHe: string;
  readonly effectHe: string;
}

export interface RiskView {
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly severityLabelHe: string;
  readonly statementHe: string;
  readonly basisHe: string;
}

export interface FollowUpView {
  readonly code: string;
  readonly questionHe: string;
  readonly whyHe: string;
}

export interface ResearchTraceSearch {
  readonly sourceKind: string;
  readonly available: boolean;
  readonly matchedCount: number;
  readonly notesHe: readonly string[];
}

export interface ResearchTrace {
  readonly domainHe: string;
  readonly concepts: readonly string[];
  readonly legislationSearches: readonly ResearchTraceSearch[];
  readonly caseLawSearches: readonly ResearchTraceSearch[];
  readonly filtersHe: readonly string[];
  readonly sourcesConsidered: number;
  readonly conflicts: readonly string[];
  readonly recommendedFollowUpsHe: readonly string[];
}

export interface ProviderMetadata {
  readonly id: string;
  readonly available: boolean;
  readonly renderMode: "model_phrased" | "deterministic_structured";
  readonly usedFallback: boolean;
  readonly rejectedProviderOutput: boolean;
  readonly labelHe: string;
}

export interface ReasonedConfidence {
  readonly level: "high" | "moderate" | "low" | "none";
  readonly labelHe: string;
  readonly score: number;
  readonly reasonsHe: readonly string[];
  readonly scaleHe: string;
}

export interface ReasonedCoverage {
  readonly level: CoverageLevel;
  readonly labelHe: string;
  readonly overall: number;
  readonly searchedHe: readonly string[];
  readonly uncoveredHe: readonly string[];
}

export interface ReasonedDinoResponse {
  readonly meta: { readonly version: string; readonly engine: string; readonly generatedAtISO: string };
  readonly status: ReasonedStatus;
  readonly contextKind: ContextKind;
  readonly matterId: string | null;
  readonly question: string;
  readonly bottomLine: { readonly statementHe: string; readonly direction: ConclusionDirection; readonly isProvisional: boolean; readonly statusLabelHe: string };
  readonly legalIssue: { readonly statementHe: string; readonly issueType: string; readonly procedureTitleHe: string | null };
  readonly applicationToMatter: {
    readonly hasMatter: boolean;
    readonly summaryHe: string;
    readonly established: readonly FactView[];
    readonly disputed: readonly FactView[];
    readonly alleged: readonly FactView[];
    readonly missing: readonly { readonly labelHe: string; readonly whyRequiredHe: string }[];
    readonly elementFindings: readonly ElementFinding[];
  };
  readonly governingLaw: {
    readonly legislation: readonly CitationView[];
    readonly hierarchyHe: string;
    readonly statutoryExceptionsHe: readonly string[];
    readonly elementsHe: readonly string[];
  };
  readonly caseLaw: {
    readonly binding: readonly CitationView[];
    readonly persuasive: readonly CitationView[];
    readonly contraryHe: readonly string[];
    readonly jurisprudenceHe: string;
  };
  readonly opposingArgument: readonly OpposingArgumentView[];
  readonly riskAssessment: { readonly legal: readonly RiskView[]; readonly practical: readonly RiskView[]; readonly assumptionsHe: readonly string[] };
  readonly uncertaintiesHe: readonly string[];
  readonly missingFacts: readonly FollowUpView[];
  readonly confidence: ReasonedConfidence;
  readonly coverage: ReasonedCoverage;
  readonly citations: { readonly verified: readonly CitationView[]; readonly discoveryOnly: readonly CitationView[] };
  readonly claims: readonly SupportedClaim[];
  readonly researchTrace: ResearchTrace;
  readonly suggestedFollowUps: readonly FollowUpView[];
  readonly provider: ProviderMetadata;
  readonly trustStatementsHe: readonly string[];
  readonly prose: {
    readonly bottomLineHe: string;
    readonly applicationToMatterHe: string;
    readonly governingLawHe: string;
    readonly caseLawHe: string;
    readonly opposingArgumentHe: string;
    readonly risksHe: string;
  };
}

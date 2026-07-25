/**
 * Legal Reasoning Engine (Capability 4, Slice 4.0.0) — types. PURE.
 *
 * The engine thinks like a senior lawyer BEFORE any language model runs. Given
 * MatterIntelligence + ConversationContext + LegalResearchResult it produces one
 * immutable, TRACEABLE `LegalOpinion`: element-by-element (IRAC) analysis, the
 * governing/binding vs persuasive authorities, conflicts, legal & practical
 * risks, assumptions, an ADVERSARIAL self-challenge, and a provisional
 * conclusion whose every statement references supporting authority — or is
 * explicitly listed as unsupported. It writes no prose and never concludes on
 * insufficient support. A provider consumes only this object.
 */
import type { MatterIntelligence, FactEpistemic } from "../matter/intelligence/types.ts";
import type { ConversationContext } from "../dino/conversation/types.ts";
import type {
  LegalResearchResult, BindingClass, VerificationStatus, ConflictKind, ConflictSeverity,
} from "../legal-research/types.ts";

export type IssueType = "substantive" | "procedural" | "mixed" | "unclear";
export type ElementStatus = "satisfied" | "contested" | "missing";
export type AuthorityKind = "legislation" | "case_law";
export type JurisprudenceState = "settled" | "divided" | "unsettled" | "undetermined";
export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type Materiality = "low" | "medium" | "high";
export type ChallengeCategory =
  | "contrary_authority" | "alternative_interpretation" | "procedural_obstacle"
  | "jurisdictional_limitation" | "statutory_exception" | "factual_weakness";
export type ChallengeDisposition = "accepted" | "rebutted" | "unresolved";
export type ConclusionDirection = "supports_position" | "against_position" | "indeterminate" | "cannot_conclude";
export type OpinionConfidenceLevel = "high" | "moderate" | "low" | "none";

export interface Issue {
  readonly questionHe: string;
  readonly issueStatementHe: string;
  readonly issueType: IssueType;
  readonly topic: string | null;
  readonly procedureType: string | null;
  readonly procedureTitleHe: string | null;
  readonly domainInScope: boolean;
}

export interface FactRef {
  readonly id: string;
  readonly factKey: string;
  readonly statementHe: string;
  readonly epistemic: FactEpistemic;
  readonly established: boolean;
  readonly sourceHe: string | null;
}

export interface MissingElement {
  readonly key: string;
  readonly labelHe: string;
  readonly whyRequiredHe: string;
}

export interface ElementAnalysis {
  readonly key: string;
  readonly labelHe: string;
  readonly status: ElementStatus;
  readonly factId: string | null;
  readonly epistemic: FactEpistemic | null;
  readonly authorityIds: readonly string[];
  readonly noteHe: string;
}

export interface AuthorityRef {
  readonly recordId: string;
  readonly kind: AuthorityKind;
  readonly citationHe: string;
  readonly sectionHe: string | null;
  readonly bindingClass: BindingClass;
  readonly verification: VerificationStatus;
  readonly usableForClaim: boolean;
  readonly url: string | null;
}

export interface ConflictRef {
  readonly kind: ConflictKind;
  readonly severity: ConflictSeverity;
  readonly descriptionHe: string;
  readonly recordIds: readonly string[];
}

export interface JurisprudenceAssessment {
  readonly state: JurisprudenceState;
  readonly reasonHe: string;
}

export interface LegalRisk {
  readonly code: string;
  readonly severity: RiskSeverity;
  readonly statementHe: string;
  readonly basisHe: string;
  readonly refs: readonly string[];
}

export interface Assumption {
  readonly code: string;
  readonly statementHe: string;
  readonly materiality: Materiality;
  readonly basisHe: string;
}

export interface RequiredClarification {
  readonly code: string;
  readonly questionHe: string;
  readonly whyHe: string;
  readonly blocking: boolean;
}

export interface Challenge {
  readonly category: ChallengeCategory;
  readonly argumentHe: string;
  readonly basisRefs: readonly string[];   // authority recordIds or fact keys
  readonly disposition: ChallengeDisposition;
  readonly effectHe: string;
}

export interface UnsupportedStatement {
  readonly statementHe: string;
  readonly reasonHe: string;
}

export interface PreliminaryConclusion {
  readonly direction: ConclusionDirection;
  readonly statementHe: string;
  readonly isProvisional: boolean;
  readonly reasoningHe: readonly string[];       // element-by-element chain
  readonly supportingAuthorityIds: readonly string[];
}

export interface OpinionConfidence {
  readonly level: OpinionConfidenceLevel;
  readonly score: number;                        // 0..1
  readonly factorsHe: readonly string[];
  readonly scaleHe: string;                      // what the level means
}

export interface SupportMapping {
  readonly claim: string;
  readonly authorityIds: readonly string[];
  readonly supported: boolean;
}

export interface Answerability {
  readonly canAnswerNow: boolean;
  readonly reasonHe: string;
}

export interface LegalOpinionMeta {
  readonly version: string;
  readonly engine: string;
  readonly generatedAtISO: string;
}

/** The canonical legal-reasoning object. Every provider consumes ONLY this. */
export interface LegalOpinion {
  readonly meta: LegalOpinionMeta;
  readonly issue: Issue;                                    // 1
  readonly relevantFacts: readonly FactRef[];               // 2
  readonly establishedFacts: readonly FactRef[];            // 3
  readonly allegedFacts: readonly FactRef[];                // 4
  readonly disputedFacts: readonly FactRef[];               // 4
  readonly missingFacts: readonly MissingElement[];         // 5
  readonly elements: readonly ElementAnalysis[];            // IRAC element map
  readonly applicableLegislation: readonly AuthorityRef[];  // 6
  readonly applicableCaseLaw: readonly AuthorityRef[];      // 6
  readonly conflictingAuthorities: readonly ConflictRef[];  // 7
  readonly bindingAuthorities: readonly AuthorityRef[];     // 8
  readonly persuasiveAuthorities: readonly AuthorityRef[];  // 9
  readonly authorityHierarchyHe: string;                    // 10
  readonly jurisprudence: JurisprudenceAssessment;          // 11, 12
  readonly requiredClarifications: readonly RequiredClarification[]; // 13
  readonly answerability: Answerability;                    // 14
  readonly legalRisks: readonly LegalRisk[];                // 15
  readonly practicalRisks: readonly LegalRisk[];            // 16
  readonly assumptions: readonly Assumption[];              // 17
  readonly challenges: readonly Challenge[];                // adversarial self-challenge
  readonly preliminaryConclusion: PreliminaryConclusion;    // 18
  readonly confidence: OpinionConfidence;                   // 19
  readonly supportingAuthorities: readonly SupportMapping[]; // 20
  readonly unsupportedStatements: readonly UnsupportedStatement[];
}

export interface LegalReasoningInput {
  readonly matterIntelligence: MatterIntelligence | null;
  readonly conversationContext: ConversationContext;
  readonly legalResearch: LegalResearchResult;
  readonly nowISO?: string;
}

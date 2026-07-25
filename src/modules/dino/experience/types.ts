/**
 * Dino Experience (Capability 3, Slice 3.2.0) — types. PURE.
 *
 * The first usable Dino experience connects the existing foundations —
 * Matter Intelligence + Conversation Engine + Legal Research Orchestrator —
 * and exposes them to the lawyer through ONE grounded response. Grounding is
 * decided DETERMINISTICALLY by LawME's verified research; a provider adapter
 * (Anthropic) only writes the prose (summary + analysis) over the already-
 * verified sources, and may never query legal sources itself.
 */
import type { ConversationContext } from "../conversation/types.ts";
import type { MatterIntelligence } from "../../matter/intelligence/types.ts";
import type {
  LegalResearchResult, AuthorityLevel, BindingClass, VerificationStatus,
  ConflictKind, ConflictSeverity, SourceKind, ConfidenceLevel,
} from "../../legal-research/types.ts";

export type DinoContextKind = "matter" | "page" | "general";

export type DinoResponseMode =
  | "answered"                // grounded answer with verified support
  | "no_verified_authority"   // research ran but no verified/usable source
  | "needs_facts"             // more facts required before answering
  | "out_of_scope"            // outside the supported legal domains
  | "error";

/* -------- the 8 response sections -------- */

export interface LegislationRef {
  readonly recordId: string;
  readonly citationHe: string;
  readonly sectionHe: string | null;
  readonly url: string | null;
  readonly binding: boolean;
  readonly verification: VerificationStatus;
}

export interface CaseRef {
  readonly recordId: string;
  readonly citationHe: string;
  readonly court: string | null;
  readonly dateISO: string | null;
  readonly authorityLevel: AuthorityLevel;
  readonly bindingClass: BindingClass;
  readonly url: string | null;
  readonly verification: VerificationStatus;
  readonly usableForClaim: boolean;
  readonly caveatHe: string | null;
}

export interface ConflictRef {
  readonly kind: ConflictKind;
  readonly severity: ConflictSeverity;
  readonly descriptionHe: string;
  readonly recordIds: readonly string[];
}

export interface ConfidenceView {
  readonly level: ConfidenceLevel;
  readonly score: number;
  readonly labelHe: string;
  readonly reasonsHe: readonly string[];
}

export interface SourceRef {
  readonly recordId: string;
  readonly sourceKind: SourceKind;
  readonly citationHe: string;
  readonly url: string | null;
  readonly verification: VerificationStatus;
  readonly publisherHe: string | null;
}

export interface FollowUpQuestion {
  readonly code: string;
  readonly questionHe: string;
  readonly reasonHe: string;
}

export interface GroundedResponseMeta {
  readonly version: string;
  readonly engine: string;
  readonly generatedAtISO: string;
  readonly proseProvider: string;    // "anthropic" | "deterministic" | "none"
}

/** The one grounded response the lawyer sees. */
export interface GroundedResponse {
  readonly meta: GroundedResponseMeta;
  readonly mode: DinoResponseMode;
  readonly grounded: boolean;
  readonly contextKind: DinoContextKind;
  readonly matterId: string | null;
  readonly question: string;
  readonly executiveSummaryHe: string;               // 1
  readonly legalAnalysisHe: string;                  // 2
  readonly legislation: readonly LegislationRef[];   // 3
  readonly caseLaw: readonly CaseRef[];              // 4
  readonly conflicts: readonly ConflictRef[];        // 5
  readonly confidence: ConfidenceView;               // 6
  readonly sources: readonly SourceRef[];            // 7
  readonly followUpQuestions: readonly FollowUpQuestion[]; // 8
  readonly noticeHe: string | null;
}

/* -------- provider adapter seam -------- */

export interface ProviderInput {
  readonly conversationContext: ConversationContext;
  readonly matterIntelligence: MatterIntelligence | null;
  readonly legalResearchResult: LegalResearchResult;
}

export interface ProviderProse {
  readonly executiveSummaryHe: string;
  readonly legalAnalysisHe: string;
  readonly usedRecordIds: readonly string[];
  readonly providerId: string;
}

export interface DinoProvider {
  readonly id: string;
  readonly available: boolean;
  generate(input: ProviderInput): Promise<ProviderProse>;
}

/* -------- pipeline I/O -------- */

export interface DinoTurnInput {
  readonly question: string;
  readonly matterIntelligence: MatterIntelligence | null;
  readonly contextKind: DinoContextKind;
  readonly matterId: string | null;
  readonly history?: readonly { readonly role: "user" | "assistant"; readonly content: string }[];
  readonly nowISO?: string;
}

export interface DinoDeps {
  readonly provider: DinoProvider;          // primary (e.g. Anthropic)
  readonly fallbackProvider: DinoProvider;  // deterministic prose when provider is absent/fails
}

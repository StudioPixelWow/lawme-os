/**
 * Legal Research Orchestrator — types (Capability 3, Slice 3.1.0). PURE.
 *
 * LawME owns the legal investigation BEFORE any model is involved. This layer
 * decides what to search, where, in what order, how to rank sources, how to
 * detect conflicts and how to score confidence — WITHOUT an LLM. It never writes
 * legal conclusions; it produces a verified, immutable `LegalResearchResult`.
 *
 * The provider architecture is adapter-based: no database is hardcoded. Each
 * knowledge source implements `KnowledgeSourceAdapter` and normalizes its native
 * records into the one `CanonicalSource` shape.
 */

/** The pluggable knowledge-source kinds. Initial: legislation + case_law. */
export type SourceKind =
  | "legislation" | "case_law" | "regulation" | "ministry_guidance"
  | "internal_knowledge" | "office_precedent" | "legal_article"
  | "contract" | "uploaded_document";

/** Normalized authority level across every source kind. */
export type AuthorityLevel =
  | "legislation" | "supreme" | "national_labor" | "regional"
  | "guidance" | "secondary" | "unknown";

export type BindingClass = "binding" | "persuasive" | "informative";
export type VerificationStatus = "verified" | "unverified" | "to_verify";
export type SourceStatus = "current" | "historical" | "repealed" | "overruled" | "limited" | "unknown";
export type AuthorityPreference = "binding_first" | "recent_first" | "balanced";

/* ------------------------------------------------------------ domain + entities */

export type LegalDomainKey = "labor" | "unknown";

export interface LegalDomainClassification {
  readonly domain: LegalDomainKey;
  readonly labelHe: string;
  readonly confidence: number;         // 0..1
  readonly matchedTerms: readonly string[];
  readonly inScope: boolean;           // is this domain covered by the corpus?
  readonly reasonHe: string;
}

export interface ExtractedEntities {
  readonly laws: readonly string[];
  readonly sections: readonly string[];
  readonly courts: readonly string[];
  readonly judges: readonly string[];
  readonly parties: readonly string[];
  readonly dates: readonly string[];
  readonly concepts: readonly string[];   // canonical vocabulary terms
  readonly topics: readonly string[];      // resolved topic keys
}

/* ------------------------------------------------------------ search plans */

export interface SearchFilters {
  readonly authorityPreference: AuthorityPreference;
  readonly courtLevels: readonly string[];
  readonly dateFromISO: string | null;
  readonly dateToISO: string | null;
  readonly onlyVerified: boolean;
}

export interface SearchPlan {
  readonly id: string;
  readonly sourceId: string;
  readonly sourceKind: SourceKind;
  readonly queryTerms: readonly string[];
  readonly topics: readonly string[];
  readonly sections: readonly string[];
  readonly refIds: readonly string[];
  readonly filters: SearchFilters;
  readonly rationaleHe: string;
}

/* ------------------------------------------------------------ canonical source */

export interface CanonicalSource {
  readonly sourceId: string;           // adapter id
  readonly sourceKind: SourceKind;
  readonly recordId: string;           // refId or case id (dedup key with sourceKind)
  readonly citationHe: string;
  readonly titleHe: string;
  readonly authorityLevel: AuthorityLevel;
  readonly bindingClass: BindingClass;
  readonly court: string | null;
  readonly dateISO: string | null;
  readonly sectionHe: string | null;
  readonly url: string | null;
  readonly verification: VerificationStatus;
  readonly usableForClaim: boolean;
  readonly status: SourceStatus;
  readonly topics: readonly string[];
  readonly matchedTerms: readonly string[];
  readonly citationFrequency: number;  // proxy: later-treatment / related count
  readonly publisherHe: string | null;
  readonly provenanceHe: string;
  readonly limitationsHe: readonly string[];
}

/** The result the adapter returns — normalization is the adapter's responsibility. */
export interface AdapterSearchResult {
  readonly sourceId: string;
  readonly sourceKind: SourceKind;
  readonly matchedCount: number;       // raw matches before capping
  readonly sources: readonly CanonicalSource[];
  readonly notesHe: readonly string[];
}

export interface KnowledgeSourceAdapter {
  readonly id: string;
  readonly kind: SourceKind;
  readonly labelHe: string;
  readonly available: boolean;
  search(plan: SearchPlan): Promise<AdapterSearchResult>;
}

/* ------------------------------------------------------------ ranking */

export interface RankSignals {
  readonly authority: number;
  readonly binding: number;
  readonly official: number;
  readonly verification: number;
  readonly sectionMatch: number;
  readonly recency: number;
  readonly citationFrequency: number;
  readonly relevance: number;
}

export interface RankedSource {
  readonly rank: number;               // 1-based
  readonly recordId: string;
  readonly sourceKind: SourceKind;
  readonly citationHe: string;
  readonly score: number;              // 0..1
  readonly signals: RankSignals;
}

/* ------------------------------------------------------------ conflicts */

export type ConflictKind = "duplicate_authority" | "conflicting_ruling" | "overruled_precedent" | "obsolete_legislation";
export type ConflictSeverity = "info" | "warning" | "critical";

export interface Conflict {
  readonly kind: ConflictKind;
  readonly severity: ConflictSeverity;
  readonly descriptionHe: string;
  readonly recordIds: readonly string[];
}

/* ------------------------------------------------------------ confidence + coverage */

export type ConfidenceLevel = "high" | "moderate" | "low" | "none";

export interface ResearchConfidence {
  readonly level: ConfidenceLevel;
  readonly score: number;              // 0..1
  readonly reasonsHe: readonly string[];
}

export interface PillarCoverage {
  readonly available: boolean;
  readonly found: number;
  readonly usable: number;
  readonly gapsHe: readonly string[];
}

export interface ResearchCoverage {
  readonly primaryTopic: string | null;
  readonly legislation: PillarCoverage;
  readonly caseLaw: PillarCoverage;
  readonly procedure: PillarCoverage;
  readonly triadState: string;
  readonly overall: number;            // 0..1
  readonly noticeHe: string;
}

export interface MissingInformation {
  readonly code: string;
  readonly labelHe: string;
  readonly detailHe: string;
}

export interface RecommendedFollowUp {
  readonly code: string;
  readonly sourceKind: SourceKind;
  readonly queryHe: string;
  readonly reasonHe: string;
}

export interface VerifiedCitation {
  readonly recordId: string;
  readonly citationHe: string;
  readonly url: string | null;
  readonly authorityLevel: AuthorityLevel;
  readonly sectionHe: string | null;
}

export interface SourceMetadata {
  readonly sourceId: string;
  readonly recordId: string;
  readonly sourceKind: SourceKind;
  readonly verification: VerificationStatus;
  readonly url: string | null;
  readonly publisherHe: string | null;
  readonly provenanceHe: string;
}

export interface ExecutedSearch {
  readonly plan: SearchPlan;
  readonly sourceId: string;
  readonly sourceKind: SourceKind;
  readonly available: boolean;
  readonly matchedCount: number;
  readonly normalizedCount: number;
  readonly notesHe: readonly string[];
}

/* ------------------------------------------------------------ request + result */

export interface LegalResearchRequest {
  readonly question: string;
  readonly legalDomainHint?: string | null;
  readonly procedureType?: string | null;
  readonly topics?: readonly string[];
  readonly asOfISO?: string;
  readonly factsConfirmed?: boolean;
  readonly authorityPreference?: AuthorityPreference;
}

export interface LegalResearchMeta {
  readonly version: string;
  readonly engine: string;
  readonly generatedAtISO: string;
}

/** The one immutable, verified research object. It NEVER contains a legal
 *  conclusion — only prepared, ranked, conflict-checked sources. */
export interface LegalResearchResult {
  readonly meta: LegalResearchMeta;
  readonly question: string;
  readonly domain: LegalDomainClassification;
  readonly entities: ExtractedEntities;
  readonly executedSearches: readonly ExecutedSearch[];
  readonly matchedLegislation: readonly CanonicalSource[];
  readonly matchedCases: readonly CanonicalSource[];
  readonly ranking: readonly RankedSource[];
  readonly conflicts: readonly Conflict[];
  readonly confidence: ResearchConfidence;
  readonly coverage: ResearchCoverage;
  readonly missingInformation: readonly MissingInformation[];
  readonly recommendedFollowUps: readonly RecommendedFollowUp[];
  readonly verifiedCitations: readonly VerifiedCitation[];
  readonly sourceMetadata: readonly SourceMetadata[];
}

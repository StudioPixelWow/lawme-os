/**
 * MatterIntelligence — the canonical Matter read model (Capability 2, Slice 2.1.0).
 *
 * ONE immutable, deterministic structure representing the entire Matter and the
 * intelligence derived from it WITHOUT any AI: no LLM, no embeddings, no vector
 * search. Every future capability (Dino, Legal AI, hearing prep, draft
 * generation, timeline reasoning, missing-information detection) consumes ONLY
 * this object — never the raw tables again.
 *
 * Pure types. No React, no Supabase, no design-system imports.
 */

export type FactEpistemic = "established" | "alleged" | "disputed" | "unknown";
export type DeadlineBucket = "overdue" | "upcoming" | "unscheduled";
export type MatterHealthStatus = "healthy" | "attention" | "at_risk" | "critical" | "dormant";
export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type PriorityLevel = "urgent" | "high" | "normal";
export type IssueSeverity = "info" | "warning" | "critical";

/* ------------------------------------------------------------------ entities */

export interface MatterIdentity {
  readonly matterId: string;      // canonical uuid
  readonly slug: string;
  readonly titleHe: string;
  readonly fileNoHe: string | null;
  readonly forumHe: string | null;
  readonly legalDomain: string;
  readonly procedureType: string;
  readonly procedureLabelHe: string;
  readonly topic: string;
  readonly status: string;        // open | closed | archived
  readonly confidentiality: string | null;
  readonly openedAtISO: string;
}

export interface MatterStage {
  readonly currentStageId: string;
  readonly stageLabelHe: string;
}

export interface MatterClientInfo {
  readonly present: boolean;
  readonly nameHe: string | null;       // null = unknown (never fabricated)
  readonly participantId: string | null;
  readonly contactId: string | null;
}

export interface ResponsibleLawyerInfo {
  readonly present: boolean;
  readonly nameHe: string | null;
}

export interface PartyRecord {
  readonly id: string;
  readonly role: string;
  readonly nameHe: string | null;
  readonly kind: string | null;         // person | company
  readonly contactId: string | null;
  readonly idNumberHe: string | null;
}

export interface FactRecord {
  readonly id: string;
  readonly factKey: string;
  readonly statementHe: string;
  readonly status: string;
  readonly epistemic: FactEpistemic;
  readonly established: boolean;         // an allegation is never established
  readonly sourceHe: string | null;
}

export interface DocumentRecord {
  readonly id: string;
  readonly titleHe: string;
  readonly documentType: string;
  readonly evidenceType: string;
  readonly approvalState: string;
  readonly approved: boolean;
  readonly dateISO: string | null;
  readonly createdAtISO: string;
}

export interface EvidenceRecord {
  readonly id: string;
  readonly labelHe: string;
  readonly evidenceType: string;
  readonly mandatory: boolean;
  readonly status: string;
  readonly collected: boolean;
}

export interface DeadlineRecord {
  readonly id: string;
  readonly labelHe: string;
  readonly dueAtISO: string | null;
  readonly strict: boolean;
  readonly basisHe: string | null;
  readonly source: string;
  readonly confidence: string;
  readonly bucket: DeadlineBucket;
  readonly daysRemaining: number | null;    // signed Jerusalem-day delta; null = unscheduled
}

export interface TimelineRecord {
  readonly id: string;
  readonly occurredAtISO: string;
  readonly kind: string;
  readonly descriptionHe: string;
  readonly actorHe: string | null;
}

/* ---------------------------------------------------------------- aggregates */

export interface MatterRelationships {
  readonly participantRoleCounts: Readonly<Record<string, number>>;
  readonly rolesPresent: readonly string[];
  readonly hasClient: boolean;
  readonly hasOpposingParty: boolean;
  readonly factsWithSource: number;
  readonly factsWithoutSource: number;
}

export interface MatterCounts {
  readonly facts: number;
  readonly establishedFacts: number;
  readonly allegedFacts: number;
  readonly disputedFacts: number;
  readonly unknownFacts: number;
  readonly participants: number;
  readonly documents: number;
  readonly approvedDocuments: number;
  readonly evidence: number;
  readonly mandatoryEvidence: number;
  readonly collectedMandatoryEvidence: number;
  readonly missingMandatoryEvidence: number;
  readonly deadlines: number;
  readonly overdueDeadlines: number;
  readonly upcomingDeadlines: number;
  readonly unscheduledDeadlines: number;
  readonly timelineEvents: number;
}

export interface MatterTiming {
  readonly openedAtISO: string;
  readonly ageDays: number;
  readonly lastActivityISO: string | null;
  readonly daysSinceLastActivity: number | null;
  readonly recentActivity: boolean;
  readonly dormant: boolean;
  readonly timelineDensityPer30d: number;
  readonly nearestDeadlineISO: string | null;
  readonly nearestDeadlineDays: number | null;
}

export interface MatterCompleteness {
  readonly hasClient: boolean;
  readonly hasResponsibleLawyer: boolean;
  readonly hasParticipants: boolean;
  readonly hasOpposingParty: boolean;
  readonly hasFacts: boolean;
  readonly hasEstablishedFacts: boolean;
  readonly hasDocuments: boolean;
  readonly hasEvidence: boolean;
  readonly hasDeadlines: boolean;
  readonly missingMandatoryEvidence: boolean;
  readonly score: number;               // 0..100
}

export interface OutstandingIssue {
  readonly code: string;
  readonly severity: IssueSeverity;
  readonly labelHe: string;
  readonly detailHe: string | null;
  readonly relatedIds: readonly string[];
}

export interface KnownUnknown {
  readonly code: string;
  readonly labelHe: string;
  readonly questionHe: string;          // the open question a human/AI should resolve
  readonly blocking: boolean;
}

export interface MatterHealth {
  readonly status: MatterHealthStatus;
  readonly labelHe: string;
  readonly riskLevel: RiskLevel;
  readonly reasons: readonly string[];  // contributing issue codes
}

export interface MatterScores {
  readonly completeness: number;        // 0..100
  readonly attention: number;           // 0..100 — how much a human is needed now
  readonly risk: RiskLevel;
  readonly priority: PriorityLevel;
}

export interface MatterIntelligenceMeta {
  readonly version: string;             // schema version, e.g. "matter-intelligence-v1"
  readonly engine: string;
  readonly generatedAtISO: string;      // = the reference "now" the model was derived at
}

/** The one canonical Matter read model. */
export interface MatterIntelligence {
  readonly meta: MatterIntelligenceMeta;
  readonly identity: MatterIdentity;
  readonly stage: MatterStage;
  readonly client: MatterClientInfo;
  readonly responsibleLawyer: ResponsibleLawyerInfo;
  readonly participants: readonly PartyRecord[];
  readonly facts: readonly FactRecord[];
  readonly documents: readonly DocumentRecord[];
  readonly evidence: readonly EvidenceRecord[];
  readonly deadlines: readonly DeadlineRecord[];
  readonly timeline: readonly TimelineRecord[];       // newest first
  readonly relationships: MatterRelationships;
  readonly counts: MatterCounts;
  readonly timing: MatterTiming;
  readonly completeness: MatterCompleteness;
  readonly health: MatterHealth;
  readonly scores: MatterScores;
  readonly outstandingIssues: readonly OutstandingIssue[];
  readonly knownUnknowns: readonly KnownUnknown[];
}

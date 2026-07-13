/**
 * Matter Intelligence Engine — core types (Epic 4).
 * A Matter is a LIVING object, not a folder: it continuously understands
 * its own legal/procedural/factual/document/evidence/financial/team state
 * and computes what is happening, what is missing, and what to do next.
 * Every engine emits STRUCTURED output — never free text alone.
 */
import type { EmploymentProcedureType } from "../legal-knowledge/procedure/types.ts";
import type { AiPolicy, Confidentiality, Severity, EngineStatus } from "../intelligence/core/index.ts";

// Re-export shared primitives so existing `../types.ts` consumers keep working.
export type { Severity, EngineStatus } from "../intelligence/core/index.ts";

export type MatterStageKind =
  | "intake" | "assessment" | "pre_litigation" | "filing" | "interim"
  | "pleadings" | "disclosure" | "hearing" | "summations" | "judgment"
  | "remedy" | "enforcement" | "appeal" | "closed";

/**
 * epistemic status of a fact — allegations are never facts.
 * Legacy Matter values; maps to the canonical `EpistemicStatus` in
 * intelligence/core via `fromMatterFactStatus` (tested; no allegation ever
 * becomes a confirmed fact).
 */
export type FactStatus = "confirmed" | "client_alleged" | "opposing_alleged" | "document_derived" | "disputed" | "unknown";

export interface MatterFact {
  field: string;
  statementHe: string;
  status: FactStatus;
  source: string;
}

export interface MatterDocument {
  id: string;
  kindHe: string;
  present: boolean;
  requiredForStage: MatterStageKind | null;
}

export interface MatterEvidenceItem {
  id: string;
  labelHe: string;
  evidenceType: "document" | "testimony" | "record" | "communication" | "expert" | "physical";
  collected: boolean;
  mandatory: boolean;
}

export interface MatterDeadline {
  id: string;
  labelHe: string;
  dueDate: string | null;        // ISO; null = unknown/not-yet-set
  strict: boolean;               // missing it bars the step/claim
  basisHe: string;
}

export interface MatterCommunication {
  id: string;
  at: string;                    // ISO
  direction: "inbound" | "outbound";
  channel: "email" | "phone" | "meeting" | "letter" | "other";
  awaitingResponse: boolean;
  summaryHe: string;
}

export interface MatterFinancials {
  feeArrangementHe: string | null;
  billedAmount: number | null;
  collectedAmount: number | null;
  outstandingAmount: number | null;
  currency: "ILS";
  writeOffRiskHe: string | null;
}

export interface MatterTeamMember {
  id: string;
  role: "partner" | "senior_lawyer" | "lawyer" | "intern" | "paralegal";
  nameHe: string;
  openTasks: number;
  capacityLoad: number;          // 0..1
}

export interface MatterClient {
  id: string;
  nameHe: string;
  responsiveness: "responsive" | "slow" | "unreachable" | "unknown";
  aiPolicy: AiPolicy;
  confidentiality: Confidentiality;
  lastContactAt: string | null;
}

/** The living Matter object. */
export interface Matter {
  id: string;
  titleHe: string;
  legalDomain: "labor";
  /** the procedure type this matter follows (maps to the procedure graph) */
  procedureType: EmploymentProcedureType;
  /** the topic/subdomain, used to bridge to triad legal intelligence */
  topic: string;
  currentStageId: string;        // stage id within the procedure graph
  openedAt: string;              // ISO
  client: MatterClient;
  facts: MatterFact[];
  documents: MatterDocument[];
  evidence: MatterEvidenceItem[];
  deadlines: MatterDeadline[];
  communications: MatterCommunication[];
  financials: MatterFinancials;
  team: MatterTeamMember[];
  /** legislation refIds available in the corpus for this matter's topic */
  availableLegislationRefIds: string[];
  /** the "now" reference date (ISO) — passed in for deterministic engines */
  asOf: string;
}

/* ------------------------------------------------------------------ */
/* Shared engine framework — every engine emits a typed assessment     */
/* ------------------------------------------------------------------ */

export interface Finding {
  code: string;
  severity: Severity;
  messageHe: string;
  /** which of the seven matter questions this bears on */
  dimension: "what_is_happening" | "what_is_missing" | "what_next" | "who" | "when" | "why" | "blocking";
}

export interface RecommendedAction {
  id: string;
  labelHe: string;
  ownerRole: MatterTeamMember["role"] | "client";
  dueHint: string | null;
  whyHe: string;
  requiresHumanApproval: boolean;
  priority: Severity;
}

/** Base shape every engine returns — structured, never free-text-only. */
export interface EngineAssessment {
  engine: string;
  engineVersion: string;
  status: EngineStatus;
  /** 0..1 deterministic; decomposed by each engine */
  score: number | null;
  findings: Finding[];
  actions: RecommendedAction[];
  /** engine-specific structured payload */
  data: Record<string, unknown>;
  confidence: number;            // 0..1
  requiresHumanReview: boolean;
}

export interface MatterEngine<TExtra = unknown> {
  readonly name: string;
  readonly version: string;
  assess(matter: Matter, extra?: TExtra): EngineAssessment;
}

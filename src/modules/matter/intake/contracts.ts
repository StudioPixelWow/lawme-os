/**
 * Capability 2 · Slice 2A — Intelligent Matter Intake: canonical typed contracts.
 *
 * THE SAFETY SPINE. Natural-language (or pasted) input is turned into a
 * REVIEWABLE MatterIntakeDraft — never directly into confirmed facts, binding
 * deadlines, legal conclusions, or a Matter. Every extracted item carries its
 * value, how it was extracted, its epistemic status, a confidence band, the
 * exact source span it came from, provenance, and whether a human must confirm
 * it before anything is persisted.
 *
 * The draft writes to the SAME canonical Slice 2 domain contracts as the future
 * manual intake: Contact, Matter Participant, Fact, Deadline, Evidence
 * Requirement (see docs/domain/LAWME_DOMAIN_GLOSSARY.md). Intelligent Intake may
 * only ever propose the UNESTABLISHED epistemic states; the two established
 * states are unreachable here by construction (see IntakeFactStatus).
 */

import type { EmploymentProcedureType } from "../../legal-knowledge/procedure/types.ts";

export const MATTER_INTAKE_CONTRACT_VERSION = "matter-intake-contract-1.0.0";

/* ------------------------------------------------------------------ */
/* Shared extraction envelope — every extracted item is wrapped.       */
/* ------------------------------------------------------------------ */

/** A character range into the (sanitized) source text — traceability. */
export interface SourceSpan {
  /** Which input the span indexes into. */
  source: "story" | "pasted";
  /** Inclusive start, exclusive end — indexes into the sanitized text. */
  start: number;
  end: number;
  /** The exact substring, preserved for display + audit. */
  quoteHe: string;
}

/** How an item made it into the draft. Never "confirmed" — that is human-only. */
export type ExtractionMethod =
  | "lexical_rule" // matched a controlled Hebrew lexical rule
  | "pattern" // matched a structural pattern (date, quote, role word)
  | "engine" // produced by an existing deterministic engine (domain/triad/procedure)
  | "derived"; // derived from other extracted items (e.g. a gap)

export type ExtractionStatus = "extracted" | "inferred" | "ambiguous" | "missing";

/** Decomposed confidence for a single extracted item (0..1). */
export interface ItemConfidence {
  score: number; // 0..1
  band: "high" | "moderate" | "low" | "very_low";
  reasonHe: string;
}

export interface ItemProvenance {
  method: ExtractionMethod;
  ruleId: string; // the exact rule/engine that produced it — auditable
  engine?: string; // present when method === "engine"
  extractedAt: string; // ISO; injected (deterministic) — never Date.now in-module
}

/** The envelope wrapping every extracted value. */
export interface Extracted<T> {
  id: string;
  value: T;
  extractionStatus: ExtractionStatus;
  confidence: ItemConfidence;
  span: SourceSpan | null; // null only for "missing"/"derived" items
  provenance: ItemProvenance;
  needsConfirmation: boolean; // ALWAYS true in this slice — nothing is auto-true
  missingInformation: boolean;
  requiresHumanReview: boolean;
  notesHe?: string;
}

/* ------------------------------------------------------------------ */
/* Epistemic states intake may propose — the two established states     */
/* (confirmed / document_derived) are intentionally ABSENT.             */
/* ------------------------------------------------------------------ */

export type IntakeFactStatus = "client_alleged" | "opposing_alleged" | "disputed" | "unknown";

export const INTAKE_FACT_STATUSES: readonly IntakeFactStatus[] = [
  "client_alleged",
  "opposing_alleged",
  "disputed",
  "unknown",
] as const;

/** Compile-time + runtime guard: never let an established status leak in. */
export function isIntakeFactStatus(s: string): s is IntakeFactStatus {
  return (INTAKE_FACT_STATUSES as readonly string[]).includes(s);
}

/* ------------------------------------------------------------------ */
/* Draft sub-contracts.                                                 */
/* ------------------------------------------------------------------ */

export type ContactKindGuess = "person" | "organization" | "unknown";

/** Approved participant roles — mirrors the Slice 2 matter_participants enum. */
export type ParticipantRole =
  | "client"
  | "opposing_party"
  | "related_party"
  | "witness"
  | "expert"
  | "counsel"
  | "mediator"
  | "insurer";

export const PARTICIPANT_ROLES: readonly ParticipantRole[] = [
  "client",
  "opposing_party",
  "related_party",
  "witness",
  "expert",
  "counsel",
  "mediator",
  "insurer",
] as const;

export interface ContactDraft {
  displayNameHe: string;
  kind: ContactKindGuess;
  suggestedRole: ParticipantRole | null;
  /** possible existing contact this might be — NEVER auto-merged. */
  duplicatePossibility: boolean;
}

export interface FactDraft {
  factKey: string; // machine slot (e.g. "employment_duration")
  statementHe: string;
  suggestedStatus: IntakeFactStatus;
  speakerHe: string; // who asserted it (client / opposing / unknown)
  relevantLegalIssueId?: string | null;
  supportingItemIds: string[];
  conflictingItemIds: string[];
}

export type DateKind =
  | "event_date"
  | "hearing_date"
  | "deadline"
  | "estimated_prep_date"
  | "unknown_ambiguous";

export type DeadlineSource = "statute" | "court_order" | "contract" | "estimated" | "user_supplied";
export type DeadlineConfidence = "known" | "estimated" | "unknown";

export interface DeadlineDraft {
  labelHe: string;
  kind: DateKind;
  dueAt: string | null; // null when unknown/ambiguous — NEVER invented
  timezone: string; // Asia/Jerusalem
  sourceType: DeadlineSource;
  deadlineConfidence: DeadlineConfidence;
  basisHe?: string | null;
  strict: boolean;
  ambiguityWarningHe?: string | null;
}

export type MentionedDocState = "mentioned" | "reportedly_held" | "reportedly_missing";

export interface MentionedDocumentDraft {
  labelHe: string;
  state: MentionedDocState;
  authenticityConcern: boolean;
  /** A mention is NOT an uploaded Document — this stays a draft signal only. */
}

export interface EvidenceRequirementDraft {
  labelHe: string;
  provesFactKey?: string | null;
  mandatory: boolean;
  /** derived from a proof gap — satisfaction is never assumed from a mention. */
}

export interface PreliminaryLegalIssueDraft {
  issueId: string;
  questionHe: string;
  affects: Array<"domain" | "claim_viability" | "applicable_law" | "deadline" | "forum" | "procedure">;
}

export interface ClarificationQuestion {
  questionId: string;
  questionHe: string;
  whyItMattersHe: string;
  expectedAnswerHe: string; // what kind of answer is expected
  skippable: boolean;
  ifSkippedHe: string; // what stays uncertain if skipped
  affects: PreliminaryLegalIssueDraft["affects"][number];
  priority: number; // 1 = most critical
}

export interface ContradictionFinding {
  contradictionId: string;
  aboutHe: string;
  itemIds: string[]; // the extracted items in tension
  severity: "low" | "moderate" | "high";
}

/** Preliminary, non-final legal coverage — reuses the deterministic brain. */
export interface LegalCoverageAssessment {
  detectedDomain: string; // e.g. "employment" | "out_of_domain"
  domainWithinScope: boolean;
  governingLegislationRefIds: string[];
  procedureType: EmploymentProcedureType | null;
  caseLawCoverageHe: string; // honest description; NEVER a fabricated citation
  missingPrimarySourceRefsHe: string[];
  coverageState: string; // Triad state
  coverageStrength: "sufficient" | "partial" | "insufficient";
  canProducePreliminaryView: boolean;
  specialistReviewRequired: boolean;
  limitationsHe: string[];
}

export interface MissingSource {
  refIdOrLabelHe: string;
  whyNeededHe: string;
}

/** Decomposed, non-outcome confidence for the whole draft. */
export interface IntakeConfidenceReport {
  band: "high" | "moderate" | "low" | "insufficient_evidence" | "human_review_required";
  overallScore: number; // 0..1
  factorsHe: string[];
  blockingUncertaintyHe: string[];
  requiresHumanReview: boolean;
}

export interface IntakeReviewRoute {
  primaryTarget:
    | "lawyer_review"
    | "senior_lawyer_review"
    | "partner_review"
    | "specialist_review"
    | "do_not_proceed";
  targets: string[];
  reasonsHe: string[];
  blocking: boolean;
}

export interface DraftProvenanceEntry {
  stage: string;
  ruleOrEngine: string;
  atISO: string;
}

export type IntakeDraftStatus =
  | "analyzing"
  | "needs_clarification"
  | "ready_for_review"
  | "confirmed"
  | "rejected";

/* ------------------------------------------------------------------ */
/* THE draft.                                                           */
/* ------------------------------------------------------------------ */

export interface MatterIntakeDraft {
  draftId: string;
  organizationId: string;
  createdBy: string | null;

  /** Reference to the stored raw input (NOT the raw text itself in logs). */
  rawInputReference: string;
  /** Which input modes were provided. */
  inputModes: Array<"story" | "pasted">;

  detectedDomain: string;
  suggestedProcedure: EmploymentProcedureType | null;
  suggestedForumHe: string | null;

  contacts: Array<Extracted<ContactDraft>>;
  matterParticipants: Array<Extracted<ContactDraft>>; // participant = contact + role, pre-persistence
  facts: Array<Extracted<FactDraft>>;
  deadlines: Array<Extracted<DeadlineDraft>>;
  mentionedDocuments: Array<Extracted<MentionedDocumentDraft>>;
  evidenceRequirements: Array<Extracted<EvidenceRequirementDraft>>;
  preliminaryLegalIssues: Array<Extracted<PreliminaryLegalIssueDraft>>;
  clarificationQuestions: ClarificationQuestion[];
  contradictions: ContradictionFinding[];

  legalCoverage: LegalCoverageAssessment;
  missingSources: MissingSource[];
  confidenceReport: IntakeConfidenceReport;
  reviewRoute: IntakeReviewRoute;
  warningsHe: string[];
  provenance: DraftProvenanceEntry[];

  status: IntakeDraftStatus;
  engineVersion: string;
  assembledAt: string;
}

/* ------------------------------------------------------------------ */
/* Pipeline input + options.                                            */
/* ------------------------------------------------------------------ */

export interface IntakeInput {
  organizationId: string;
  createdBy: string | null;
  storyHe: string; // the free-text legal story
  pastedHe?: string | null; // optional pasted email/message text
}

export interface IntakePipelineOptions {
  /** deterministic "now" — injected so the pipeline is pure/reproducible. */
  nowISO: string;
  /** stable id seed for reproducible ids in tests. */
  idSeed?: string;
  /** the matter's AI policy, if the caller already knows it. */
  aiPolicy?: "allowed" | "allowed_with_review" | "prohibited";
  /** extraction provider mode (default "deterministic"). */
  providerMode?: "deterministic" | "model_assisted" | "production_disabled";
  /** injected router (tests); overrides providerMode when present. */
  router?: import("./providers/router.ts").IntakeProviderRouter;
}

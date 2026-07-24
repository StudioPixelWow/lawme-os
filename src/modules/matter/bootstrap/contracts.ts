/**
 * Capability 1 · Slice 1.0.1 — Bootstrap Validation Engine: canonical contracts.
 *
 * These types freeze the domain boundary that sits BETWEEN a persisted Intake
 * Draft and the (later) Matter Aggregate Planner. They describe:
 *   - the three PURE inputs the validator consumes (RawBootstrapDraft +
 *     ResolvedBootstrapReferenceFacts + BootstrapValidationContext),
 *   - the immutable `ValidatedBootstrapDraft` it emits ONLY on success.
 *
 * Nothing here performs I/O, allocates database identifiers, or references
 * persistence. `ResolvedBootstrapReferenceFacts` is the sole place database
 * reads are represented — as already-resolved, immutable facts, never as a
 * live client. See docs/product/BOOTSTRAP_VALIDATION_AND_AGGREGATE_PLANNING.md.
 */

import type { EmploymentProcedureType } from "../../legal-knowledge/procedure/types.ts";
import type { AiPolicy } from "../../intelligence/core/ai-policy.ts";
import type { MatterConfidentiality } from "../../identity/authorization-policy/contracts.ts";
import type {
  DeadlineConfidence,
  DeadlineSource,
  IntakeFactStatus,
  ParticipantRole,
} from "../intake/contracts.ts";

/** THE version of the bootstrap-validation semantics. Every result + every
 *  emitted `ValidatedBootstrapDraft` carries it. Changing validation MEANING
 *  (a new/removed check, a normalization rule change, an issue-code change)
 *  REQUIRES bumping this — historical drafts must never silently revalidate
 *  under changed semantics. */
export const BOOTSTRAP_VALIDATION_VERSION = "bootstrap-validation-v1";

/** Contact kinds — mirrors `contacts.kind` CHECK. */
export type ContactKind = "person" | "company";

/* ------------------------------------------------------------------ */
/* INPUT 1 — Raw Draft (the persisted snapshot; UNTRUSTED as an aggregate) */
/* ------------------------------------------------------------------ */

/**
 * The persisted `matter_intake_drafts` snapshot as handed to the validator.
 * `structuredDraft` is the persisted `structured_draft` JSON — typed `unknown`
 * on purpose: its shape is validated (fail-closed) inside the engine, never
 * trusted by the caller. No confidential input is carried here.
 */
export interface RawBootstrapDraft {
  readonly draftId: string;
  readonly organizationId: string;
  /** Persisted status string (untrusted — validated against the intake status vocab). */
  readonly status: string;
  /** Persisted optimistic-concurrency token. */
  readonly versionToken: string;
  /** Schema version of `structuredDraft` (e.g. the intake contract version). */
  readonly schemaVersion: string;
  /** The intake engine version that produced the draft. */
  readonly engineVersion: string;
  /** ISO expiry, when the draft carries one. */
  readonly expiresAt?: string | null;
  /** Set once the draft has already produced a Matter (idempotent path). */
  readonly confirmedMatterId?: string | null;
  /** The persisted `structured_draft` — validated in-engine, never trusted. */
  readonly structuredDraft: unknown;
}

/* ------------------------------------------------------------------ */
/* INPUT 2 — Resolved Reference Facts (everything DB reads produced)    */
/* ------------------------------------------------------------------ */

/** A resolved organization fact (from a DB read upstream). */
export interface ResolvedOrganizationFact {
  readonly id: string;
  readonly active: boolean;
}

/** A resolved profile/membership fact for owner + member resolution. */
export interface ResolvedMemberFact {
  readonly profileId: string;
  readonly organizationId: string;
  readonly activeMember: boolean;
}

/** A resolved, same-tenant contact the reviewer may link a participant to. */
export interface ResolvedContactFact {
  readonly contactId: string;
  readonly organizationId: string;
  readonly kind: ContactKind;
}

/**
 * The immutable snapshot of everything that required a database read, resolved
 * BEFORE the pure validator runs. The validator itself performs NO reads.
 * Absent/empty ⇒ fail closed (an unresolved reference is a blocking issue).
 */
export interface ResolvedBootstrapReferenceFacts {
  readonly organization: ResolvedOrganizationFact;
  /** The resolved assigned owner (null ⇒ owner could not be resolved). */
  readonly owner: ResolvedMemberFact | null;
  /** Resolved org members eligible to become matter members. */
  readonly members: readonly ResolvedMemberFact[];
  /** Resolved contacts referenced by the draft/approvals (by id). */
  readonly resolvedContacts: readonly ResolvedContactFact[];
  /** Matter/procedure types this organization may open. */
  readonly supportedMatterTypes: readonly EmploymentProcedureType[];
  /** An EXISTING confirmed Matter for this draft, if any (idempotency). */
  readonly existingConfirmation?: { readonly matterId: string } | null;
  /** Structured-draft schema versions the validator accepts. */
  readonly supportedSchemaVersions: readonly string[];
  /** Intake engine versions the validator accepts. */
  readonly supportedDraftEngineVersions: readonly string[];
  /** The validation semantics version this environment supports. */
  readonly supportedValidationVersion: string;
}

/* ------------------------------------------------------------------ */
/* INPUT 3 — Validation Context (the confirm-time command + clock)     */
/* ------------------------------------------------------------------ */

/**
 * The immutable confirm-time context. Carries the reviewer's approvals (the
 * confirm command), the active tenant + actor, the expected draft version, and
 * the SINGLE injected clock (`validatedAt`). No secrets, no tokens.
 */
export interface BootstrapValidationContext {
  readonly activeOrganizationId: string;
  readonly actorProfileId: string;
  /** The version token the confirm command pins (optimistic concurrency). */
  readonly expectedDraftVersion: string;
  /** ISO "now" — the ONLY clock the engine may read. Never `Date.now()`. */
  readonly validatedAt: string;
  /** The reviewer's confirm decision — validated in-engine, never trusted. */
  readonly approvals: unknown;
  /** Optional correlation id (telemetry only; excluded from the input hash). */
  readonly correlationId?: string;
  /** Optional pin of the expected validation version (defaults to current). */
  readonly validationVersion?: string;
}

/* ------------------------------------------------------------------ */
/* OUTPUT — ValidatedBootstrapDraft (immutable; ONLY legal planner input) */
/* ------------------------------------------------------------------ */

/** A normalized source span (traceability). No DB ids. */
export interface NormalizedSpan {
  readonly source: "story" | "pasted";
  readonly start: number;
  readonly end: number;
  readonly quoteHe: string;
}

/** Normalized provenance for a domain item. No DB ids. */
export interface NormalizedProvenance {
  readonly origin: "intelligent_intake";
  readonly draftId: string;
  readonly ruleId: string;
  readonly span: NormalizedSpan | null;
}

/** The normalized, reviewer-approved Matter header. No DB ids, no stage id. */
export interface NormalizedMatterHeader {
  readonly titleHe: string;
  readonly procedureType: EmploymentProcedureType;
  readonly forumHe: string | null;
  readonly confidentiality: MatterConfidentiality;
  readonly aiPolicy: AiPolicy;
  readonly legalDomain: "labor";
}

/** A normalized participant = an approved contact + role. Carries a plan-local
 *  `participantKey` (NOT a DB id); linking is decided later by the planner. */
export interface NormalizedParticipant {
  readonly participantKey: string;
  readonly role: ParticipantRole;
  readonly displayNameHe: string;
  readonly kind: ContactKind;
  /** Same-tenant contact id the reviewer chose to link, or null (⇒ create later). */
  readonly linkToContactId: string | null;
  readonly sourceItemId: string;
  readonly provenance: NormalizedProvenance;
}

/** A normalized fact — intake epistemic status ONLY. */
export interface NormalizedFact {
  readonly factKey: string;
  readonly statementHe: string;
  readonly status: IntakeFactStatus;
  readonly sourceItemId: string;
  readonly provenance: NormalizedProvenance;
}

/** A normalized deadline — schema-consistent (known⇒date, unknown⇒null). */
export interface NormalizedDeadline {
  readonly labelHe: string;
  readonly dueAt: string | null;
  readonly source: DeadlineSource;
  readonly confidence: DeadlineConfidence;
  readonly timezone: string;
  readonly strict: boolean;
  readonly basisHe: string | null;
  readonly sourceItemId: string;
}

/** A normalized evidence requirement. */
export interface NormalizedEvidence {
  readonly labelHe: string;
  readonly mandatory: boolean;
  readonly sourceItemId: string;
}

/** Normalized, non-confidential metadata carried with the validated draft. */
export interface NormalizedMetadata {
  readonly organizationId: string;
  readonly sourceEngineVersion: string;
  readonly validationVersion: string;
  /** Accepted warning codes (advisory; excluded from the input hash). */
  readonly warningCodes: readonly string[];
  readonly counts: {
    readonly participants: number;
    readonly facts: number;
    readonly deadlines: number;
    readonly evidence: number;
  };
}

/**
 * The immutable artifact the validator emits on success. The ONLY legal input
 * to the Matter Aggregate Planner. Contains NO database identifiers, NO SQL, NO
 * persistence hints. All collections are readonly and deeply frozen.
 */
export interface ValidatedBootstrapDraft {
  readonly sourceDraftId: string;
  readonly sourceDraftVersionToken: string;
  readonly sourceDraftSchemaVersion: string;
  /** Deterministic hash over normalized content only (idempotency basis). */
  readonly sourceInputHash: string;
  /** From `context.validatedAt` — never a clock read inside the engine. */
  readonly validatedAt: string;
  readonly validationVersion: string;
  readonly normalizedMatter: NormalizedMatterHeader;
  readonly normalizedParticipants: readonly NormalizedParticipant[];
  readonly normalizedFacts: readonly NormalizedFact[];
  readonly normalizedDeadlines: readonly NormalizedDeadline[];
  readonly normalizedEvidence: readonly NormalizedEvidence[];
  readonly normalizedMetadata: NormalizedMetadata;
}

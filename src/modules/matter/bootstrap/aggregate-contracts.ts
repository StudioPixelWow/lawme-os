/**
 * Capability 1 · Slice 1.0.2 — Matter Aggregate Planner: canonical contracts.
 *
 * `MatterAggregatePlan` is ONE immutable, declarative domain aggregate — NOT a
 * command/operation stream. It describes the authoritative Matter that a later
 * atomic RPC (1.0.4) will materialize; it contains nothing executable, no SQL,
 * no RPC payload, and NO database identifiers — only deterministic plan-local
 * keys. Cross-section links use those plan-local keys (a participant points at
 * a contact by `contactKey`); the RPC resolves keys → real ids at insert time.
 *
 * See docs/product/BOOTSTRAP_VALIDATION_AND_AGGREGATE_PLANNING.md (Part 3).
 */

import type { EmploymentProcedureType } from "../../legal-knowledge/procedure/types.ts";
import type { AiPolicy } from "../../intelligence/core/ai-policy.ts";
import type { MatterConfidentiality } from "../../identity/authorization-policy/contracts.ts";
import type { DeadlineConfidence, DeadlineSource, IntakeFactStatus } from "../intake/contracts.ts";
import type { ContactKind, NormalizedProvenance } from "./contracts.ts";

/** Integer aggregate-shape version (name-independent). The RPC accepts only
 *  known aggregate versions; unknown ⇒ reject, never reinterpret. */
export const MATTER_AGGREGATE_VERSION = 1;

/** THE planner semantics version. Bumping it signals a changed mapping/ordering. */
export const MATTER_AGGREGATE_PLANNER_VERSION = "matter-aggregate-planner-v1";

/** Validation versions this planner can consume. A ValidatedBootstrapDraft from
 *  an incompatible validator is refused (fail closed), never reinterpreted. */
export const SUPPORTED_VALIDATION_VERSIONS: readonly string[] = ["bootstrap-validation-v1"];

/** Raised when the planner is handed an input it must refuse (e.g. an
 *  incompatible validation version). A guard for an otherwise-impossible state. */
export class AggregatePlanningError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AggregatePlanningError";
    this.code = code;
  }
}

/* ── Sections ─────────────────────────────────────────────────────────────── */

/** Canonical Matter header projection. `statusIntent` is a domain intent, not a
 *  persisted status; NO stage id is resolved here (that needs the procedure
 *  graph, which the pure planner must not read). */
export interface PlannedMatter {
  readonly titleHe: string;
  readonly procedureType: EmploymentProcedureType;
  readonly topicHe: string;
  readonly legalDomain: "labor";
  readonly confidentiality: MatterConfidentiality;
  readonly aiPolicy: AiPolicy;
  readonly forumHe: string | null;
  readonly statusIntent: "open";
}

/** A membership projection. The planner performs NO authorization and allocates
 *  NO profile id: the owner's identity is bound by the RPC from the confirming
 *  ActorContext (`bindProfileTo`), never invented here. */
export interface PlannedMember {
  readonly memberKey: string;
  readonly slot: "owner";
  /** Resolved at integration time from the actor's org role (not invented here). */
  readonly matterRole: string | null;
  readonly canReview: boolean;
  readonly canApprove: boolean;
  /** Symbolic binding hint for the RPC: which identity fills this slot. */
  readonly bindProfileTo: "confirming_actor";
}

export type ContactClassification = "link_existing" | "create_new" | "deferred";

/** A classified contact plan. `contactId` is a same-tenant id ONLY for
 *  `link_existing`; `create_new`/`deferred` carry no id (the RPC inserts). */
export interface PlannedContact {
  readonly contactKey: string;
  readonly classification: ContactClassification;
  readonly contactId: string | null;
  readonly kind: ContactKind;
  readonly nameHe: string;
  readonly sourceItemIds: readonly string[];
}

/** A legal-party projection. References its contact by plan-local `contactKey`. */
export interface PlannedParticipant {
  readonly participantKey: string;
  readonly role: string;
  readonly displayNameHe: string;
  readonly contactKey: string;
  readonly sourceItemId: string;
  readonly provenance: NormalizedProvenance;
}

/** An intake-grade fact projection. Epistemic status is preserved EXACTLY —
 *  never upgraded to an established status, never merged, never inferred. */
export interface PlannedFact {
  readonly factPlanKey: string;
  readonly factKey: string;
  readonly statementHe: string;
  readonly status: IntakeFactStatus;
  readonly sourceItemId: string;
  readonly provenance: NormalizedProvenance;
}

/** A deadline projection — mapped verbatim from the validated deadline. The
 *  planner NEVER computes statutory dates. */
export interface PlannedDeadline {
  readonly deadlineKey: string;
  readonly labelHe: string;
  readonly dueAt: string | null;
  readonly source: DeadlineSource;
  readonly confidence: DeadlineConfidence;
  readonly timezone: string;
  readonly strict: boolean;
  readonly basisHe: string | null;
  readonly sourceItemId: string;
}

/** An evidence-requirement projection reflecting the CURRENT `matter_evidence`
 *  schema only (`status='required'` + mandatory). No future requirement model. */
export interface PlannedEvidence {
  readonly evidenceKey: string;
  readonly labelHe: string;
  readonly mandatory: boolean;
  readonly status: "required";
  readonly sourceItemId: string;
}

/** Immutable, non-confidential audit payload prepared as data (the RPC writes
 *  it). Carries identity/version/hash/counts only — no statements or names. */
export interface PlannedAudit {
  readonly auditKey: string;
  readonly sourceDraftId: string;
  readonly sourceDraftVersionToken: string;
  readonly sourceDraftSchemaVersion: string;
  readonly validationVersion: string;
  readonly sourceInputHash: string;
  readonly validatedAt: string;
  readonly counts: AggregateCounts;
}

export interface AggregateCounts {
  readonly members: number;
  readonly participants: number;
  readonly contacts: number;
  readonly facts: number;
  readonly deadlines: number;
  readonly evidence: number;
}

export interface AggregatePlanMetadata {
  readonly aggregateVersion: number;
  readonly plannerVersion: string;
  readonly validationVersion: string;
  readonly sourceDraftVersion: string;
  readonly sourceInputHash: string;
  /** Deterministic hash of the aggregate content (excludes this + duration + stats). */
  readonly planHash: string;
  /** Telemetry only; the pure planner leaves it null (no clock, no duration). */
  readonly planningDurationMs: number | null;
  readonly statistics: AggregateCounts;
}

/**
 * The one immutable, declarative aggregate. Deeply frozen. No executable
 * operations, no SQL, no commands, no database identifiers.
 */
export interface MatterAggregatePlan {
  readonly matter: PlannedMatter;
  readonly members: readonly PlannedMember[];
  readonly participants: readonly PlannedParticipant[];
  readonly contacts: readonly PlannedContact[];
  readonly facts: readonly PlannedFact[];
  readonly deadlines: readonly PlannedDeadline[];
  readonly evidence: readonly PlannedEvidence[];
  readonly audit: PlannedAudit;
  readonly metadata: AggregatePlanMetadata;
}

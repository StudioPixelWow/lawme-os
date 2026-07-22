/**
 * Resource policy FACT contracts (Capability 0.8, Slice 0.8.3).
 *
 * Policies consume NORMALIZED, immutable facts — never database rows, never
 * confidential text. A later slice's repositories load these facts under RLS and
 * hand them to the pure policies here. Every enum below mirrors the ACTUAL
 * schema vocabulary; a value outside these unions is treated as unknown and
 * fails closed.
 *
 * Facts that the current schema does NOT yet express (an explicit broad-read
 * grant, an explicit confidentiality override, a per-member active flag) are
 * modelled as OPTIONAL. Absent ⇒ not granted / must be supplied ⇒ fail closed.
 */
import type { ActorContext, ServiceActor, SystemActor } from "../actor-context.ts";

/** Any actor the engine may be asked about. Only `user` is ever authorized. */
export type AuthorizationActor = ActorContext | SystemActor | ServiceActor;

/* ── Confidentiality vocabularies (exact schema values) ───────────────────── */

/** `matters.confidentiality` CHECK — internal < client_confidential < privileged. */
export type MatterConfidentiality = "internal" | "client_confidential" | "privileged";
export const MATTER_CONFIDENTIALITY_VALUES: readonly MatterConfidentiality[] = [
  "internal",
  "client_confidential",
  "privileged",
];
export function isMatterConfidentiality(v: unknown): v is MatterConfidentiality {
  return typeof v === "string" && (MATTER_CONFIDENTIALITY_VALUES as readonly string[]).includes(v);
}

/** `matter_documents.confidentiality` CHECK — standard < confidential < privileged/restricted. */
export type DocumentConfidentiality = "standard" | "confidential" | "privileged" | "restricted";
export const DOCUMENT_CONFIDENTIALITY_VALUES: readonly DocumentConfidentiality[] = [
  "standard",
  "confidential",
  "privileged",
  "restricted",
];
export function isDocumentConfidentiality(v: unknown): v is DocumentConfidentiality {
  return typeof v === "string" && (DOCUMENT_CONFIDENTIALITY_VALUES as readonly string[]).includes(v);
}

/** `matter_intake_drafts.status` CHECK (the AUTHORITATIVE persisted model). */
export type IntakeDraftPolicyStatus =
  | "active"
  | "needs_clarification"
  | "ready_for_review"
  | "confirming"
  | "confirmed"
  | "rejected"
  | "expired";
export const INTAKE_DRAFT_STATUS_VALUES: readonly IntakeDraftPolicyStatus[] = [
  "active",
  "needs_clarification",
  "ready_for_review",
  "confirming",
  "confirmed",
  "rejected",
  "expired",
];
export function isIntakeDraftStatus(v: unknown): v is IntakeDraftPolicyStatus {
  return typeof v === "string" && (INTAKE_DRAFT_STATUS_VALUES as readonly string[]).includes(v);
}

/** `matter_documents.approval_state` CHECK. */
export type DocumentApprovalState = "draft" | "in_review" | "approved" | "rejected";

/** Audit classification — NOT a schema column; derived by the loader from the
 *  audit event's object linkage. Absent/unknown ⇒ fail closed. */
export type AuditClassification = "organization" | "matter" | "security";
export const AUDIT_CLASSIFICATION_VALUES: readonly AuditClassification[] = [
  "organization",
  "matter",
  "security",
];
export function isAuditClassification(v: unknown): v is AuditClassification {
  return typeof v === "string" && (AUDIT_CLASSIFICATION_VALUES as readonly string[]).includes(v);
}

/* ── Matter facts ─────────────────────────────────────────────────────────── */

/** The actor's OWN membership on a Matter (`matter_members`).
 *  `matter_members` has no active column, so `active` is set by the loader
 *  (a normalized signal); it is REQUIRED here so an absent flag fails closed. */
export interface MatterMembershipFacts {
  readonly membershipId: string;
  /** `matter_members.profile_id` — must equal the actor's profile to grant access. */
  readonly profileId: string;
  /** `matter_members.matter_role` (label only — never authorizes on its own). */
  readonly role?: string | null;
  /** `matter_members.can_review`. */
  readonly canReview?: boolean;
  /** `matter_members.can_approve` (the `app.matter_can_approve` signal). */
  readonly canApprove?: boolean;
  readonly active: boolean;
}

export interface MatterPolicyFacts {
  readonly matterId: string;
  readonly organizationId: string;
  /** `matters.assigned_owner_id`. */
  readonly ownerProfileId?: string | null;
  /** `matters.confidentiality`. */
  readonly confidentiality: MatterConfidentiality;
  readonly actorMatterMembership?: MatterMembershipFacts | null;
  /** An explicitly approved organization-level broad-read grant (NOT yet
   *  schema-backed). Grants read on internal-tier matters WITHOUT per-matter
   *  membership. Absent ⇒ no broad read. */
  readonly organizationBroadReadGranted?: boolean;
  /** An explicit confidentiality-policy override (NOT yet schema-backed) that
   *  grants access to client_confidential / privileged matters without owner or
   *  membership. Absent ⇒ no override. */
  readonly confidentialityOverrideGranted?: boolean;
  /** A future explicit extra restriction on this matter. Absent ⇒ not extra-restricted. */
  readonly isExplicitlyRestricted?: boolean;
  /** `matters.status === 'archived'` (or closed). Absent ⇒ unknown/not archived. */
  readonly isArchived?: boolean;
}

/* ── Intake Draft facts ───────────────────────────────────────────────────── */

export interface IntakeDraftPolicyFacts {
  readonly draftId: string;
  readonly organizationId: string;
  /** `matter_intake_drafts.created_by`. */
  readonly createdByProfileId?: string | null;
  /** `matter_intake_drafts.reviewer_ids`. */
  readonly reviewerProfileIds: readonly string[];
  readonly status: IntakeDraftPolicyStatus;
}

/* ── Contact facts ────────────────────────────────────────────────────────── */

/** `contactId` is optional because CREATE is organization-scoped (no object yet). */
export interface ContactPolicyFacts {
  readonly contactId?: string;
  readonly organizationId: string;
}

/* ── Document facts ───────────────────────────────────────────────────────── */

export interface DocumentPolicyFacts {
  readonly documentId: string;
  readonly organizationId: string;
  readonly matterId: string;
  /** The parent Matter's authorization facts — Document access COMPOSES with it. */
  readonly matterPolicy: MatterPolicyFacts;
  /** `matter_documents.confidentiality`. */
  readonly confidentiality: DocumentConfidentiality;
  /** `matter_documents.approval_state`. */
  readonly approvalState?: DocumentApprovalState | string | null;
  /** `matter_documents.uploaded_by_id`. */
  readonly uploadedByProfileId?: string | null;
  /** `matter_documents.assigned_reviewer_id` (respected where present). */
  readonly assignedReviewerProfileId?: string | null;
}

/* ── Evidence facts ───────────────────────────────────────────────────────── */

/** `matter_evidence` carries the requirement; review/approval OUTCOMES live on
 *  documents, so there is no approval_state here. `reviewState` is optional. */
export interface EvidencePolicyFacts {
  readonly evidenceId?: string;
  readonly requirementId?: string;
  readonly organizationId: string;
  readonly matterId: string;
  readonly matterPolicy: MatterPolicyFacts;
  readonly reviewState?: string | null;
}

/* ── Audit facts ──────────────────────────────────────────────────────────── */

export interface AuditPolicyFacts {
  readonly organizationId: string;
  /** Set for matter-scoped audit records (via `audit_events.object_id`). */
  readonly matterId?: string | null;
  /** Required for matter-classified audit access; composes with Matter policy. */
  readonly matterPolicy?: MatterPolicyFacts | null;
  readonly classification?: AuditClassification;
}

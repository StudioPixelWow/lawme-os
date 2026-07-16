/**
 * Confirmation → canonical write plan.
 *
 * The ONLY bridge from a reviewed MatterIntakeDraft to persisted Slice 2 rows.
 * Pure + deterministic: given (draft, the reviewer's approvals), it returns the
 * exact typed rows to write to contacts / matter_participants / matter_facts /
 * matter_deadlines / matter_evidence + the Matter header + an audit record.
 *
 * SAFETY INVARIANTS enforced HERE (not just in the UI):
 *  - Nothing is included unless the reviewer explicitly approved it.
 *  - Facts may only carry intake epistemic states (client_alleged /
 *    opposing_alleged / disputed / unknown). An attempt to smuggle a confirmed
 *    or document_derived status is DROPPED and reported — never written.
 *  - Only date items the reviewer approved AND that are real deadlines become
 *    matter_deadlines. Hearing dates and event dates are NOT persisted as
 *    deadlines (Hearing is a deferred entity); relative/ambiguous dates keep
 *    dueAt = null (no invented dates).
 *  - The matter's confidentiality / ai_policy are taken from the reviewer's
 *    explicit choice, never inferred silently.
 */

import type { EmploymentProcedureType } from "../../legal-knowledge/procedure/types.ts";
import type {
  IntakeFactStatus,
  MatterIntakeDraft,
  ParticipantRole,
} from "./contracts.ts";
import { isIntakeFactStatus } from "./contracts.ts";

/** What the reviewer approved, per section, by extracted-item id. */
export interface IntakeApprovals {
  /** Matter header the reviewer confirmed. */
  matter: {
    titleHe: string;
    procedureType: EmploymentProcedureType | null;
    forumHe?: string | null;
    confidentiality: "internal" | "client_confidential" | "privileged";
    aiPolicy: "allowed" | "allowed_with_review" | "prohibited";
  };
  /** Approved contact/participant item ids + the (possibly edited) role. */
  participants: Array<{ itemId: string; role: ParticipantRole; linkToContactId?: string | null }>;
  /** Approved fact item ids + the (possibly edited) statement + status. */
  facts: Array<{ itemId: string; statementHe?: string; status?: IntakeFactStatus }>;
  /** Approved deadline item ids. */
  deadlines: Array<{ itemId: string }>;
  /** Approved evidence-requirement item ids. */
  evidenceRequirements: Array<{ itemId: string }>;
}

export interface ContactRow {
  kind: "person" | "company";
  nameHe: string;
  role: ParticipantRole;
  linkToContactId: string | null;
}
export interface FactRow {
  factKey: string;
  statementHe: string;
  status: IntakeFactStatus;
  provenance: Record<string, unknown>;
}
export interface DeadlineRow {
  labelHe: string;
  dueAt: string | null;
  source: "statute" | "court_order" | "contract" | "estimated" | "user_supplied";
  confidence: "known" | "estimated" | "unknown";
  timezone: string;
  strict: boolean;
  basisHe: string | null;
}
export interface EvidenceRow {
  labelHe: string;
  mandatory: boolean;
}

export interface CanonicalWritePlan {
  matter: IntakeApprovals["matter"];
  contacts: ContactRow[];
  facts: FactRow[];
  deadlines: DeadlineRow[];
  evidenceRequirements: EvidenceRow[];
  /** Immutable audit record: the draft + the confirmation decision. */
  audit: {
    draftId: string;
    organizationId: string;
    confirmedBy: string | null;
    rawInputReference: string;
    engineVersion: string;
    approvedCounts: { participants: number; facts: number; deadlines: number; evidence: number };
    droppedForSafety: string[]; // human-readable reasons an item was refused
  };
  warningsHe: string[];
}

/**
 * Build the write plan. Never throws on a bad status — it DROPS the offending
 * item and records why, so a UI bug can never persist a confirmed fact.
 */
export function buildConfirmationPlan(
  draft: MatterIntakeDraft,
  approvals: IntakeApprovals,
): CanonicalWritePlan {
  const droppedForSafety: string[] = [];
  const warningsHe: string[] = [];

  const factById = new Map(draft.facts.map((f) => [f.id, f]));
  const contactById = new Map(draft.contacts.map((c) => [c.id, c]));
  const deadlineById = new Map(draft.deadlines.map((d) => [d.id, d]));
  const evidenceById = new Map(draft.evidenceRequirements.map((e) => [e.id, e]));

  // Contacts / participants.
  const contacts: ContactRow[] = [];
  for (const a of approvals.participants) {
    const item = contactById.get(a.itemId);
    if (!item) {
      droppedForSafety.push(`participant ${a.itemId}: לא נמצא בטיוטה`);
      continue;
    }
    contacts.push({
      kind: item.value.kind === "organization" ? "company" : "person",
      nameHe: item.value.displayNameHe,
      role: a.role,
      linkToContactId: a.linkToContactId ?? null,
    });
  }

  // Facts — intake statuses ONLY; established statuses are refused.
  const facts: FactRow[] = [];
  for (const a of approvals.facts) {
    const item = factById.get(a.itemId);
    if (!item) {
      droppedForSafety.push(`fact ${a.itemId}: לא נמצא בטיוטה`);
      continue;
    }
    const status = a.status ?? item.value.suggestedStatus;
    if (!isIntakeFactStatus(status)) {
      // Hard refusal — an established fact can never enter via intake.
      droppedForSafety.push(`fact ${a.itemId}: סטטוס «${status}» אסור באינטייק — נדחה`);
      continue;
    }
    facts.push({
      factKey: item.value.factKey,
      statementHe: a.statementHe ?? item.value.statementHe,
      status,
      provenance: {
        origin: "intelligent_intake",
        draftId: draft.draftId,
        span: item.span,
        rule: item.provenance.ruleId,
      },
    });
  }

  // Deadlines — only real deadlines persist; hearing/event dates do NOT.
  const deadlines: DeadlineRow[] = [];
  for (const a of approvals.deadlines) {
    const item = deadlineById.get(a.itemId);
    if (!item) {
      droppedForSafety.push(`deadline ${a.itemId}: לא נמצא בטיוטה`);
      continue;
    }
    const k = item.value.kind;
    if (k === "hearing_date") {
      warningsHe.push("מועד דיון אינו נשמר כמועד מחייב (ישות דיון אינה נתמכת בשלב זה).");
      continue;
    }
    if (k === "event_date") {
      warningsHe.push("תאריך אירוע אינו נשמר כמועד אחרון.");
      continue;
    }
    // deadline | estimated_prep_date | unknown_ambiguous → a real time obligation
    deadlines.push({
      labelHe: item.value.labelHe,
      dueAt: item.value.dueAt, // honesty: null stays null (never invented)
      source: item.value.sourceType,
      confidence: item.value.deadlineConfidence,
      timezone: item.value.timezone,
      strict: item.value.strict,
      basisHe: item.value.basisHe ?? null,
    });
  }

  // Evidence requirements.
  const evidenceRequirements: EvidenceRow[] = [];
  for (const a of approvals.evidenceRequirements) {
    const item = evidenceById.get(a.itemId);
    if (!item) {
      droppedForSafety.push(`evidence ${a.itemId}: לא נמצא בטיוטה`);
      continue;
    }
    evidenceRequirements.push({ labelHe: item.value.labelHe, mandatory: item.value.mandatory });
  }

  return {
    matter: approvals.matter,
    contacts,
    facts,
    deadlines,
    evidenceRequirements,
    audit: {
      draftId: draft.draftId,
      organizationId: draft.organizationId,
      confirmedBy: draft.createdBy,
      rawInputReference: draft.rawInputReference,
      engineVersion: draft.engineVersion,
      approvedCounts: {
        participants: contacts.length,
        facts: facts.length,
        deadlines: deadlines.length,
        evidence: evidenceRequirements.length,
      },
      droppedForSafety,
    },
    warningsHe: Array.from(new Set(warningsHe)),
  };
}

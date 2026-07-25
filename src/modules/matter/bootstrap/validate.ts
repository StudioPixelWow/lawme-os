/**
 * Capability 1 · Slice 1.0.1 — the canonical Bootstrap Validation Engine.
 *
 * `validateBootstrapDraft` is a PURE function of its three inputs. It performs
 * NO I/O, no Supabase/serviceClient calls, allocates NO database identifiers,
 * invokes NO RPC/AI/Workflow/Timeline/Search/Notifications, and reads NO clock
 * other than `context.validatedAt`. It answers exactly one question:
 *
 *   "Can this Intake Draft safely proceed to Aggregate Planning?"
 *
 * On success it emits an immutable `ValidatedBootstrapDraft` (the ONLY legal
 * planner input). On any blocking issue it fails closed with NO normalized
 * draft. It never mutates its inputs.
 */

import { z } from "zod";

import { PARTICIPANT_ROLES, isIntakeFactStatus } from "../intake/contracts.ts";
import type { DeadlineConfidence, DeadlineSource, IntakeFactStatus, ParticipantRole } from "../intake/contracts.ts";
import { MATTER_CONFIDENTIALITY_VALUES } from "../../identity/authorization-policy/contracts.ts";
import type { MatterConfidentiality } from "../../identity/authorization-policy/contracts.ts";
import type { AiPolicy } from "../../intelligence/core/ai-policy.ts";
import type { EmploymentProcedureType } from "../../legal-knowledge/procedure/types.ts";

import {
  BOOTSTRAP_VALIDATION_VERSION,
  type BootstrapValidationContext,
  type NormalizedDeadline,
  type NormalizedEvidence,
  type NormalizedFact,
  type NormalizedMatterHeader,
  type NormalizedParticipant,
  type NormalizedProvenance,
  type NormalizedSpan,
  type RawBootstrapDraft,
  type ResolvedBootstrapReferenceFacts,
  type ValidatedBootstrapDraft,
} from "./contracts.ts";
import {
  info,
  issue,
  warning,
  type BootstrapValidationInfo,
  type BootstrapValidationIssue,
  type BootstrapValidationWarning,
} from "./issues.ts";
import { BOOTSTRAP_AGGREGATE_LIMITS } from "./aggregate-limits.ts";
import {
  failedResult,
  makeStat,
  validResult,
  type BootstrapValidationResult,
  type SectionStat,
  type ValidationStatistics,
} from "./validation-result.ts";
import { contentHash } from "./hash.ts";
import {
  dedupeBy,
  matchEnum,
  normalizeIsoDateOrNull,
  normalizeText,
  normalizeTextOrNull,
  planLocalKey,
  stableSortBy,
} from "./normalize.ts";

/* ── Local closed vocabularies (values, not just types) ───────────────────── */

const DEADLINE_SOURCE_VALUES: readonly DeadlineSource[] = [
  "statute",
  "court_order",
  "contract",
  "estimated",
  "user_supplied",
] as const;

const DEADLINE_CONFIDENCE_VALUES: readonly DeadlineConfidence[] = ["known", "estimated", "unknown"] as const;

const AI_POLICY_VALUES: readonly AiPolicy[] = [
  "allowed",
  "allowed_with_review",
  "restricted_no_private_context",
  "prohibited",
] as const;

const MAX_STATEMENT_LEN = 4000;
const MAX_LABEL_LEN = 400;
const SPARSE_FACTS_THRESHOLD = 1; // fewer than this many accepted facts ⇒ warn

/* ── Zod shapes for the untrusted `structuredDraft` + `approvals` ─────────── */

const spanSchema = z
  .object({
    source: z.enum(["story", "pasted"]),
    start: z.number(),
    end: z.number(),
    quoteHe: z.string(),
  })
  .nullable();

const provenanceSchema = z.object({ ruleId: z.string() }).passthrough();

const contactItemSchema = z
  .object({
    id: z.string().min(1),
    value: z
      .object({
        displayNameHe: z.string(),
        kind: z.string(),
        duplicatePossibility: z.boolean().optional(),
      })
      .passthrough(),
    span: spanSchema.optional(),
    provenance: provenanceSchema,
  })
  .passthrough();

const factItemSchema = z
  .object({
    id: z.string().min(1),
    value: z
      .object({
        factKey: z.string(),
        statementHe: z.string(),
        suggestedStatus: z.string(),
      })
      .passthrough(),
    span: spanSchema.optional(),
    provenance: provenanceSchema,
  })
  .passthrough();

const deadlineItemSchema = z
  .object({
    id: z.string().min(1),
    value: z
      .object({
        labelHe: z.string(),
        kind: z.string().optional(),
        dueAt: z.string().nullable().optional(),
        timezone: z.string().optional(),
        sourceType: z.string(),
        deadlineConfidence: z.string(),
        basisHe: z.string().nullable().optional(),
        strict: z.boolean().optional(),
      })
      .passthrough(),
    span: spanSchema.optional(),
    provenance: provenanceSchema,
  })
  .passthrough();

const evidenceItemSchema = z
  .object({
    id: z.string().min(1),
    value: z
      .object({
        labelHe: z.string(),
        mandatory: z.boolean().optional(),
      })
      .passthrough(),
    span: spanSchema.optional(),
    provenance: provenanceSchema,
  })
  .passthrough();

const structuredDraftSchema = z
  .object({
    contacts: z.array(contactItemSchema).optional().default([]),
    facts: z.array(factItemSchema).optional().default([]),
    deadlines: z.array(deadlineItemSchema).optional().default([]),
    evidenceRequirements: z.array(evidenceItemSchema).optional().default([]),
  })
  .passthrough();

const approvalsSchema = z
  .object({
    matter: z
      .object({
        titleHe: z.string().optional().default(""),
        procedureType: z.string().nullable().optional().default(null),
        forumHe: z.string().nullable().optional(),
        confidentiality: z.string(),
        aiPolicy: z.string(),
      })
      .passthrough(),
    participants: z
      .array(
        z.object({
          itemId: z.string(),
          role: z.string(),
          linkToContactId: z.string().nullable().optional(),
        }),
      )
      .optional()
      .default([]),
    facts: z
      .array(z.object({ itemId: z.string(), statementHe: z.string().optional(), status: z.string().optional() }))
      .optional()
      .default([]),
    deadlines: z.array(z.object({ itemId: z.string() })).optional().default([]),
    evidenceRequirements: z.array(z.object({ itemId: z.string() })).optional().default([]),
  })
  .passthrough();

type StructuredDraft = z.infer<typeof structuredDraftSchema>;
type Approvals = z.infer<typeof approvalsSchema>;
type ContactItem = z.infer<typeof contactItemSchema>;
type FactItem = z.infer<typeof factItemSchema>;
type DeadlineItem = z.infer<typeof deadlineItemSchema>;
type EvidenceItem = z.infer<typeof evidenceItemSchema>;

/* ── Statistics helper ────────────────────────────────────────────────────── */

function statistics(
  participants: SectionStat,
  facts: SectionStat,
  deadlines: SectionStat,
  evidence: SectionStat,
  contacts: SectionStat,
  issues: readonly unknown[],
  warnings: readonly unknown[],
  infos: readonly unknown[],
): ValidationStatistics {
  return {
    participants,
    facts,
    deadlines,
    evidence,
    contacts,
    issues: issues.length,
    warnings: warnings.length,
    infos: infos.length,
  };
}

const ZERO: SectionStat = { considered: 0, accepted: 0, dropped: 0 };

/* ── Span normalization ───────────────────────────────────────────────────── */

function toNormalizedSpan(span: ContactItem["span"] | undefined): NormalizedSpan | null {
  if (!span) return null;
  return {
    source: span.source,
    start: span.start,
    end: span.end,
    quoteHe: normalizeText(span.quoteHe),
  };
}

function toProvenance(draftId: string, ruleId: string, span: NormalizedSpan | null): NormalizedProvenance {
  return { origin: "intelligent_intake", draftId, ruleId, span };
}

/* ── The engine ───────────────────────────────────────────────────────────── */

export function validateBootstrapDraft(
  rawDraft: RawBootstrapDraft,
  referenceFacts: ResolvedBootstrapReferenceFacts,
  context: BootstrapValidationContext,
): BootstrapValidationResult {
  const version = BOOTSTRAP_VALIDATION_VERSION;
  const issues: BootstrapValidationIssue[] = [];
  const warnings: BootstrapValidationWarning[] = [];
  const infos: BootstrapValidationInfo[] = [];

  const terminal = (): BootstrapValidationResult =>
    failedResult(issues, warnings, infos, version, statistics(ZERO, ZERO, ZERO, ZERO, ZERO, issues, warnings, infos));

  /* 1 — Version compatibility (fail closed; historical drafts never reinterpreted). */
  if (referenceFacts.supportedValidationVersion !== version) {
    issues.push(
      issue("UNSUPPORTED_VERSION", {
        field: "validationVersion",
        developerMessage: `environment supports ${referenceFacts.supportedValidationVersion}, engine is ${version}`,
      }),
    );
    return terminal();
  }
  if (context.validationVersion !== undefined && context.validationVersion !== version) {
    issues.push(
      issue("UNSUPPORTED_VERSION", {
        field: "context.validationVersion",
        developerMessage: `pinned ${context.validationVersion} ≠ engine ${version}`,
      }),
    );
    return terminal();
  }
  if (!referenceFacts.supportedDraftEngineVersions.includes(rawDraft.engineVersion)) {
    issues.push(
      issue("UNSUPPORTED_VERSION", { field: "engineVersion", developerMessage: "draft engine version not supported" }),
    );
    return terminal();
  }
  if (!referenceFacts.supportedSchemaVersions.includes(rawDraft.schemaVersion)) {
    issues.push(
      issue("SCHEMA_MISMATCH", { field: "schemaVersion", developerMessage: "draft schema version not supported" }),
    );
    return terminal();
  }

  /* 2 — Shape (fail closed on malformed / schema mismatch). */
  if (rawDraft.structuredDraft === null || typeof rawDraft.structuredDraft !== "object" || Array.isArray(rawDraft.structuredDraft)) {
    issues.push(issue("MALFORMED_DRAFT", { field: "structuredDraft", developerMessage: "structured_draft is not an object" }));
    return terminal();
  }
  const parsedDraft = structuredDraftSchema.safeParse(rawDraft.structuredDraft);
  if (!parsedDraft.success) {
    issues.push(issue("SCHEMA_MISMATCH", { field: "structuredDraft", developerMessage: "structured_draft failed schema" }));
    return terminal();
  }
  if (context.approvals === null || typeof context.approvals !== "object" || Array.isArray(context.approvals)) {
    issues.push(issue("MALFORMED_DRAFT", { field: "approvals", developerMessage: "approvals is not an object" }));
    return terminal();
  }
  const parsedApprovals = approvalsSchema.safeParse(context.approvals);
  if (!parsedApprovals.success) {
    issues.push(issue("MALFORMED_DRAFT", { field: "approvals", developerMessage: "approvals failed schema" }));
    return terminal();
  }

  const draft: StructuredDraft = parsedDraft.data;
  const approvals: Approvals = parsedApprovals.data;

  /* 2b — Hard aggregate ceilings (AggregateLimitPolicy v1). Exceeding any ceiling
   *      makes the draft invalid — no truncation, no sampling, no silent drop.
   *      Deterministic order: contacts, participants, facts, deadlines, evidence. */
  if (draft.contacts.length > BOOTSTRAP_AGGREGATE_LIMITS.contacts) {
    issues.push(issue("TOO_MANY_CONTACTS", { field: "contacts", developerMessage: `contacts=${draft.contacts.length} > ${BOOTSTRAP_AGGREGATE_LIMITS.contacts}` }));
  }
  if (approvals.participants.length > BOOTSTRAP_AGGREGATE_LIMITS.participants) {
    issues.push(issue("TOO_MANY_PARTICIPANTS", { field: "participants", developerMessage: `participants=${approvals.participants.length} > ${BOOTSTRAP_AGGREGATE_LIMITS.participants}` }));
  }
  if (draft.facts.length > BOOTSTRAP_AGGREGATE_LIMITS.facts) {
    issues.push(issue("TOO_MANY_FACTS", { field: "facts", developerMessage: `facts=${draft.facts.length} > ${BOOTSTRAP_AGGREGATE_LIMITS.facts}` }));
  }
  if (draft.deadlines.length > BOOTSTRAP_AGGREGATE_LIMITS.deadlines) {
    issues.push(issue("TOO_MANY_DEADLINES", { field: "deadlines", developerMessage: `deadlines=${draft.deadlines.length} > ${BOOTSTRAP_AGGREGATE_LIMITS.deadlines}` }));
  }
  if (draft.evidenceRequirements.length > BOOTSTRAP_AGGREGATE_LIMITS.evidence) {
    issues.push(issue("TOO_MANY_EVIDENCE_ITEMS", { field: "evidenceRequirements", developerMessage: `evidence=${draft.evidenceRequirements.length} > ${BOOTSTRAP_AGGREGATE_LIMITS.evidence}` }));
  }

  /* 3 — Draft state. */
  const alreadyConfirmed =
    rawDraft.status === "confirmed" ||
    (rawDraft.confirmedMatterId !== undefined && rawDraft.confirmedMatterId !== null) ||
    (referenceFacts.existingConfirmation !== undefined && referenceFacts.existingConfirmation !== null);
  if (alreadyConfirmed) {
    issues.push(issue("DRAFT_ALREADY_CONFIRMED", { field: "status" }));
  } else if (rawDraft.status === "rejected") {
    issues.push(issue("DRAFT_REJECTED", { field: "status" }));
  } else {
    const expiredByTime =
      rawDraft.expiresAt !== undefined &&
      rawDraft.expiresAt !== null &&
      Date.parse(rawDraft.expiresAt) <= Date.parse(context.validatedAt);
    if (rawDraft.status === "expired" || expiredByTime) {
      issues.push(issue("DRAFT_EXPIRED", { field: "status" }));
    } else if (rawDraft.status !== "ready_for_review") {
      issues.push(issue("DRAFT_NOT_READY", { field: "status", developerMessage: `status=${rawDraft.status}` }));
    }
  }

  /* 4 — Version conflict (optimistic concurrency). */
  if (context.expectedDraftVersion !== rawDraft.versionToken) {
    issues.push(issue("DRAFT_VERSION_CONFLICT", { field: "versionToken" }));
  }

  /* 5 — Organization consistency. */
  if (
    rawDraft.organizationId !== context.activeOrganizationId ||
    referenceFacts.organization.id !== context.activeOrganizationId ||
    referenceFacts.organization.active !== true
  ) {
    issues.push(issue("INVALID_ORGANIZATION", { field: "organizationId" }));
  }

  /* 6 — Owner consistency. */
  if (referenceFacts.owner === null) {
    issues.push(issue("INVALID_OWNER", { field: "owner" }));
  } else if (referenceFacts.owner.organizationId !== context.activeOrganizationId) {
    issues.push(issue("CROSS_TENANT_REFERENCE", { field: "owner", developerMessage: "owner belongs to another org" }));
  } else if (referenceFacts.owner.activeMember !== true) {
    issues.push(issue("INVALID_OWNER", { field: "owner", developerMessage: "owner is not an active member" }));
  }

  /* 7 — Matter header. */
  const procedureType = matchEnum<EmploymentProcedureType>(
    approvals.matter.procedureType,
    referenceFacts.supportedMatterTypes,
  );
  if (approvals.matter.procedureType === null || normalizeText(approvals.matter.procedureType).length === 0) {
    issues.push(issue("MISSING_MATTER_TYPE", { field: "matter.procedureType" }));
  } else if (procedureType === null) {
    issues.push(issue("UNKNOWN_ENUM", { field: "matter.procedureType", developerMessage: "procedure not in supported set" }));
  }
  const confidentiality = matchEnum<MatterConfidentiality>(approvals.matter.confidentiality, MATTER_CONFIDENTIALITY_VALUES);
  if (confidentiality === null) {
    issues.push(issue("UNKNOWN_ENUM", { field: "matter.confidentiality" }));
  }
  const aiPolicy = matchEnum<AiPolicy>(approvals.matter.aiPolicy, AI_POLICY_VALUES);
  if (aiPolicy === null) {
    issues.push(issue("UNKNOWN_ENUM", { field: "matter.aiPolicy" }));
  }
  const titleHe = normalizeText(approvals.matter.titleHe);
  if (titleHe.length === 0) {
    warnings.push(warning("PLANNER_DEFAULT_APPLIED", { field: "matter.titleHe" }));
  }

  /* 8 — Participants (+ contacts + client requirement). */
  const contactById = new Map<string, ContactItem>(draft.contacts.map((c) => [c.id, c]));
  const resolvedContactIds = new Set(referenceFacts.resolvedContacts.map((c) => c.contactId));
  const resolvedContactById = new Map(referenceFacts.resolvedContacts.map((c) => [c.contactId, c]));

  interface BuiltParticipant {
    readonly role: ParticipantRole;
    readonly displayNameHe: string;
    readonly kind: "person" | "company";
    readonly linkToContactId: string | null;
    readonly sourceItemId: string;
    readonly provenance: NormalizedProvenance;
  }
  const builtParticipants: BuiltParticipant[] = [];
  const participantsConsidered = approvals.participants.length;
  let hasClient = false;

  approvals.participants.forEach((p, idx) => {
    const path = `participants[${idx}]`;
    const item = contactById.get(p.itemId);
    if (!item) {
      issues.push(issue("INVALID_PARTICIPANT", { path, developerMessage: `itemId ${p.itemId} not in draft` }));
      return;
    }
    const role = matchEnum<ParticipantRole>(p.role, PARTICIPANT_ROLES);
    if (role === null) {
      issues.push(issue("UNKNOWN_ENUM", { path: `${path}.role`, developerMessage: "role not in participant vocab" }));
      return;
    }
    const link = p.linkToContactId ?? null;
    if (link !== null) {
      if (!resolvedContactIds.has(link)) {
        issues.push(issue("UNKNOWN_CONTACT", { path: `${path}.linkToContactId` }));
        return;
      }
      const resolved = resolvedContactById.get(link);
      if (resolved && resolved.organizationId !== context.activeOrganizationId) {
        issues.push(issue("CROSS_TENANT_REFERENCE", { path: `${path}.linkToContactId` }));
        return;
      }
    } else if (item.value.duplicatePossibility === true) {
      // Unresolved possible-duplicate contact must be decided in review.
      issues.push(issue("AMBIGUOUS_CONTACT", { path, developerMessage: "duplicate possible; no explicit link" }));
      return;
    }
    if (role === "client") hasClient = true;
    builtParticipants.push({
      role,
      displayNameHe: normalizeText(item.value.displayNameHe),
      kind: item.value.kind === "organization" || item.value.kind === "company" ? "company" : "person",
      linkToContactId: link,
      sourceItemId: item.id,
      provenance: toProvenance(rawDraft.draftId, item.provenance.ruleId, toNormalizedSpan(item.span)),
    });
    if (link === null) {
      warnings.push(warning("UNKNOWN_CONTACT_WILL_BE_CREATED", { path }));
      warnings.push(warning("UNLINKED_PARTICIPANT", { path }));
    }
  });

  // Duplicate participants (same contact identity + role) are a blocking issue.
  const participantDupeKey = (b: BuiltParticipant): string =>
    `${b.linkToContactId ?? `name:${b.displayNameHe}`}|${b.role}`;
  const seenParticipant = new Set<string>();
  const uniqueParticipants: BuiltParticipant[] = [];
  for (const b of builtParticipants) {
    const k = participantDupeKey(b);
    if (seenParticipant.has(k)) {
      issues.push(issue("DUPLICATE_PARTICIPANT", { developerMessage: `duplicate ${b.role}` }));
      continue;
    }
    seenParticipant.add(k);
    uniqueParticipants.push(b);
  }

  if (participantsConsidered === 0) {
    issues.push(issue("MISSING_CLIENT", { field: "participants", developerMessage: "no participants approved" }));
    infos.push(info("EMPTY_SECTION", { field: "participants" }));
  } else if (!hasClient) {
    issues.push(issue("MISSING_CLIENT", { field: "participants" }));
  }

  /* 9 — Facts. */
  const factById = new Map<string, FactItem>(draft.facts.map((f) => [f.id, f]));
  interface BuiltFact {
    readonly factKey: string;
    readonly statementHe: string;
    readonly status: IntakeFactStatus;
    readonly sourceItemId: string;
    readonly provenance: NormalizedProvenance;
  }
  const builtFacts: BuiltFact[] = [];
  const factsConsidered = approvals.facts.length;

  approvals.facts.forEach((a, idx) => {
    const path = `facts[${idx}]`;
    const item = factById.get(a.itemId);
    if (!item) {
      issues.push(issue("INVALID_FACT", { path, developerMessage: `itemId ${a.itemId} not in draft` }));
      return;
    }
    const factKey = normalizeText(item.value.factKey);
    const statementHe = normalizeText(a.statementHe ?? item.value.statementHe);
    if (factKey.length === 0 || statementHe.length === 0 || statementHe.length > MAX_STATEMENT_LEN) {
      issues.push(issue("INVALID_FACT", { path, developerMessage: "empty key/statement or statement too long" }));
      return;
    }
    const statusRaw = a.status ?? item.value.suggestedStatus;
    if (!isIntakeFactStatus(statusRaw)) {
      issues.push(issue("INVALID_EPISTEMIC_STATE", { path: `${path}.status`, developerMessage: `status ${statusRaw} not an intake status` }));
      return;
    }
    builtFacts.push({
      factKey,
      statementHe,
      status: statusRaw,
      sourceItemId: item.id,
      provenance: toProvenance(rawDraft.draftId, item.provenance.ruleId, toNormalizedSpan(item.span)),
    });
  });

  const factDedupe = dedupeBy(builtFacts, (f) => f.factKey);
  if (factDedupe.dropped > 0) infos.push(info("DUPLICATE_DROPPED", { field: "facts" }));
  const uniqueFacts = factDedupe.kept;
  if (factsConsidered === 0) infos.push(info("EMPTY_SECTION", { field: "facts" }));

  /* 10 — Deadlines. */
  const deadlineById = new Map<string, DeadlineItem>(draft.deadlines.map((d) => [d.id, d]));
  interface BuiltDeadline {
    readonly labelHe: string;
    readonly dueAt: string | null;
    readonly source: DeadlineSource;
    readonly confidence: DeadlineConfidence;
    readonly timezone: string;
    readonly strict: boolean;
    readonly basisHe: string | null;
    readonly sourceItemId: string;
  }
  const builtDeadlines: BuiltDeadline[] = [];
  const deadlinesConsidered = approvals.deadlines.length;

  approvals.deadlines.forEach((a, idx) => {
    const path = `deadlines[${idx}]`;
    const item = deadlineById.get(a.itemId);
    if (!item) {
      issues.push(issue("INVALID_DEADLINE", { path, developerMessage: `itemId ${a.itemId} not in draft` }));
      return;
    }
    const labelHe = normalizeText(item.value.labelHe);
    const source = matchEnum<DeadlineSource>(item.value.sourceType, DEADLINE_SOURCE_VALUES);
    const confidence = matchEnum<DeadlineConfidence>(item.value.deadlineConfidence, DEADLINE_CONFIDENCE_VALUES);
    if (labelHe.length === 0 || labelHe.length > MAX_LABEL_LEN || source === null || confidence === null) {
      issues.push(issue("INVALID_DEADLINE", { path, developerMessage: "bad label/source/confidence" }));
      return;
    }
    const dueAt = normalizeIsoDateOrNull(item.value.dueAt ?? null);
    // DB CHECK parity: known ⇒ date present; unknown ⇒ date absent.
    if (confidence === "known" && dueAt === null) {
      issues.push(issue("INVALID_DEADLINE", { path, developerMessage: "known confidence requires a date" }));
      return;
    }
    if (confidence === "unknown" && dueAt !== null) {
      issues.push(issue("INVALID_DEADLINE", { path, developerMessage: "unknown confidence must have no date" }));
      return;
    }
    let timezone = normalizeText(item.value.timezone);
    if (timezone.length === 0) {
      timezone = "Asia/Jerusalem";
      warnings.push(warning("UNKNOWN_TIMEZONE", { path }));
    }
    if (confidence === "estimated") {
      warnings.push(warning("APPROXIMATE_DATE", { path }));
      warnings.push(warning("LOW_CONFIDENCE_DEADLINE", { path }));
    } else if (confidence === "unknown") {
      warnings.push(warning("UNKNOWN_DATE", { path }));
    }
    builtDeadlines.push({
      labelHe,
      dueAt,
      source,
      confidence,
      timezone,
      strict: item.value.strict === true,
      basisHe: normalizeTextOrNull(item.value.basisHe ?? null),
      sourceItemId: item.id,
    });
  });

  const deadlineDedupe = dedupeBy(builtDeadlines, (d) => `${d.labelHe}|${d.dueAt ?? "∅"}`);
  if (deadlineDedupe.dropped > 0) infos.push(info("DUPLICATE_DROPPED", { field: "deadlines" }));
  const uniqueDeadlines = deadlineDedupe.kept;
  if (deadlinesConsidered === 0) infos.push(info("EMPTY_SECTION", { field: "deadlines" }));

  /* 11 — Evidence. */
  const evidenceById = new Map<string, EvidenceItem>(draft.evidenceRequirements.map((e) => [e.id, e]));
  interface BuiltEvidence {
    readonly labelHe: string;
    readonly mandatory: boolean;
    readonly sourceItemId: string;
  }
  const builtEvidence: BuiltEvidence[] = [];
  const evidenceConsidered = approvals.evidenceRequirements.length;

  approvals.evidenceRequirements.forEach((a, idx) => {
    const path = `evidenceRequirements[${idx}]`;
    const item = evidenceById.get(a.itemId);
    if (!item) {
      issues.push(issue("UNSUPPORTED_EVIDENCE", { path, developerMessage: `itemId ${a.itemId} not in draft` }));
      return;
    }
    const labelHe = normalizeText(item.value.labelHe);
    if (labelHe.length === 0 || labelHe.length > MAX_LABEL_LEN) {
      issues.push(issue("UNSUPPORTED_EVIDENCE", { path, developerMessage: "empty/oversized label" }));
      return;
    }
    const mandatory = item.value.mandatory === true;
    if (!mandatory) warnings.push(warning("WEAK_EVIDENCE", { path }));
    builtEvidence.push({ labelHe, mandatory, sourceItemId: item.id });
  });

  const evidenceDedupe = dedupeBy(builtEvidence, (e) => e.labelHe);
  if (evidenceDedupe.dropped > 0) infos.push(info("DUPLICATE_DROPPED", { field: "evidence" }));
  const uniqueEvidence = evidenceDedupe.kept;
  if (evidenceConsidered === 0) infos.push(info("EMPTY_SECTION", { field: "evidence" }));

  /* 12 — Cross-section advisories. */
  if (uniqueFacts.length < SPARSE_FACTS_THRESHOLD) warnings.push(warning("SPARSE_FACTS", { field: "facts" }));

  const stats = statistics(
    makeStat(participantsConsidered, uniqueParticipants.length),
    makeStat(factsConsidered, uniqueFacts.length),
    makeStat(deadlinesConsidered, uniqueDeadlines.length),
    makeStat(evidenceConsidered, uniqueEvidence.length),
    makeStat(participantsConsidered, uniqueParticipants.length),
    issues,
    warnings,
    infos,
  );

  /* Fail closed on any blocking issue — NEVER emit a normalized draft. */
  if (issues.length > 0) {
    return failedResult(issues, warnings, infos, version, stats);
  }

  /* ── Build the immutable ValidatedBootstrapDraft (deterministic order) ───── */

  const sortedParticipants = stableSortBy(
    uniqueParticipants,
    (p) => p.role,
    (p) => `${p.displayNameHe}|${p.sourceItemId}`,
  ).map<NormalizedParticipant>((p) =>
    Object.freeze({
      participantKey: planLocalKey("participant", p.linkToContactId, p.displayNameHe, p.role),
      role: p.role,
      displayNameHe: p.displayNameHe,
      kind: p.kind,
      linkToContactId: p.linkToContactId,
      sourceItemId: p.sourceItemId,
      provenance: Object.freeze(p.provenance),
    }),
  );

  const sortedFacts = stableSortBy(
    uniqueFacts,
    (f) => f.factKey,
    (f) => f.sourceItemId,
  ).map<NormalizedFact>((f) => Object.freeze({ ...f, provenance: Object.freeze(f.provenance) }));

  const sortedDeadlines = stableSortBy(
    uniqueDeadlines,
    (d) => d.labelHe,
    (d) => `${d.dueAt ?? "∅"}|${d.sourceItemId}`,
  ).map<NormalizedDeadline>((d) => Object.freeze({ ...d }));

  const sortedEvidence = stableSortBy(
    uniqueEvidence,
    (e) => e.labelHe,
    (e) => e.sourceItemId,
  ).map<NormalizedEvidence>((e) => Object.freeze({ ...e }));

  const normalizedMatter: NormalizedMatterHeader = Object.freeze({
    titleHe,
    // procedureType/confidentiality/aiPolicy are guaranteed non-null here (no issues).
    procedureType: procedureType as EmploymentProcedureType,
    forumHe: normalizeTextOrNull(approvals.matter.forumHe ?? null),
    confidentiality: confidentiality as MatterConfidentiality,
    aiPolicy: aiPolicy as AiPolicy,
    legalDomain: "labor",
  });

  const warningCodes = Object.freeze(
    Array.from(new Set(warnings.map((w) => w.code))).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
  );

  const normalizedMetadata = Object.freeze({
    organizationId: context.activeOrganizationId,
    sourceEngineVersion: rawDraft.engineVersion,
    validationVersion: version,
    warningCodes,
    counts: Object.freeze({
      participants: sortedParticipants.length,
      facts: sortedFacts.length,
      deadlines: sortedDeadlines.length,
      evidence: sortedEvidence.length,
    }),
  });

  // Hash covers NORMALIZED CONTENT ONLY — excludes validatedAt, correlation/actor
  // ids, warnings, and telemetry, so the same semantic draft always hashes equal.
  const hashPayload = {
    organizationId: context.activeOrganizationId,
    draftId: rawDraft.draftId,
    versionToken: rawDraft.versionToken,
    schemaVersion: rawDraft.schemaVersion,
    matter: normalizedMatter,
    participants: sortedParticipants.map((p) => ({
      role: p.role,
      displayNameHe: p.displayNameHe,
      kind: p.kind,
      linkToContactId: p.linkToContactId,
      sourceItemId: p.sourceItemId,
    })),
    facts: sortedFacts.map((f) => ({ factKey: f.factKey, statementHe: f.statementHe, status: f.status, sourceItemId: f.sourceItemId })),
    deadlines: sortedDeadlines.map((d) => ({
      labelHe: d.labelHe,
      dueAt: d.dueAt,
      source: d.source,
      confidence: d.confidence,
      timezone: d.timezone,
      strict: d.strict,
      basisHe: d.basisHe,
      sourceItemId: d.sourceItemId,
    })),
    evidence: sortedEvidence.map((e) => ({ labelHe: e.labelHe, mandatory: e.mandatory, sourceItemId: e.sourceItemId })),
  };
  const sourceInputHash = contentHash(hashPayload);

  const normalizedDraft: ValidatedBootstrapDraft = Object.freeze({
    sourceDraftId: rawDraft.draftId,
    sourceDraftVersionToken: rawDraft.versionToken,
    sourceDraftSchemaVersion: rawDraft.schemaVersion,
    sourceInputHash,
    validatedAt: context.validatedAt,
    validationVersion: version,
    normalizedMatter,
    normalizedParticipants: Object.freeze(sortedParticipants),
    normalizedFacts: Object.freeze(sortedFacts),
    normalizedDeadlines: Object.freeze(sortedDeadlines),
    normalizedEvidence: Object.freeze(sortedEvidence),
    normalizedMetadata,
  });

  return validResult(normalizedDraft, warnings, infos, version, stats);
}

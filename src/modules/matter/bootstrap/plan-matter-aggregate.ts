/**
 * Capability 1 · Slice 1.0.2 — the canonical Matter Aggregate Planner.
 *
 * `planMatterAggregate` is a PURE, deterministic domain transformation. It takes
 * exactly ONE immutable input — a `ValidatedBootstrapDraft` (the only legal
 * planner input, guaranteed well-formed by the Validation Engine) — and returns
 * exactly ONE immutable `MatterAggregatePlan`.
 *
 * It NEVER: reads repositories, queries Supabase, performs I/O, calls services/
 * AI/Workflow/Timeline/Search/Notifications, allocates database identifiers,
 * computes statutory dates, upgrades a fact's epistemic state, infers legal
 * conclusions/chronology, merges contradictory facts, or returns any executable
 * operation/command list. It returns ONE declarative aggregate.
 */

import type { ValidatedBootstrapDraft } from "./contracts.ts";
import {
  AggregatePlanningError,
  MATTER_AGGREGATE_PLANNER_VERSION,
  MATTER_AGGREGATE_VERSION,
  SUPPORTED_VALIDATION_VERSIONS,
  type AggregateCounts,
  type ContactClassification,
  type MatterAggregatePlan,
  type PlannedAudit,
  type PlannedContact,
  type PlannedDeadline,
  type PlannedEvidence,
  type PlannedFact,
  type PlannedMatter,
  type PlannedMember,
  type PlannedParticipant,
} from "./aggregate-contracts.ts";
import { contentHash } from "./hash.ts";
import { planLocalKey, stableSortBy } from "./normalize.ts";

/** Owner permissions are structural intent, not an authorization decision. */
const OWNER_CAN_REVIEW = true;
const OWNER_CAN_APPROVE = true;

/** Deterministic client-first ordering rank for participant roles. */
function roleRank(role: string): string {
  // "client" sorts before everything else; others keep code-unit order after a prefix.
  return role === "client" ? "0" : `1${role}`;
}

interface ContactAccumulator {
  readonly classification: ContactClassification;
  readonly contactId: string | null;
  readonly kind: PlannedContact["kind"];
  readonly nameHe: string;
  readonly sourceItemIds: string[];
}

export function planMatterAggregate(validated: ValidatedBootstrapDraft): MatterAggregatePlan {
  // Version compatibility — refuse an incompatible validation version (fail closed).
  if (!SUPPORTED_VALIDATION_VERSIONS.includes(validated.validationVersion)) {
    throw new AggregatePlanningError(
      "UNSUPPORTED_VALIDATION_VERSION",
      `planner ${MATTER_AGGREGATE_PLANNER_VERSION} cannot consume ${validated.validationVersion}`,
    );
  }

  /* ── Contacts (classify + dedup) ───────────────────────────────────────── */
  const contactOrder: string[] = [];
  const contactByIdentity = new Map<string, ContactAccumulator>();
  const identityForParticipant = new Map<string, string>();

  for (const p of validated.normalizedParticipants) {
    const classification: ContactClassification = p.linkToContactId !== null ? "link_existing" : "create_new";
    const identity =
      p.linkToContactId !== null ? `link:${p.linkToContactId}` : `new:${p.kind}:${p.displayNameHe}`;
    identityForParticipant.set(p.sourceItemId, identity);
    const existing = contactByIdentity.get(identity);
    if (existing) {
      existing.sourceItemIds.push(p.sourceItemId);
      continue;
    }
    contactOrder.push(identity);
    contactByIdentity.set(identity, {
      classification,
      contactId: p.linkToContactId,
      kind: p.kind,
      nameHe: p.displayNameHe,
      sourceItemIds: [p.sourceItemId],
    });
  }

  const contactKeyByIdentity = new Map<string, string>();
  const contactsUnsorted: PlannedContact[] = contactOrder.map((identity) => {
    const acc = contactByIdentity.get(identity)!;
    const contactKey = planLocalKey("contact", acc.classification, acc.contactId, acc.kind, acc.nameHe);
    contactKeyByIdentity.set(identity, contactKey);
    return {
      contactKey,
      classification: acc.classification,
      contactId: acc.contactId,
      kind: acc.kind,
      nameHe: acc.nameHe,
      sourceItemIds: Object.freeze([...acc.sourceItemIds].sort(cmp)),
    };
  });
  const contacts = stableSortBy(contactsUnsorted, (c) => `${c.classification}|${c.nameHe}`, (c) => c.contactKey).map(
    (c) => Object.freeze(c),
  );

  /* ── Participants (client-first, reference contacts by key) ─────────────── */
  const participantsUnsorted: PlannedParticipant[] = validated.normalizedParticipants.map((p) => {
    const identity = identityForParticipant.get(p.sourceItemId)!;
    const contactKey = contactKeyByIdentity.get(identity)!;
    return {
      participantKey: planLocalKey("participant", contactKey, p.role, p.sourceItemId),
      role: p.role,
      displayNameHe: p.displayNameHe,
      contactKey,
      sourceItemId: p.sourceItemId,
      provenance: p.provenance,
    };
  });
  const participants = stableSortBy(
    participantsUnsorted,
    (p) => `${roleRank(p.role)}|${p.displayNameHe}`,
    (p) => p.sourceItemId,
  ).map((p) => Object.freeze({ ...p, provenance: Object.freeze({ ...p.provenance }) }));

  /* ── Facts (epistemic state preserved EXACTLY; no merge, no upgrade) ────── */
  const factsUnsorted: PlannedFact[] = validated.normalizedFacts.map((f) => ({
    factPlanKey: planLocalKey("fact", f.factKey, f.sourceItemId),
    factKey: f.factKey,
    statementHe: f.statementHe,
    status: f.status,
    sourceItemId: f.sourceItemId,
    provenance: f.provenance,
  }));
  const facts = stableSortBy(factsUnsorted, (f) => f.factKey, (f) => f.sourceItemId).map((f) =>
    Object.freeze({ ...f, provenance: Object.freeze({ ...f.provenance }) }),
  );

  /* ── Deadlines (verbatim; NO statutory calculation) ─────────────────────── */
  const deadlinesUnsorted: PlannedDeadline[] = validated.normalizedDeadlines.map((d) => ({
    deadlineKey: planLocalKey("deadline", d.labelHe, d.dueAt, d.sourceItemId),
    labelHe: d.labelHe,
    dueAt: d.dueAt,
    source: d.source,
    confidence: d.confidence,
    timezone: d.timezone,
    strict: d.strict,
    basisHe: d.basisHe,
    sourceItemId: d.sourceItemId,
  }));
  const deadlines = stableSortBy(
    deadlinesUnsorted,
    (d) => `${d.labelHe}|${d.dueAt ?? ""}`,
    (d) => d.sourceItemId,
  ).map((d) => Object.freeze(d));

  /* ── Evidence (current matter_evidence schema only) ─────────────────────── */
  const evidenceUnsorted: PlannedEvidence[] = validated.normalizedEvidence.map((e) => ({
    evidenceKey: planLocalKey("evidence", e.labelHe, e.sourceItemId),
    labelHe: e.labelHe,
    mandatory: e.mandatory,
    status: "required" as const,
    sourceItemId: e.sourceItemId,
  }));
  const evidence = stableSortBy(evidenceUnsorted, (e) => e.labelHe, (e) => e.sourceItemId).map((e) => Object.freeze(e));

  /* ── Members (symbolic owner slot; NO authorization, NO profile id) ─────── */
  const members: PlannedMember[] = [
    Object.freeze({
      memberKey: planLocalKey("member", "owner", validated.sourceDraftId),
      slot: "owner" as const,
      matterRole: null,
      canReview: OWNER_CAN_REVIEW,
      canApprove: OWNER_CAN_APPROVE,
      bindProfileTo: "confirming_actor" as const,
    }),
  ];

  /* ── Matter header projection ───────────────────────────────────────────── */
  const matter: PlannedMatter = Object.freeze({
    titleHe: validated.normalizedMatter.titleHe,
    procedureType: validated.normalizedMatter.procedureType,
    // Pure default: topic mirrors the procedure type until a richer topic exists.
    topicHe: validated.normalizedMatter.procedureType,
    legalDomain: "labor" as const,
    confidentiality: validated.normalizedMatter.confidentiality,
    aiPolicy: validated.normalizedMatter.aiPolicy,
    forumHe: validated.normalizedMatter.forumHe,
    statusIntent: "open" as const,
  });

  /* ── Counts ─────────────────────────────────────────────────────────────── */
  const counts: AggregateCounts = Object.freeze({
    members: members.length,
    participants: participants.length,
    contacts: contacts.length,
    facts: facts.length,
    deadlines: deadlines.length,
    evidence: evidence.length,
  });

  /* ── Audit payload (non-confidential; identity/version/hash/counts only) ── */
  const audit: PlannedAudit = Object.freeze({
    auditKey: planLocalKey("audit", validated.sourceDraftId, validated.sourceInputHash),
    sourceDraftId: validated.sourceDraftId,
    sourceDraftVersionToken: validated.sourceDraftVersionToken,
    sourceDraftSchemaVersion: validated.sourceDraftSchemaVersion,
    validationVersion: validated.validationVersion,
    sourceInputHash: validated.sourceInputHash,
    validatedAt: validated.validatedAt,
    counts,
  });

  /* ── Plan hash (aggregate content only; excludes planHash/duration/stats) ─ */
  const hashable = {
    aggregateVersion: MATTER_AGGREGATE_VERSION,
    plannerVersion: MATTER_AGGREGATE_PLANNER_VERSION,
    validationVersion: validated.validationVersion,
    sourceDraftVersion: validated.sourceDraftVersionToken,
    sourceInputHash: validated.sourceInputHash,
    matter,
    members,
    participants,
    contacts,
    facts,
    deadlines,
    evidence,
    audit,
  };
  const planHash = contentHash(hashable);

  const metadata = Object.freeze({
    aggregateVersion: MATTER_AGGREGATE_VERSION,
    plannerVersion: MATTER_AGGREGATE_PLANNER_VERSION,
    validationVersion: validated.validationVersion,
    sourceDraftVersion: validated.sourceDraftVersionToken,
    sourceInputHash: validated.sourceInputHash,
    planHash,
    planningDurationMs: null,
    statistics: counts,
  });

  return Object.freeze({
    matter,
    members: Object.freeze(members),
    participants: Object.freeze(participants),
    contacts: Object.freeze(contacts),
    facts: Object.freeze(facts),
    deadlines: Object.freeze(deadlines),
    evidence: Object.freeze(evidence),
    audit,
    metadata,
  });
}

/** Deterministic code-unit comparator for stable id ordering. */
function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

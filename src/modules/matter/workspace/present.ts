/**
 * Matter Workspace — presenter (Capability 2, Slice 2.0.0). PURE + DETERMINISTIC.
 *
 * Maps parsed Capability-1 rows (`WorkspaceInput`) into the render-ready
 * `MatterWorkspaceView`. No React, no Supabase, no design-system, no wall clock
 * (the reference "now" is always passed in) — so every grouping/ordering/bucket
 * rule is unit-tested under `node --test --experimental-strip-types`.
 *
 * Rules encoded here (from the Matter Workspace design docs):
 *  - Facts grouped by EPISTEMIC status (established / alleged / disputed /
 *    unknown) — an allegation is never shown as an established fact.
 *  - Participants grouped by role in a fixed, stable order.
 *  - Documents ordered latest-first (capped), evidence split mandatory/optional.
 *  - Deadlines bucketed overdue / upcoming / unscheduled / completed; only
 *    non-empty buckets surface; the nearest actionable deadline is derived.
 *  - Timeline grouped by Jerusalem day, NEWEST FIRST, deterministic by
 *    (occurred_at desc, id desc) so it never reorders on refresh.
 *  - "priority" is DERIVED from real strict deadlines (never a fabricated field).
 */
import type {
  WorkspaceInput, MatterWorkspaceView, Tone,
  WorkspaceHero, WorkspacePriority,
  WorkspaceTimeline, TimelineEvent, TimelineDay, TimelineGlyphKind,
  WorkspaceFacts, FactView, FactGroupView, FactEpistemic,
  WorkspaceParticipants, ParticipantView, ParticipantGroupView,
  WorkspaceDocuments, DocumentView,
  WorkspaceEvidence, EvidenceView, EvidenceGroupView, EvidenceGroupKey,
  WorkspaceDeadlines, DeadlineView, DeadlineBucketView, DeadlineBucketKey,
} from "./types.ts";

/* --------------------------------------------------------------- constants */

export const DOCUMENTS_SHOWN = 6;
const UNKNOWN_HE = "לא ידוע";

/* --------------------------------------------------------------- label maps */

const PROCEDURE_HE: Record<string, string> = {
  pregnancy_dismissal: "פיטורי עובדת בהיריון",
  severance_claim: "תביעת פיצויי פיטורים",
  hearing_before_dismissal: "הליך שימוע לפני פיטורים",
  pre_dismissal_dispute: "תקופת הודעה מוקדמת וחלף הודעה",
  wage_overtime_claim: "תביעת שכר ושעות נוספות",
  pension_rights_claim: "תביעת זכויות פנסיה",
  discrimination_claim: "תביעת הפליה בעבודה",
  harassment_complaint: "תלונת הטרדה מינית בעבודה",
  regional_labor_court_civil: "הליך אזרחי בבית הדין האזורי לעבודה",
  appeal_to_national_labor_court: "ערעור לבית הדין הארצי לעבודה",
  national_insurance_claim: "תביעת ביטוח לאומי",
  settlement_enforcement: "פשרה ואכיפה",
};

const STAGE_HE: Record<string, string> = {
  intake: "קבלת תיק",
  assessment: "הערכה",
  fact_confirmation: "אימות עובדות",
  evidence_preservation: "שימור ראיות",
  pre_litigation: "טרום־התדיינות",
  filing: "הגשה",
  interim: "סעד ביניים",
  interim_relief: "סעד ביניים",
  pleadings: "כתבי טענות",
  disclosure: "גילוי מסמכים",
  hearing: "הוכחות",
  summations: "סיכומים",
  judgment: "פסק דין",
  remedy: "סעד",
  enforcement: "אכיפה",
  appeal: "ערעור",
  administrative: "הליך מנהלי",
  closed: "סגור",
};

const LEGAL_DOMAIN_HE: Record<string, string> = { labor: "דיני עבודה" };

const FACT_STATUS_HE: Record<string, string> = {
  confirmed: "מאומתת",
  document_derived: "נגזרת ממסמך",
  client_alleged: "טענת הלקוח",
  opposing_alleged: "טענת הצד שכנגד",
  disputed: "שנויה במחלוקת",
  unknown: "לא ידועה",
};

const ROLE_HE: Record<string, string> = {
  client: "לקוח",
  opposing_party: "צד שכנגד",
  related_party: "צד קשור",
  witness: "עד",
  expert: "מומחה",
  counsel: "בא כוח",
  mediator: "מגשר",
  insurer: "מבטח",
};

/** Fixed participant role order (determinism principle). */
const ROLE_ORDER: readonly string[] = [
  "client", "opposing_party", "related_party", "witness",
  "expert", "counsel", "mediator", "insurer",
];

const EVIDENCE_TYPE_HE: Record<string, string> = {
  document: "מסמך",
  testimony: "עדות",
  record: "רישום",
  communication: "תקשורת",
  expert: "חוות דעת",
  physical: "ראיה חפצית",
};

const EVIDENCE_STATUS_HE: Record<string, string> = {
  required: "נדרשת",
  collected: "נאספה",
  missing: "חסרה",
  disputed: "במחלוקת",
  inconclusive: "לא חד־משמעית",
};

const DOCUMENT_TYPE_HE: Record<string, string> = {
  correspondence: "תכתובת",
  contract: "חוזה",
  payslip: "תלוש שכר",
  dismissal_letter: "מכתב פיטורים",
  medical: "מסמך רפואי",
  court_filing: "כתב בי־דין",
  id_document: "מסמך מזהה",
  other: "אחר",
};

const APPROVAL_HE: Record<string, string> = {
  draft: "טיוטה",
  in_review: "בבדיקה",
  approved: "מאושר",
  rejected: "נדחה",
};

const DEADLINE_SOURCE_HE: Record<string, string> = {
  statute: "חוק",
  court_order: "החלטת בית משפט",
  contract: "חוזה",
  estimated: "הערכה",
  user_supplied: "הוזן ידנית",
};

const CONFIDENTIALITY_HE: Record<string, string> = {
  internal: "פנימי",
  client_confidential: "חסוי — לקוח",
  privileged: "חיסיון עו״ד–לקוח",
  standard: "רגיל",
  confidential: "חסוי",
  restricted: "מוגבל",
};

const ACTIVITY_KIND_HE: Record<string, string> = {
  matter_bootstrapped: "התיק נוצר",
  matter_created: "התיק נוצר",
  document_added: "נוסף מסמך",
  document_uploaded: "הועלה מסמך",
  fact_added: "נוספה עובדה",
  participant_added: "נוסף גורם",
  deadline_added: "נוסף מועד",
  note_added: "נוספה הערה",
};

function label(map: Record<string, string>, key: string, fallback: string): string {
  return map[key] ?? fallback;
}

/* --------------------------------------------------------------- date utils */

/** Jerusalem calendar-day key "YYYY-MM-DD" — deterministic, TZ-correct. */
export function jerusalemDayKey(iso: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(new Date(iso)); // en-CA → "YYYY-MM-DD"
}

function heDateLabel(iso: string): string {
  const fmt = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem", day: "numeric", month: "long", year: "numeric",
  });
  return fmt.format(new Date(iso));
}

function heDayLabel(iso: string): string {
  const fmt = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return fmt.format(new Date(iso));
}

function heTimeLabel(iso: string): string {
  const fmt = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  return fmt.format(new Date(iso));
}

/** Whole calendar-days between two Jerusalem days (target − now). */
export function dayDelta(nowISO: string, targetISO: string): number {
  const a = jerusalemDayKey(nowISO);
  const b = jerusalemDayKey(targetISO);
  const da = Date.UTC(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10)));
  const db = Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  return Math.round((db - da) / 86_400_000);
}

function relativeDaysHe(delta: number): string {
  if (delta === 0) return "היום";
  if (delta === 1) return "מחר";
  if (delta === -1) return "אתמול";
  if (delta > 1) return `בעוד ${delta} ימים`;
  return `לפני ${Math.abs(delta)} ימים`;
}

/* --------------------------------------------------------------- hero */

const STATUS_TONE: Record<string, { labelHe: string; tone: Tone }> = {
  open: { labelHe: "פעיל", tone: "progress" },
  closed: { labelHe: "סגור", tone: "completed" },
  archived: { labelHe: "בארכיון", tone: "waiting" },
};

function derivePriority(deadlines: WorkspaceDeadlines): WorkspacePriority {
  const overdueStrict = deadlines.buckets.some(
    (b) => b.key === "overdue" && b.items.some((d) => d.strict),
  );
  const imminentStrict = deadlines.buckets.some(
    (b) => b.key === "upcoming" &&
      b.items.some((d) => d.strict && d.daysRemaining !== null && d.daysRemaining <= 7),
  );
  if (overdueStrict) return { level: "urgent", labelHe: "דחוף", tone: "urgent" };
  if (imminentStrict) return { level: "high", labelHe: "גבוה", tone: "today" };
  return { level: "normal", labelHe: "רגיל", tone: "progress" };
}

function buildHero(input: WorkspaceInput, deadlines: WorkspaceDeadlines): WorkspaceHero {
  const h = input.header;
  const status = STATUS_TONE[h.status] ?? { labelHe: h.status, tone: "progress" as Tone };
  return {
    titleHe: h.titleHe,
    procedureLabelHe: label(PROCEDURE_HE, h.procedureType, h.procedureType),
    legalDomainHe: label(LEGAL_DOMAIN_HE, h.legalDomain, h.legalDomain),
    stageLabelHe: label(STAGE_HE, h.currentStageId, h.currentStageId),
    clientNameHe: input.clientNameHe ?? UNKNOWN_HE,
    responsibleLawyerHe: input.responsibleLawyerHe ?? UNKNOWN_HE,
    createdAtISO: h.openedAtISO,
    createdLabelHe: heDateLabel(h.openedAtISO),
    statusLabelHe: status.labelHe,
    statusTone: status.tone,
    priority: derivePriority(deadlines),
    fileNoHe: h.fileNoHe,
    forumHe: h.forumHe,
    confidentialityHe: h.confidentiality ? label(CONFIDENTIALITY_HE, h.confidentiality, h.confidentiality) : null,
  };
}

/* --------------------------------------------------------------- timeline */

const ACTIVITY_GLYPH: Record<string, TimelineGlyphKind> = {
  matter_bootstrapped: "created",
  matter_created: "created",
  document_added: "document",
  document_uploaded: "document",
  fact_added: "fact",
  participant_added: "participant",
  deadline_added: "deadline",
  note_added: "note",
};

function buildTimeline(input: WorkspaceInput): WorkspaceTimeline {
  const events: TimelineEvent[] = input.activity.map((a) => ({
    id: a.id,
    occurredAtISO: a.occurredAtISO,
    timeLabelHe: heTimeLabel(a.occurredAtISO),
    kind: a.kind,
    kindLabelHe: label(ACTIVITY_KIND_HE, a.kind, a.kind),
    descriptionHe: a.descriptionHe,
    actorHe: a.actorHe,
    glyph: ACTIVITY_GLYPH[a.kind] ?? "generic",
  }));

  // Newest first, deterministic by (occurred_at desc, id desc).
  events.sort((x, y) => {
    if (x.occurredAtISO !== y.occurredAtISO) return x.occurredAtISO < y.occurredAtISO ? 1 : -1;
    return x.id < y.id ? 1 : -1;
  });

  const byDay = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const key = jerusalemDayKey(e.occurredAtISO);
    const list = byDay.get(key);
    if (list) list.push(e);
    else byDay.set(key, [e]);
  }

  const days: TimelineDay[] = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0)) // newest day first
    .map(([dayISO, dayEvents]) => ({
      dayISO,
      dayLabelHe: heDayLabel(dayEvents[0].occurredAtISO),
      events: dayEvents,
    }));

  return { days, total: events.length };
}

/* --------------------------------------------------------------- facts */

const FACT_EPISTEMIC: Record<string, FactEpistemic> = {
  confirmed: "established",
  document_derived: "established",
  client_alleged: "alleged",
  opposing_alleged: "alleged",
  disputed: "disputed",
  unknown: "unknown",
};

const FACT_GROUP_META: Record<FactEpistemic, { labelHe: string; tone: Tone }> = {
  established: { labelHe: "עובדות מבוססות", tone: "completed" },
  alleged: { labelHe: "טענות", tone: "scheduled" },
  disputed: { labelHe: "שנוי במחלוקת", tone: "risk" },
  unknown: { labelHe: "לא מסווג", tone: "waiting" },
};

const FACT_GROUP_ORDER: readonly FactEpistemic[] = ["established", "alleged", "disputed", "unknown"];

function buildFacts(input: WorkspaceInput): WorkspaceFacts {
  const byGroup = new Map<FactEpistemic, FactView[]>();
  for (const f of input.facts) {
    const epistemic = FACT_EPISTEMIC[f.status] ?? "unknown";
    const view: FactView = {
      id: f.id,
      factKey: f.factKey,
      statementHe: f.statementHe,
      statusLabelHe: label(FACT_STATUS_HE, f.status, f.status),
      epistemic,
      tone: FACT_GROUP_META[epistemic].tone,
      sourceHe: f.sourceHe,
    };
    const list = byGroup.get(epistemic);
    if (list) list.push(view);
    else byGroup.set(epistemic, [view]);
  }

  const groups: FactGroupView[] = [];
  for (const key of FACT_GROUP_ORDER) {
    const facts = byGroup.get(key);
    if (!facts || facts.length === 0) continue;
    facts.sort((a, b) => a.factKey.localeCompare(b.factKey, "he") || (a.id < b.id ? -1 : 1));
    groups.push({ key, labelHe: FACT_GROUP_META[key].labelHe, tone: FACT_GROUP_META[key].tone, facts });
  }

  return { groups, total: input.facts.length };
}

/* --------------------------------------------------------------- participants */

function buildParticipants(input: WorkspaceInput): WorkspaceParticipants {
  const active = input.participants.filter((p) => !p.archived);
  const byRole = new Map<string, ParticipantView[]>();
  for (const p of active) {
    const view: ParticipantView = {
      id: p.id,
      nameHe: p.nameHe ?? UNKNOWN_HE,
      kind: p.kind,
      roleLabelHe: label(ROLE_HE, p.role, p.role),
      idNumberHe: p.idNumberHe,
      responsivenessHe: null,
    };
    const list = byRole.get(p.role);
    if (list) list.push(view);
    else byRole.set(p.role, [view]);
  }

  const orderedRoles = [
    ...ROLE_ORDER.filter((r) => byRole.has(r)),
    ...[...byRole.keys()].filter((r) => !ROLE_ORDER.includes(r)).sort(),
  ];

  const groups: ParticipantGroupView[] = orderedRoles.map((role) => {
    const participants = byRole.get(role) ?? [];
    participants.sort((a, b) => a.nameHe.localeCompare(b.nameHe, "he") || (a.id < b.id ? -1 : 1));
    return { role, roleLabelHe: label(ROLE_HE, role, role), participants };
  });

  return { groups, total: active.length };
}

/* --------------------------------------------------------------- documents */

const APPROVAL_TONE: Record<string, Tone> = {
  approved: "completed",
  in_review: "scheduled",
  rejected: "risk",
  draft: "waiting",
};

function buildDocuments(input: WorkspaceInput): WorkspaceDocuments {
  const sorted = [...input.documents].sort((a, b) =>
    a.createdAtISO < b.createdAtISO ? 1 : a.createdAtISO > b.createdAtISO ? -1 : (a.id < b.id ? 1 : -1),
  );
  const items: DocumentView[] = sorted.slice(0, DOCUMENTS_SHOWN).map((d) => ({
    id: d.id,
    titleHe: d.titleHe,
    documentTypeLabelHe: label(DOCUMENT_TYPE_HE, d.documentType, d.documentType),
    evidenceTypeLabelHe: label(EVIDENCE_TYPE_HE, d.evidenceType, d.evidenceType),
    approvalLabelHe: label(APPROVAL_HE, d.approvalState, d.approvalState),
    approvalTone: APPROVAL_TONE[d.approvalState] ?? "progress",
    dateLabelHe: d.dateISO ? heDateLabel(d.dateISO) : null,
  }));
  return { items, total: input.documents.length, shown: items.length };
}

/* --------------------------------------------------------------- evidence */

const EVIDENCE_TONE: Record<string, Tone> = {
  collected: "completed",
  required: "waiting",
  missing: "risk",
  disputed: "risk",
  inconclusive: "scheduled",
};

const EVIDENCE_STATUS_ORDER: Record<string, number> = {
  missing: 0, disputed: 1, required: 2, inconclusive: 3, collected: 4,
};

function buildEvidenceGroup(key: EvidenceGroupKey, labelHe: string, rows: EvidenceView[]): EvidenceGroupView {
  const items = [...rows].sort((a, b) => {
    const oa = EVIDENCE_STATUS_ORDER[statusFromLabel(a.statusLabelHe)] ?? 9;
    const ob = EVIDENCE_STATUS_ORDER[statusFromLabel(b.statusLabelHe)] ?? 9;
    if (oa !== ob) return oa - ob;
    return a.labelHe.localeCompare(b.labelHe, "he") || (a.id < b.id ? -1 : 1);
  });
  const collected = items.filter((i) => i.tone === "completed").length;
  return { key, labelHe, items, collected, total: items.length };
}

// reverse-lookup only used for stable status ordering above
const STATUS_FROM_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(EVIDENCE_STATUS_HE).map(([k, v]) => [v, k]),
);
function statusFromLabel(labelHe: string): string {
  return STATUS_FROM_LABEL[labelHe] ?? "required";
}

function buildEvidence(input: WorkspaceInput): WorkspaceEvidence {
  const mandatory: EvidenceView[] = [];
  const optional: EvidenceView[] = [];
  for (const e of input.evidence) {
    const view: EvidenceView = {
      id: e.id,
      labelHe: e.labelHe,
      evidenceTypeLabelHe: label(EVIDENCE_TYPE_HE, e.evidenceType, e.evidenceType),
      statusLabelHe: label(EVIDENCE_STATUS_HE, e.status, e.status),
      tone: EVIDENCE_TONE[e.status] ?? "waiting",
      mandatory: e.mandatory,
    };
    (e.mandatory ? mandatory : optional).push(view);
  }
  const groups: EvidenceGroupView[] = [];
  if (mandatory.length) groups.push(buildEvidenceGroup("mandatory", "ראיות חובה", mandatory));
  if (optional.length) groups.push(buildEvidenceGroup("optional", "ראיות משלימות", optional));
  return { groups, total: input.evidence.length };
}

/* --------------------------------------------------------------- deadlines */

const DEADLINE_BUCKET_META: Record<DeadlineBucketKey, { labelHe: string; tone: Tone }> = {
  overdue: { labelHe: "חלף המועד", tone: "urgent" },
  upcoming: { labelHe: "מתקרבים", tone: "scheduled" },
  unscheduled: { labelHe: "ללא מועד", tone: "waiting" },
  completed: { labelHe: "הושלמו", tone: "completed" },
};

const DEADLINE_BUCKET_ORDER: readonly DeadlineBucketKey[] = ["overdue", "upcoming", "unscheduled", "completed"];

function classifyDeadline(nowISO: string, dueAtISO: string | null): { bucket: DeadlineBucketKey; delta: number | null } {
  if (!dueAtISO) return { bucket: "unscheduled", delta: null };
  const delta = dayDelta(nowISO, dueAtISO);
  return { bucket: delta < 0 ? "overdue" : "upcoming", delta };
}

function deadlineTone(bucket: DeadlineBucketKey, delta: number | null): Tone {
  if (bucket === "overdue") return "urgent";
  if (bucket === "unscheduled") return "waiting";
  if (bucket === "completed") return "completed";
  return delta !== null && delta <= 7 ? "today" : "scheduled"; // upcoming
}

function buildDeadlines(input: WorkspaceInput): WorkspaceDeadlines {
  const byBucket = new Map<DeadlineBucketKey, DeadlineView[]>();
  for (const d of input.deadlines) {
    const { bucket, delta } = classifyDeadline(input.nowISO, d.dueAtISO);
    const view: DeadlineView = {
      id: d.id,
      labelHe: d.labelHe,
      dueLabelHe: d.dueAtISO ? heDateLabel(d.dueAtISO) : null,
      relativeHe: delta === null ? null : relativeDaysHe(delta),
      strict: d.strict,
      basisHe: d.basisHe,
      sourceLabelHe: label(DEADLINE_SOURCE_HE, d.source, d.source),
      tone: deadlineTone(bucket, delta),
      daysRemaining: delta,
    };
    const list = byBucket.get(bucket);
    if (list) list.push(view);
    else byBucket.set(bucket, [view]);
  }

  const buckets: DeadlineBucketView[] = [];
  for (const key of DEADLINE_BUCKET_ORDER) {
    const items = byBucket.get(key);
    if (!items || items.length === 0) continue;
    items.sort(sortByDue);
    buckets.push({ key, labelHe: DEADLINE_BUCKET_META[key].labelHe, tone: DEADLINE_BUCKET_META[key].tone, items });
  }

  return { buckets, total: input.deadlines.length, nearest: deriveNearest(byBucket) };
}

function sortByDue(a: DeadlineView, b: DeadlineView): number {
  if (a.daysRemaining === null && b.daysRemaining === null) return a.id < b.id ? -1 : 1;
  if (a.daysRemaining === null) return 1;
  if (b.daysRemaining === null) return -1;
  if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
  return a.id < b.id ? -1 : 1;
}

/** The single deadline the lawyer should act on: most-overdue first, else soonest upcoming. */
function deriveNearest(byBucket: Map<DeadlineBucketKey, DeadlineView[]>): DeadlineView | null {
  const overdue = [...(byBucket.get("overdue") ?? [])].sort(sortByDue);
  if (overdue.length) return overdue[0];
  const upcoming = [...(byBucket.get("upcoming") ?? [])].sort(sortByDue);
  if (upcoming.length) return upcoming[0];
  const unscheduledStrict = (byBucket.get("unscheduled") ?? []).filter((d) => d.strict);
  return unscheduledStrict[0] ?? null;
}

/* --------------------------------------------------------------- compose */

export function buildWorkspaceView(input: WorkspaceInput): MatterWorkspaceView {
  const deadlines = buildDeadlines(input);
  return {
    matterId: input.header.id,
    slug: input.header.slug,
    hero: buildHero(input, deadlines),
    timeline: buildTimeline(input),
    facts: buildFacts(input),
    participants: buildParticipants(input),
    documents: buildDocuments(input),
    evidence: buildEvidence(input),
    deadlines,
  };
}

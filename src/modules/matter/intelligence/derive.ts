/**
 * MatterIntelligence deriver (Capability 2, Slice 2.1.0). PURE + DETERMINISTIC.
 *
 * `buildMatterIntelligence(source)` computes the one canonical, immutable Matter
 * read model from the raw `MatterSource` — WITHOUT any AI. All health, risk,
 * completeness, attention, timing, relationship and known-unknown intelligence
 * is derived by explicit, testable rules with an injected reference "now".
 * The result is deep-frozen: consumers can rely on it never mutating.
 */
import type { MatterSource } from "./source.ts";
import { dayDelta } from "./time.ts";
import type {
  MatterIntelligence, FactEpistemic, DeadlineBucket, RiskLevel, PriorityLevel,
  MatterHealthStatus, PartyRecord, FactRecord, DocumentRecord, EvidenceRecord,
  DeadlineRecord, TimelineRecord, OutstandingIssue, KnownUnknown, IssueSeverity,
} from "./types.ts";

export const MATTER_INTELLIGENCE_VERSION = "matter-intelligence-v1";

const RECENT_ACTIVITY_DAYS = 14;
const DORMANT_DAYS = 30;
const IMMINENT_DAYS = 7;

/* ------------------------------------------------------------ label maps */

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
  intake: "קבלת תיק", assessment: "הערכה", fact_confirmation: "אימות עובדות",
  evidence_preservation: "שימור ראיות", pre_litigation: "טרום־התדיינות", filing: "הגשה",
  interim: "סעד ביניים", interim_relief: "סעד ביניים", pleadings: "כתבי טענות",
  disclosure: "גילוי מסמכים", hearing: "הוכחות", summations: "סיכומים", judgment: "פסק דין",
  remedy: "סעד", enforcement: "אכיפה", appeal: "ערעור", administrative: "הליך מנהלי", closed: "סגור",
};

const FACT_EPISTEMIC: Record<string, FactEpistemic> = {
  confirmed: "established", document_derived: "established",
  client_alleged: "alleged", opposing_alleged: "alleged",
  disputed: "disputed", unknown: "unknown",
};

const HEALTH_HE: Record<MatterHealthStatus, string> = {
  healthy: "תקין", attention: "דורש תשומת לב", at_risk: "בסיכון", critical: "קריטי", dormant: "רדום",
};

function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

/* ------------------------------------------------------------ small helpers */

function classifyDeadlineBucket(nowISO: string, dueAtISO: string | null): { bucket: DeadlineBucket; days: number | null } {
  if (!dueAtISO) return { bucket: "unscheduled", days: null };
  const days = dayDelta(nowISO, dueAtISO);
  return { bucket: days < 0 ? "overdue" : "upcoming", days };
}

function clamp0to100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

/* ------------------------------------------------------------ the deriver */

export function buildMatterIntelligence(source: MatterSource): MatterIntelligence {
  const now = source.nowISO;
  const h = source.header;
  const statusOpen = h.status === "open";

  /* -- entity records ----------------------------------------------------- */
  const activeParticipants = source.participants.filter((p) => !p.archived);
  const participants: PartyRecord[] = activeParticipants.map((p) => ({
    id: p.id, role: p.role, nameHe: p.nameHe, kind: p.kind,
    contactId: p.contactId ?? null, idNumberHe: p.idNumberHe,
  }));

  const facts: FactRecord[] = source.facts.map((f) => {
    const epistemic = FACT_EPISTEMIC[f.status] ?? "unknown";
    return {
      id: f.id, factKey: f.factKey, statementHe: f.statementHe, status: f.status,
      epistemic, established: epistemic === "established", sourceHe: f.sourceHe,
    };
  });

  const documents: DocumentRecord[] = source.documents.map((d) => ({
    id: d.id, titleHe: d.titleHe, documentType: d.documentType, evidenceType: d.evidenceType,
    approvalState: d.approvalState, approved: d.approvalState === "approved",
    dateISO: d.dateISO, createdAtISO: d.createdAtISO,
  }));

  const evidence: EvidenceRecord[] = source.evidence.map((e) => ({
    id: e.id, labelHe: e.labelHe, evidenceType: e.evidenceType, mandatory: e.mandatory,
    status: e.status, collected: e.status === "collected",
  }));

  const deadlines: DeadlineRecord[] = source.deadlines.map((d) => {
    const { bucket, days } = classifyDeadlineBucket(now, d.dueAtISO);
    return {
      id: d.id, labelHe: d.labelHe, dueAtISO: d.dueAtISO, strict: d.strict, basisHe: d.basisHe,
      source: d.source, confidence: d.confidence, bucket, daysRemaining: days,
    };
  });

  const timeline: TimelineRecord[] = source.activity
    .map((a) => ({ id: a.id, occurredAtISO: a.occurredAtISO, kind: a.kind, descriptionHe: a.descriptionHe, actorHe: a.actorHe }))
    .sort((x, y) => (x.occurredAtISO !== y.occurredAtISO ? (x.occurredAtISO < y.occurredAtISO ? 1 : -1) : (x.id < y.id ? 1 : -1)));

  /* -- client + responsible lawyer --------------------------------------- */
  const clientParticipant = activeParticipants.find((p) => p.role === "client");
  const clientNameHe = source.clientNameHe ?? clientParticipant?.nameHe ?? null;
  const client = {
    present: clientNameHe !== null || clientParticipant !== undefined,
    nameHe: clientNameHe,
    participantId: clientParticipant?.id ?? null,
    contactId: clientParticipant?.contactId ?? null,
  };
  const responsibleLawyer = { present: source.responsibleLawyerHe !== null, nameHe: source.responsibleLawyerHe };

  /* -- counts ------------------------------------------------------------- */
  const establishedFacts = facts.filter((f) => f.epistemic === "established").length;
  const allegedFacts = facts.filter((f) => f.epistemic === "alleged").length;
  const disputedFacts = facts.filter((f) => f.epistemic === "disputed").length;
  const unknownFacts = facts.filter((f) => f.epistemic === "unknown").length;
  const approvedDocuments = documents.filter((d) => d.approved).length;
  const mandatoryEvidence = evidence.filter((e) => e.mandatory).length;
  const collectedMandatoryEvidence = evidence.filter((e) => e.mandatory && e.collected).length;
  const missingMandatoryEvidenceCount = mandatoryEvidence - collectedMandatoryEvidence;
  const overdue = deadlines.filter((d) => d.bucket === "overdue");
  const upcoming = deadlines.filter((d) => d.bucket === "upcoming");
  const unscheduled = deadlines.filter((d) => d.bucket === "unscheduled");

  const counts = {
    facts: facts.length, establishedFacts, allegedFacts, disputedFacts, unknownFacts,
    participants: participants.length, documents: documents.length, approvedDocuments,
    evidence: evidence.length, mandatoryEvidence, collectedMandatoryEvidence,
    missingMandatoryEvidence: missingMandatoryEvidenceCount,
    deadlines: deadlines.length, overdueDeadlines: overdue.length,
    upcomingDeadlines: upcoming.length, unscheduledDeadlines: unscheduled.length,
    timelineEvents: timeline.length,
  };

  /* -- relationships ------------------------------------------------------ */
  const participantRoleCounts: Record<string, number> = {};
  for (const p of participants) participantRoleCounts[p.role] = (participantRoleCounts[p.role] ?? 0) + 1;
  const factsWithSource = facts.filter((f) => f.sourceHe !== null).length;
  const relationships = {
    participantRoleCounts,
    rolesPresent: Object.keys(participantRoleCounts).sort(),
    hasClient: client.present,
    hasOpposingParty: (participantRoleCounts.opposing_party ?? 0) > 0,
    factsWithSource,
    factsWithoutSource: facts.length - factsWithSource,
  };

  /* -- timing ------------------------------------------------------------- */
  const ageDays = Math.max(0, dayDelta(h.openedAtISO, now));
  const lastActivityISO = timeline.length ? timeline[0].occurredAtISO : null;
  const daysSinceLastActivity = lastActivityISO !== null ? Math.max(0, dayDelta(lastActivityISO, now)) : null;
  const recentActivity = daysSinceLastActivity !== null && daysSinceLastActivity <= RECENT_ACTIVITY_DAYS;
  const dormant = statusOpen && daysSinceLastActivity !== null && daysSinceLastActivity > DORMANT_DAYS;
  const timelineDensityPer30d = Math.round((timeline.length / Math.max(ageDays, 1)) * 30 * 10) / 10;

  const datedFuture = [...upcoming].sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));
  const datedOverdue = [...overdue].sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0)); // most-overdue first
  const nearest = datedOverdue[0] ?? datedFuture[0] ?? null;

  const timing = {
    openedAtISO: h.openedAtISO, ageDays, lastActivityISO, daysSinceLastActivity,
    recentActivity, dormant, timelineDensityPer30d,
    nearestDeadlineISO: nearest?.dueAtISO ?? null, nearestDeadlineDays: nearest?.daysRemaining ?? null,
  };

  /* -- completeness ------------------------------------------------------- */
  const missingMandatoryEvidence = missingMandatoryEvidenceCount > 0;
  const comp = {
    hasClient: client.present,
    hasResponsibleLawyer: responsibleLawyer.present,
    hasParticipants: participants.length > 0,
    hasOpposingParty: relationships.hasOpposingParty,
    hasFacts: facts.length > 0,
    hasEstablishedFacts: establishedFacts > 0,
    hasDocuments: documents.length > 0,
    hasEvidence: evidence.length > 0,
    hasDeadlines: deadlines.length > 0,
    missingMandatoryEvidence,
  };
  const completenessScore = clamp0to100(
    (comp.hasClient ? 20 : 0) + (comp.hasResponsibleLawyer ? 10 : 0) +
    (comp.hasParticipants ? 10 : 0) + (comp.hasOpposingParty ? 10 : 0) +
    (comp.hasFacts ? 15 : 0) + (comp.hasEstablishedFacts ? 10 : 0) +
    (comp.hasDocuments ? 10 : 0) + (comp.hasEvidence ? 10 : 0) + (comp.hasDeadlines ? 5 : 0),
  );

  /* -- outstanding issues + known unknowns -------------------------------- */
  const overdueStrict = overdue.some((d) => d.strict);
  const overdueSoft = overdue.some((d) => !d.strict);
  const unscheduledStrict = unscheduled.some((d) => d.strict);
  const imminentStrict = upcoming.some((d) => d.strict && d.daysRemaining !== null && d.daysRemaining <= IMMINENT_DAYS);

  const issues: OutstandingIssue[] = [];
  const push = (code: string, severity: IssueSeverity, labelHe: string, detailHe: string | null, relatedIds: string[]) =>
    issues.push({ code, severity, labelHe, detailHe, relatedIds });

  if (!comp.hasClient) push("MISSING_CLIENT", "critical", "לקוח חסר", "לא זוהה לקוח בתיק", []);
  if (!comp.hasResponsibleLawyer) push("NO_RESPONSIBLE_LAWYER", "warning", "אין עורך דין אחראי", null, []);
  if (!comp.hasParticipants) push("MISSING_PARTICIPANTS", "warning", "אין גורמים מעורבים", null, []);
  else if (!comp.hasOpposingParty) push("MISSING_OPPOSING_PARTY", "info", "לא זוהה צד שכנגד", null, []);
  if (overdueStrict) push("OVERDUE_STRICT_DEADLINE", "critical", "מועד מחייב שחלף", "קיים מועד מחייב שחלף", overdue.filter((d) => d.strict).map((d) => d.id));
  else if (overdueSoft) push("OVERDUE_DEADLINE", "warning", "מועד שחלף", null, overdue.filter((d) => !d.strict).map((d) => d.id));
  if (unscheduledStrict) push("UNSCHEDULED_STRICT_DEADLINE", "warning", "מועד מחייב ללא תאריך", "קיים מועד מחייב שתאריכו טרם נקבע", unscheduled.filter((d) => d.strict).map((d) => d.id));
  if (missingMandatoryEvidence) push("MISSING_MANDATORY_EVIDENCE", "warning", "ראיות חובה חסרות", `${missingMandatoryEvidenceCount} ראיות חובה טרם נאספו`, evidence.filter((e) => e.mandatory && !e.collected).map((e) => e.id));
  if (!comp.hasFacts) push("NO_FACTS", "warning", "לא הוזנו עובדות", null, []);
  if (disputedFacts > 0) push("UNRESOLVED_DISPUTED_FACTS", "info", "עובדות שנויות במחלוקת", `${disputedFacts} עובדות שנויות במחלוקת`, facts.filter((f) => f.epistemic === "disputed").map((f) => f.id));
  if (!comp.hasDocuments) push("NO_DOCUMENTS", "info", "לא הועלו מסמכים", null, []);
  if (dormant) push("DORMANT_MATTER", "warning", "תיק רדום", `אין פעילות מזה ${daysSinceLastActivity} ימים`, []);

  const knownUnknowns: KnownUnknown[] = [];
  const ku = (code: string, labelHe: string, questionHe: string, blocking: boolean) =>
    knownUnknowns.push({ code, labelHe, questionHe, blocking });
  if (!comp.hasClient) ku("MISSING_CLIENT", "זהות הלקוח", "מיהו הלקוח בתיק?", true);
  if (comp.hasParticipants && !comp.hasOpposingParty) ku("MISSING_OPPOSING_PARTY", "זהות הצד שכנגד", "מיהו הצד שכנגד?", false);
  if (!comp.hasFacts) ku("MISSING_FACTS", "עובדות מהותיות", "מהן העובדות המהותיות של התיק?", true);
  if (disputedFacts > 0) ku("UNRESOLVED_DISPUTED_FACTS", "עובדות במחלוקת", "כיצד ייושבו העובדות השנויות במחלוקת?", false);
  if (missingMandatoryEvidence) ku("MISSING_MANDATORY_EVIDENCE", "ראיות חובה", "אילו ראיות חובה חסרות וכיצד ייאספו?", true);
  if (unscheduledStrict) ku("UNSCHEDULED_STRICT_DEADLINE", "מועד מחייב", "מהו התאריך המדויק של המועד המחייב?", true);
  if (!comp.hasResponsibleLawyer) ku("NO_RESPONSIBLE_LAWYER", "אחריות מקצועית", "מי עורך הדין האחראי על התיק?", false);

  /* -- risk + health + scores -------------------------------------------- */
  let risk: RiskLevel = "low";
  if (overdueStrict || !comp.hasClient) risk = "critical";
  else if (overdueSoft || missingMandatoryEvidence || unscheduledStrict || imminentStrict) risk = "high";
  else if (!comp.hasFacts || disputedFacts > 0 || !comp.hasParticipants || dormant) risk = "moderate";

  let healthStatus: MatterHealthStatus;
  if (risk === "critical") healthStatus = "critical";
  else if (dormant) healthStatus = "dormant";
  else if (risk === "high") healthStatus = "at_risk";
  else if (risk === "moderate") healthStatus = "attention";
  else healthStatus = "healthy";

  let priority: PriorityLevel = "normal";
  if (overdueStrict || !comp.hasClient) priority = "urgent";
  else if (imminentStrict || overdueSoft || missingMandatoryEvidence) priority = "high";

  const attention = clamp0to100(
    (overdueStrict ? 40 : 0) + (overdueSoft ? 20 : 0) + (imminentStrict ? 25 : 0) +
    (unscheduledStrict ? 15 : 0) + (!comp.hasClient ? 20 : 0) + (missingMandatoryEvidence ? 15 : 0) +
    (dormant ? 15 : 0) + (!comp.hasFacts ? 10 : 0) + (disputedFacts > 0 ? 5 : 0),
  );

  const health = { status: healthStatus, labelHe: HEALTH_HE[healthStatus], riskLevel: risk, reasons: issues.map((i) => i.code) };
  const scores = { completeness: completenessScore, attention, risk, priority };

  /* -- assemble + freeze -------------------------------------------------- */
  const model: MatterIntelligence = {
    meta: { version: MATTER_INTELLIGENCE_VERSION, engine: "matter-intelligence-deriver", generatedAtISO: now },
    identity: {
      matterId: h.id, slug: h.slug, titleHe: h.titleHe, fileNoHe: h.fileNoHe, forumHe: h.forumHe,
      legalDomain: h.legalDomain, procedureType: h.procedureType, procedureLabelHe: labelOf(PROCEDURE_HE, h.procedureType),
      topic: h.topic, status: h.status, confidentiality: h.confidentiality, openedAtISO: h.openedAtISO,
    },
    stage: { currentStageId: h.currentStageId, stageLabelHe: labelOf(STAGE_HE, h.currentStageId) },
    client, responsibleLawyer, participants, facts, documents, evidence, deadlines, timeline,
    relationships, counts, timing, completeness: { ...comp, score: completenessScore },
    health, scores, outstandingIssues: issues, knownUnknowns,
  };

  return deepFreeze(model);
}

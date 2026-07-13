/** Deterministic Matter fixtures for Epic 4 tests. asOf is fixed. */
import type { Matter } from "../types.ts";

const AS_OF = "2026-07-12";

/** Base skeleton; individual fixtures override the parts they exercise. */
function base(): Matter {
  return {
    id: "MAT-0001",
    titleHe: "פיטורי עובדת בהיריון — בדיקה",
    legalDomain: "labor",
    procedureType: "pregnancy_dismissal",
    topic: "pregnancy_dismissal",
    currentStageId: "preg-2", // fact_confirmation stage
    openedAt: "2026-05-01",
    client: {
      id: "CLI-1", nameHe: "לקוחה", responsiveness: "responsive",
      aiPolicy: "allowed_with_review", confidentiality: "client_confidential",
      lastContactAt: "2026-07-05",
    },
    facts: [],
    documents: [],
    evidence: [],
    deadlines: [],
    communications: [],
    financials: {
      feeArrangementHe: "שכר טרחה לפי שעה", billedAmount: 10000, collectedAmount: 8000,
      outstandingAmount: 2000, currency: "ILS", writeOffRiskHe: null,
    },
    team: [
      { id: "T1", role: "partner", nameHe: "שותפה", openTasks: 3, capacityLoad: 0.6 },
      { id: "T2", role: "lawyer", nameHe: "עו\"ד", openTasks: 5, capacityLoad: 0.7 },
    ],
    availableLegislationRefIds: ["E3B-LEG-007", "E3B-LEG-008"],
    asOf: AS_OF,
  };
}

/** A matter early in fact-confirmation: facts missing/alleged, mandatory
 *  evidence uncollected, a STRICT deadline already overdue, slow client. */
export function earlyBlockedMatter(): Matter {
  const m = base();
  m.facts = [
    { field: "employment_duration", statementHe: "הועסקה כשנה", status: "confirmed", source: "תלוש" },
    { field: "dismissal_date", statementHe: "פוטרה במאי", status: "client_alleged", source: "לקוחה" },
    // employer_knowledge and permit_status intentionally absent
  ];
  m.evidence = [
    { id: "preg-e1", labelHe: "אישור העסקה ומשך העסקה", evidenceType: "document", collected: false, mandatory: true },
    { id: "preg-e2", labelHe: "ראיה לידיעת המעסיק על ההיריון", evidenceType: "communication", collected: false, mandatory: true },
  ];
  m.deadlines = [
    { id: "dl-strict", labelHe: "מועד קשיח שחלף", dueDate: "2026-07-01", strict: true, basisHe: "בדיקה" },
    { id: "dl-soon", labelHe: "מועד מתקרב", dueDate: "2026-07-15", strict: false, basisHe: "בדיקה" },
  ];
  m.client.responsiveness = "slow";
  m.communications = [
    { id: "c1", at: "2026-05-10", direction: "inbound", channel: "email", awaitingResponse: true, summaryHe: "פנייה ראשונה" },
  ];
  return m;
}

/** A matter ready to advance: all required facts confirmed, mandatory evidence
 *  collected, no overdue deadlines, responsive client. */
export function readyMatter(): Matter {
  const m = base();
  m.facts = [
    { field: "employment_duration", statementHe: "8 חודשים", status: "confirmed", source: "תלוש" },
    { field: "employer_knowledge", statementHe: "המעסיק ידע", status: "confirmed", source: "תכתובת" },
    { field: "permit_status", statementHe: "לא ניתן היתר", status: "confirmed", source: "בדיקה" },
    { field: "dismissal_date", statementHe: "1.6.2026", status: "document_derived", source: "מכתב פיטורים" },
  ];
  m.evidence = [
    { id: "preg-e1", labelHe: "אישור העסקה ומשך העסקה", evidenceType: "document", collected: true, mandatory: true },
    { id: "preg-e2", labelHe: "ראיה לידיעת המעסיק על ההיריון", evidenceType: "communication", collected: true, mandatory: true },
  ];
  m.deadlines = [
    { id: "dl-far", labelHe: "התיישנות", dueDate: "2033-01-01", strict: true, basisHe: "התיישנות" },
  ];
  m.communications = [
    { id: "c1", at: "2026-07-08", direction: "outbound", channel: "email", awaitingResponse: false, summaryHe: "עדכון ללקוחה" },
  ];
  return m;
}

/** A matter whose client prohibits AI processing — a hard policy block. */
export function aiProhibitedMatter(): Matter {
  const m = readyMatter();
  m.client.aiPolicy = "prohibited";
  return m;
}

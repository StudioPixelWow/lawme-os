/**
 * Matter App — demo fixture (Sprint 1).
 * A single, complete, deterministic `Matter` used by the Matter App route until
 * the real datastore lands (Sprint 26). Deterministic `asOf` so the room renders
 * identically every time. This is demo data, not a test fixture — production code
 * reads it through the same adapter it will use for real matters.
 */
import type { Matter } from "../types.ts";

const DEMO_MATTER: Matter = {
  id: "demo",
  titleHe: "פיטורי עובדת בהיריון — כהן נ׳ טק־לייף",
  forumHe: "בית הדין האזורי לעבודה תל אביב",
  legalDomain: "labor",
  procedureType: "pregnancy_dismissal",
  topic: "pregnancy_dismissal",
  currentStageId: "preg-2", // אימות עובדות מכריעות
  openedAt: "2026-05-01",
  client: {
    id: "cli-cohen",
    nameHe: "דנה כהן",
    responsiveness: "slow",
    aiPolicy: "allowed_with_review",
    confidentiality: "client_confidential",
    lastContactAt: "2026-07-05",
  },
  facts: [
    { field: "employment_duration", statementHe: "הועסקה כ-11 חודשים", status: "confirmed", source: "תלושי שכר" },
    { field: "dismissal_date", statementHe: "פוטרה ב-15.6.2026", status: "document_derived", source: "מכתב הפיטורים" },
    { field: "permit_status", statementHe: "לא ניתן היתר מהממונה", status: "confirmed", source: "בדיקה מול הלקוחה" },
    { field: "employer_knowledge", statementHe: "טרם אומת אם המעסיק ידע על ההיריון", status: "unknown", source: "" },
  ],
  documents: [
    { id: "doc-dismissal", kindHe: "מכתב פיטורים", present: true, requiredForStage: "assessment" },
  ],
  evidence: [
    { id: "preg-e1", labelHe: "אישור העסקה ומשך העסקה", evidenceType: "document", collected: true, mandatory: true },
    { id: "preg-e2", labelHe: "ראיה לידיעת המעסיק על ההיריון", evidenceType: "communication", collected: false, mandatory: true },
  ],
  deadlines: [
    { id: "dl-hearing", labelHe: "דיון מקדמי", dueDate: "2026-07-16", strict: true, basisHe: "זימון לדיון מקדמי בבית הדין" },
    { id: "dl-limitation", labelHe: "התיישנות תביעה אזרחית", dueDate: "2033-06-15", strict: true, basisHe: "התיישנות כללית" },
  ],
  communications: [
    { id: "comm-intake", at: "2026-05-01", direction: "inbound", channel: "meeting", awaitingResponse: false, summaryHe: "פגישת פתיחה עם הלקוחה" },
    { id: "comm-question", at: "2026-07-05", direction: "inbound", channel: "email", awaitingResponse: true, summaryHe: "שאלה מהלקוחה על המשך הטיפול" },
  ],
  financials: {
    feeArrangementHe: "שכר טרחה לפי שעה",
    billedAmount: 8200,
    collectedAmount: 6000,
    outstandingAmount: 2200,
    currency: "ILS",
    writeOffRiskHe: null,
  },
  team: [
    { id: "tm-partner", role: "partner", nameHe: "עו״ד מאיה", openTasks: 2, capacityLoad: 0.55 },
    { id: "tm-senior", role: "senior_lawyer", nameHe: "עו״ד לאה שרון", openTasks: 4, capacityLoad: 0.68 },
    { id: "tm-lawyer", role: "lawyer", nameHe: "עו״ד עדן כהן", openTasks: 6, capacityLoad: 0.72 },
  ],
  availableLegislationRefIds: ["E3B-LEG-007", "E3B-LEG-008"],
  asOf: "2026-07-12",
};

/** Return the demo matter, anchored to the route's id so the room reflects it. */
export function getDemoMatter(id: string): Matter {
  return { ...DEMO_MATTER, id };
}

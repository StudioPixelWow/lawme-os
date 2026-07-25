/**
 * Matter Workspace — deterministic demo fixture (Slice 2.0.0).
 *
 * A realistic, fully-populated pregnancy-dismissal matter, shaped exactly like
 * the parsed Capability-1 rows the loader produces. Drives the dev preview route
 * (screenshots) and the presenter unit tests — NEVER a production data source.
 * The reference "now" is passed in so the fixture is stable and time-anchored.
 */
import type { WorkspaceInput, MatterWorkspaceView } from "./types.ts";
import { buildWorkspaceView } from "./present.ts";

/** The date the preview/screenshots are anchored to. */
export const FIXTURE_NOW_ISO = "2026-07-25T09:00:00+03:00";

export function workspaceFixtureInput(nowISO: string = FIXTURE_NOW_ISO): WorkspaceInput {
  return {
    nowISO,
    header: {
      id: "00000000-0000-4000-8000-0000000000d1",
      slug: "kohen-pregnancy",
      titleHe: "פיטורי דנה כהן בתקופת היריון",
      fileNoHe: "2026-0412",
      forumHe: "בית הדין האזורי לעבודה — תל אביב",
      legalDomain: "labor",
      procedureType: "pregnancy_dismissal",
      topic: "pregnancy_dismissal",
      currentStageId: "assessment",
      status: "open",
      openedAtISO: "2026-07-16T08:30:00+03:00",
      confidentiality: "privileged",
    },
    clientNameHe: "דנה כהן",
    responsibleLawyerHe: "עו״ד ליאת שרון",
    facts: [
      { id: "f1", factKey: "employment_duration", statementHe: "העובדת הועסקה שלוש שנים ברציפות עד למועד הפיטורים.", status: "document_derived", sourceHe: "תלושי שכר 2023–2025" },
      { id: "f2", factKey: "pregnancy_status", statementHe: "העובדת הייתה בהיריון במועד הפיטורים.", status: "confirmed", sourceHe: "אישור רפואי" },
      { id: "f3", factKey: "employer_knowledge", statementHe: "המעסיק ידע על ההיריון טרם הפיטורים.", status: "client_alleged", sourceHe: "תצהיר הלקוחה" },
      { id: "f4", factKey: "dismissal_reason", statementHe: "לטענת המעסיק הפיטורים נעשו מטעמי צמצום ארגוני.", status: "opposing_alleged", sourceHe: "מכתב המעסיק" },
      { id: "f5", factKey: "permit_status", statementHe: "האם התבקש היתר פיטורים ממשרד העבודה — שנוי במחלוקת.", status: "disputed", sourceHe: null },
    ],
    participants: [
      { id: "p1", role: "client", nameHe: "דנה כהן", kind: "person", idNumberHe: "••• ••• 214", responsiveness: "responsive", archived: false },
      { id: "p2", role: "opposing_party", nameHe: "חברת אלפא שירותים בע״מ", kind: "company", idNumberHe: "51-••• •••", responsiveness: null, archived: false },
      { id: "p3", role: "witness", nameHe: "רות לוי", kind: "person", idNumberHe: null, responsiveness: null, archived: false },
      { id: "p4", role: "counsel", nameHe: "עו״ד מיכאל שגב", kind: "person", idNumberHe: null, responsiveness: null, archived: false },
    ],
    documents: [
      { id: "d1", titleHe: "מכתב הפיטורים", documentType: "dismissal_letter", evidenceType: "document", approvalState: "approved", dateISO: "2026-07-10T00:00:00+03:00", createdAtISO: "2026-07-19T11:05:00+03:00" },
      { id: "d2", titleHe: "תלושי שכר 2023–2025", documentType: "payslip", evidenceType: "record", approvalState: "in_review", dateISO: "2026-07-05T00:00:00+03:00", createdAtISO: "2026-07-18T09:40:00+03:00" },
      { id: "d3", titleHe: "תכתובת דוא״ל עם המעסיק", documentType: "correspondence", evidenceType: "communication", approvalState: "draft", dateISO: null, createdAtISO: "2026-07-17T16:20:00+03:00" },
    ],
    evidence: [
      { id: "e1", labelHe: "אישור העסקה ומשך העסקה", evidenceType: "document", mandatory: true, status: "collected" },
      { id: "e2", labelHe: "ראיה לידיעת המעסיק על ההיריון", evidenceType: "communication", mandatory: true, status: "required" },
      { id: "e3", labelHe: "חוות דעת רפואית", evidenceType: "expert", mandatory: false, status: "missing" },
    ],
    deadlines: [
      { id: "dl1", labelHe: "הגשת בקשה לסעד זמני להשבה לעבודה", dueAtISO: "2026-07-30T12:00:00+03:00", strict: true, basisHe: "סעד ביניים דחוף — חשש לנזק בלתי הפיך", source: "court_order", confidence: "known" },
      { id: "dl2", labelHe: "השלמת מכתב דרישה למעסיק", dueAtISO: "2026-07-22T12:00:00+03:00", strict: false, basisHe: "פנייה מקדימה טרם הליך", source: "user_supplied", confidence: "estimated" },
      { id: "dl3", labelHe: "מועד להגשת ערעור לבית הדין הארצי", dueAtISO: null, strict: true, basisHe: "נגזר ממועד מתן פסק הדין — טעון אימות", source: "court_order", confidence: "unknown" },
    ],
    activity: [
      { id: "a1", occurredAtISO: "2026-07-16T08:30:00+03:00", kind: "matter_bootstrapped", descriptionHe: "התיק נוצר ממנוע ה-Bootstrap עם 5 עובדות, 4 גורמים ו-3 מועדים.", actorHe: "עו״ד ליאת שרון" },
      { id: "a2", occurredAtISO: "2026-07-18T09:40:00+03:00", kind: "document_uploaded", descriptionHe: "הועלו תלושי שכר לשנים 2023–2025.", actorHe: "עו״ד ליאת שרון" },
      { id: "a3", occurredAtISO: "2026-07-19T11:05:00+03:00", kind: "document_uploaded", descriptionHe: "הועלה מכתב הפיטורים.", actorHe: "עו״ד ליאת שרון" },
      { id: "a4", occurredAtISO: "2026-07-19T11:20:00+03:00", kind: "fact_added", descriptionHe: "נוספה עובדה: ידיעת המעסיק על ההיריון (טענת הלקוחה).", actorHe: "עו״ד ליאת שרון" },
    ],
  };
}

export function workspaceFixtureView(nowISO: string = FIXTURE_NOW_ISO): MatterWorkspaceView {
  return buildWorkspaceView(workspaceFixtureInput(nowISO));
}

/** A brand-new, allegation-thin matter — proves "empty never looks broken". */
export function workspaceEmptyFixtureInput(nowISO: string = FIXTURE_NOW_ISO): WorkspaceInput {
  return {
    nowISO,
    header: {
      id: "00000000-0000-4000-8000-0000000000e0",
      slug: "new-matter",
      titleHe: "תיק חדש — טרם הוזנו פרטים",
      fileNoHe: null,
      forumHe: null,
      legalDomain: "labor",
      procedureType: "severance_claim",
      topic: "severance_claim",
      currentStageId: "intake",
      status: "open",
      openedAtISO: nowISO,
      confidentiality: null,
    },
    clientNameHe: null,
    responsibleLawyerHe: null,
    facts: [],
    participants: [],
    documents: [],
    evidence: [],
    deadlines: [],
    activity: [
      { id: "a1", occurredAtISO: nowISO, kind: "matter_bootstrapped", descriptionHe: "התיק נוצר.", actorHe: null },
    ],
  };
}

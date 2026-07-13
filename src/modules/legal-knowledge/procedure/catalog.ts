/**
 * Employment procedure catalog (Epic 3B Triad, Pillar C).
 * A small, deeply-connected set of real Israeli employment-law procedures.
 * Each stage links to governing legislation (the real statute records
 * captured this epic), required evidence, deadlines, and actions, with
 * provenance and law-vs-best-practice separation. NOT a flat checklist.
 */
import type {
  Procedure, ProcedureGraph, ProcedureStage, SourceLink, StageTransition,
} from "./types.ts";
import { PROCEDURE_GRAPH_VERSION } from "./graph.ts";

export const CATALOG_VERSION = "employment-procedure-catalog-1.0.0";

/* real statute permalinks captured from the National Legislation Database */
const URL_WOMEN = "https://main.knesset.gov.il/apps/legislation/main/laws/2001135";
const URL_SEVERANCE = "https://main.knesset.gov.il/apps/legislation/main/laws/2001162";
const URL_NOTICE = "https://main.knesset.gov.il/apps/legislation/main/laws/2000283";
// URL_NOTICE is referenced by the prior-notice procedure's governing law.

const law = (citationHe: string, url: string | null, refId: string | null = null): SourceLink =>
  ({ kind: "legislation", refId, citationHe, canonicalUrl: url, authority: "mandatory_law", verification: "verified" });
const caseLaw = (citationHe: string, refId: string | null): SourceLink =>
  ({ kind: "case_law", refId, citationHe, canonicalUrl: null, authority: "recommended", verification: "unverified" });
const practice = (citationHe: string): SourceLink =>
  ({ kind: "professional_practice", refId: null, citationHe, canonicalUrl: null, authority: "best_practice", verification: "unverified" });
const courtRule = (citationHe: string): SourceLink =>
  ({ kind: "court_rules", refId: null, citationHe, canonicalUrl: null, authority: "mandatory_law", verification: "unverified" });

/* ---------------- Flagship: dismissal during pregnancy ---------------- */

const pregnancyStages: ProcedureStage[] = [
  {
    id: "preg-1", procedureId: "proc-pregnancy", orderIndex: 1, titleHe: "קבלת פרטים (Intake)",
    kind: "intake", actor: "lawyer", authorityOrCourt: null,
    requiredFacts: ["employment_relationship", "employment_duration", "pregnancy_status"],
    evidence: [], documents: [],
    deadlines: [], actions: [{ id: "preg-a1", labelHe: "תיעוד פרטי הפנייה ושאלון עובדות", actor: "lawyer", kind: "advise", requiresHumanApproval: true, sources: [practice("שאלון אינטייק — נוהג מקצועי")], riskHe: null }],
    risksHe: ["איסוף עובדות חלקי עלול להוביל למסקנה שגויה"], exceptionsHe: [],
    sources: [practice("שלב אינטייק — נוהג מקצועי, אינו חובה סטטוטורית")],
  },
  {
    id: "preg-2", procedureId: "proc-pregnancy", orderIndex: 2, titleHe: "אימות עובדות מכריעות",
    kind: "fact_confirmation", actor: "lawyer", authorityOrCourt: null,
    requiredFacts: ["employment_duration", "employer_knowledge", "permit_status", "dismissal_date"],
    evidence: [
      { id: "preg-e1", labelHe: "אישור העסקה ומשך העסקה", evidenceType: "document", mandatory: true, whyHe: "הגנת סעיף 9 מותנית בשישה חודשי העסקה", sources: [law("חוק עבודת נשים, סעיף 9", URL_WOMEN, "E3B-LEG-007")] },
      { id: "preg-e2", labelHe: "ראיה לידיעת המעסיק על ההיריון", evidenceType: "communication", mandatory: true, whyHe: "רלוונטי לעילת ההפליה ולסעדים", sources: [law("חוק עבודת נשים", URL_WOMEN, "E3B-LEG-007")] },
    ],
    documents: [], deadlines: [],
    actions: [{ id: "preg-a2", labelHe: "אין להניח עובדות חסרות — יש לאמת מול הלקוח והמסמכים", actor: "lawyer", kind: "collect_evidence", requiresHumanApproval: true, sources: [practice("איסוף ראיות — נוהג מקצועי")], riskHe: "הנחת עובדה שגויה מסכנת את התיק" }],
    risksHe: ["עובדה שנויה במחלוקת (ידיעת מעסיק) עלולה לחסום מסקנה"], exceptionsHe: [],
    sources: [law("חוק עבודת נשים, סעיף 9 — התקופה המוגנת", URL_WOMEN, "E3B-LEG-007")],
  },
  {
    id: "preg-3", procedureId: "proc-pregnancy", orderIndex: 3, titleHe: "שימור ראיות ומסמכי הפיטורים",
    kind: "evidence_preservation", actor: "lawyer", authorityOrCourt: null,
    requiredFacts: ["dismissal_date"],
    evidence: [{ id: "preg-e3", labelHe: "מכתב הפיטורים והתכתובות", evidenceType: "document", mandatory: true, whyHe: "בסיס ראייתי לעילה ולסעד", sources: [practice("שימור ראיות — נוהג מקצועי")] }],
    documents: [], deadlines: [],
    actions: [{ id: "preg-a3", labelHe: "שמירת כל התכתובות והמסמכים במקור", actor: "lawyer", kind: "collect_evidence", requiresHumanApproval: true, sources: [practice("שימור ראיות")], riskHe: "אובדן ראיה מהותית" }],
    risksHe: [], exceptionsHe: [],
    sources: [practice("שימור ראיות — נוהג מקצועי")],
  },
  {
    id: "preg-4", procedureId: "proc-pregnancy", orderIndex: 4, titleHe: "הערכת חובת ההיתר וההליך",
    kind: "assessment", actor: "lawyer", authorityOrCourt: "ministry_of_labor",
    requiredFacts: ["permit_status", "hearing_held"],
    evidence: [], documents: [],
    deadlines: [],
    actions: [{ id: "preg-a4", labelHe: "בדיקה אם ניתן היתר פיטורים והאם קוים שימוע", actor: "lawyer", kind: "advise", requiresHumanApproval: true, sources: [law("חוק עבודת נשים, סעיף 9 — חובת היתר", URL_WOMEN, "E3B-LEG-007")], riskHe: null }],
    risksHe: ["פיטורים ללא היתר — בטלים/מזכים בסעד"], exceptionsHe: ["חריגים לחובת ההיתר בנסיבות מסוימות"],
    sources: [law("חוק עבודת נשים, סעיף 9", URL_WOMEN, "E3B-LEG-007"), caseLaw("הלכת בית הדין הארצי בעניין פיטורי היריון (לאימות)", null)],
  },
  {
    id: "preg-5", procedureId: "proc-pregnancy", orderIndex: 5, titleHe: "זיהוי סעדים דחופים ופנייה מקדימה",
    kind: "pre_litigation", actor: "lawyer", authorityOrCourt: null,
    requiredFacts: [],
    evidence: [],
    documents: [{ id: "preg-d1", labelHe: "מכתב דרישה למעסיק", docType: "demand_letter", templateAvailable: false, sources: [practice("מכתב דרישה — נוהג מקצועי")] }],
    deadlines: [],
    actions: [{ id: "preg-a5", labelHe: "משלוח מכתב דרישה ובחינת סעד ביניים", actor: "lawyer", kind: "draft", requiresHumanApproval: true, sources: [practice("פנייה מקדימה")], riskHe: null }],
    risksHe: [], exceptionsHe: [],
    sources: [practice("פנייה מקדימה לפני הליך — נוהג מקצועי")],
  },
  {
    id: "preg-6", procedureId: "proc-pregnancy", orderIndex: 6, titleHe: "קביעת פורום והגשת הליך",
    kind: "filing", actor: "lawyer", authorityOrCourt: "regional_labor_court",
    requiredFacts: [],
    evidence: [], documents: [{ id: "preg-d2", labelHe: "כתב תביעה / בקשה לסעד זמני", docType: "pleading", templateAvailable: false, sources: [courtRule("תקנות בית הדין לעבודה (סדרי דין)")] }],
    deadlines: [{ id: "preg-dl1", labelHe: "התיישנות תביעה אזרחית בדיני עבודה", basis: "statute_of_limitations", days: null, years: 7, strict: true, sources: [law("חוק ההתיישנות — כללי (לאימות מול העילה הספציפית)", null)], calculationNoteHe: "התיישנות כללית 7 שנים; עילות מסוימות בעלות מועדים קצרים יותר — יש לאמת" }],
    actions: [{ id: "preg-a6", labelHe: "הגשת ההליך לבית הדין האזורי לעבודה", actor: "lawyer", kind: "file", requiresHumanApproval: true, sources: [courtRule("תקנות בית הדין לעבודה")], riskHe: "פורום שגוי" }],
    risksHe: ["הגשה לפורום שאינו מוסמך"], exceptionsHe: [],
    sources: [courtRule("סמכות בית הדין האזורי לעבודה")],
  },
  {
    id: "preg-7", procedureId: "proc-pregnancy", orderIndex: 7, titleHe: "בקשה לסעד ביניים (אם רלוונטי)",
    kind: "interim_relief", actor: "lawyer", authorityOrCourt: "regional_labor_court",
    requiredFacts: [],
    evidence: [{ id: "preg-e4", labelHe: "תצהיר תומך", evidenceType: "document", mandatory: true, whyHe: "בקשה לסעד זמני נתמכת בתצהיר", sources: [courtRule("תקנות סדר הדין — סעד זמני")] }],
    documents: [{ id: "preg-d3", labelHe: "תצהיר", docType: "affidavit", templateAvailable: false, sources: [courtRule("תקנות סדר הדין")] }],
    deadlines: [], actions: [{ id: "preg-a7", labelHe: "בקשת סעד זמני להשבה לעבודה/מניעת פיטורים", actor: "lawyer", kind: "request_relief", requiresHumanApproval: true, sources: [courtRule("סעד זמני")], riskHe: null }],
    risksHe: [], exceptionsHe: [],
    sources: [courtRule("סעד זמני בבית הדין לעבודה")],
  },
  {
    id: "preg-8", procedureId: "proc-pregnancy", orderIndex: 8, titleHe: "הוכחות ופסק דין",
    kind: "hearing", actor: "regional_labor_court", authorityOrCourt: "regional_labor_court",
    requiredFacts: [], evidence: [], documents: [], deadlines: [],
    actions: [{ id: "preg-a8", labelHe: "ניהול שלב ההוכחות עד למתן פסק דין", actor: "lawyer", kind: "advise", requiresHumanApproval: true, sources: [courtRule("סדרי דין")], riskHe: null }],
    risksHe: [], exceptionsHe: [],
    sources: [courtRule("סדרי דין בבית הדין לעבודה")],
  },
  {
    id: "preg-9", procedureId: "proc-pregnancy", orderIndex: 9, titleHe: "ערעור או אכיפה",
    kind: "appeal", actor: "lawyer", authorityOrCourt: "national_labor_court",
    requiredFacts: [], evidence: [], documents: [],
    deadlines: [{ id: "preg-dl2", labelHe: "מועד להגשת ערעור לבית הדין הארצי", basis: "from_judgment", days: 30, years: null, strict: true, sources: [courtRule("מועד ערעור — לאימות מול התקנות")], calculationNoteHe: "מועד ערעור נפוץ 30 יום — יש לאמת מול התקנות העדכניות" }],
    actions: [{ id: "preg-a9", labelHe: "בחינת ערעור לבית הדין הארצי או אכיפת פסק הדין", actor: "lawyer", kind: "appeal", requiresHumanApproval: true, sources: [courtRule("ערעור לבית הדין הארצי")], riskHe: "החמצת מועד ערעור" }],
    risksHe: ["החמצת מועד הערעור חוסמת את הזכות"], exceptionsHe: [],
    sources: [courtRule("ערעור בזכות לבית הדין הארצי לעבודה")],
  },
];

const pregnancyTransitions: StageTransition[] = [
  { from: "preg-1", to: "preg-2", conditionHe: "פרטי אינטייק נאספו", kind: "next", triggerHe: null },
  { from: "preg-2", to: "preg-3", conditionHe: "עובדות מכריעות אומתו", kind: "next", triggerHe: null },
  { from: "preg-3", to: "preg-4", conditionHe: "ראיות נשמרו", kind: "next", triggerHe: null },
  { from: "preg-4", to: "preg-5", conditionHe: "הוערכה חובת ההיתר", kind: "next", triggerHe: null },
  { from: "preg-5", to: "preg-6", conditionHe: "פנייה מקדימה לא הביאה לפתרון", kind: "conditional", triggerHe: "היעדר מענה/דחייה" },
  { from: "preg-6", to: "preg-7", conditionHe: "נדרש סעד דחוף", kind: "alternative", triggerHe: "דחיפות" },
  { from: "preg-6", to: "preg-8", conditionHe: "אין צורך בסעד ביניים", kind: "next", triggerHe: null },
  { from: "preg-7", to: "preg-8", conditionHe: "הוכרעה בקשת הביניים", kind: "next", triggerHe: null },
  { from: "preg-8", to: "preg-9", conditionHe: "ניתן פסק דין", kind: "next", triggerHe: null },
];

const pregnancyProcedure: Procedure = {
  id: "proc-pregnancy", type: "pregnancy_dismissal", titleHe: "פיטורי עובדת בהיריון",
  descriptionHe: "מסלול טיפול במחלוקת פיטורי עובדת בהיריון — מאינטייק ועד ערעור/אכיפה.",
  legalDomain: "labor", rootStageId: "preg-1",
  governingLegislation: [law("חוק עבודת נשים, התשי\"ד-1954 (סעיף 9)", URL_WOMEN, "E3B-LEG-007"), law("חוק שוויון ההזדמנויות בעבודה", null, "E3B-LEG-008")],
  shapingCaseLaw: [caseLaw("פסיקת בית הדין הארצי בעניין פיטורי היריון (לאיסוף ואימות)", null)],
  stages: pregnancyStages, transitions: pregnancyTransitions,
  limitationsHe: ["הפסיקה המעצבת טרם אומתה בקורפוס — מסומן כחסר", "מועדי ערעור/התיישנות טעונים אימות מול התקנות העדכניות"],
  version: CATALOG_VERSION,
};

/* ---------------- Lighter but real procedures (core stages) ---------------- */

function simpleProcedure(
  id: string, type: Procedure["type"], titleHe: string, descriptionHe: string,
  governing: SourceLink[], stageSpecs: { titleHe: string; kind: ProcedureStage["kind"]; actor: ProcedureStage["actor"] }[],
  limitationsHe: string[],
): Procedure {
  const stages: ProcedureStage[] = stageSpecs.map((s, i) => ({
    id: `${id}-${i + 1}`, procedureId: id, orderIndex: i + 1, titleHe: s.titleHe, kind: s.kind,
    actor: s.actor, authorityOrCourt: null, requiredFacts: [], evidence: [], documents: [], deadlines: [], actions: [],
    risksHe: [], exceptionsHe: [], sources: governing.slice(0, 1),
  }));
  const transitions: StageTransition[] = stages.slice(0, -1).map((s, i) => ({ from: s.id, to: stages[i + 1].id, conditionHe: "השלב הקודם הושלם", kind: "next", triggerHe: null }));
  return {
    id, type, titleHe, descriptionHe, legalDomain: "labor", rootStageId: stages[0].id,
    governingLegislation: governing, shapingCaseLaw: [], stages, transitions,
    limitationsHe, version: CATALOG_VERSION,
  };
}

const INTAKE = { titleHe: "אינטייק ואימות עובדות", kind: "intake" as const, actor: "lawyer" as const };
const EVID = { titleHe: "איסוף ושימור ראיות", kind: "evidence_preservation" as const, actor: "lawyer" as const };
const PRELIT = { titleHe: "פנייה מקדימה / מכתב דרישה", kind: "pre_litigation" as const, actor: "lawyer" as const };
const FILE = { titleHe: "הגשת הליך לבית הדין האזורי", kind: "filing" as const, actor: "lawyer" as const };
const HEAR = { titleHe: "הוכחות ופסק דין", kind: "hearing" as const, actor: "regional_labor_court" as const };

export const EMPLOYMENT_PROCEDURES: Procedure[] = [
  pregnancyProcedure,
  simpleProcedure("proc-severance", "severance_claim", "תביעת פיצויי פיטורים",
    "מסלול תביעה לפיצויי פיטורים, כולל התפטרות בדין מפוטר.",
    [law("חוק פיצויי פיטורים, התשכ\"ג-1963", URL_SEVERANCE, "E3B-LEG-001")],
    [INTAKE, EVID, PRELIT, FILE, HEAR],
    ["דוקטרינת ההרעה המוחשית טעונה אימות פסיקה", "רכיבי שכר להוכחה"]),
  simpleProcedure("proc-hearing", "hearing_before_dismissal", "הליך שימוע לפני פיטורים",
    "בחינת תקינות הליך השימוע וסעד בגין פגם.",
    [caseLaw("פסיקה בעניין חובת השימוע (לאיסוף)", null)],
    [INTAKE, EVID, PRELIT, FILE, HEAR],
    ["חובת השימוע מבוססת פסיקה — נדרש אימות מקור"]),
  simpleProcedure("proc-notice-period", "pre_dismissal_dispute", "תקופת הודעה מוקדמת וחלף הודעה",
    "בירור זכאות להודעה מוקדמת/חלף הודעה מוקדמת בסיום העסקה.",
    [law("חוק הודעה מוקדמת לפיטורים ולהתפטרות, התשס\"א-2001", URL_NOTICE, "E3B-LEG-002")],
    [INTAKE, EVID, PRELIT, FILE, HEAR],
    ["אורך ההודעה נגזר מוותק וסוג השכר — לאימות מול הטבלה בחוק"]),
  simpleProcedure("proc-wage-overtime", "wage_overtime_claim", "תביעת שכר ושעות נוספות",
    "תביעת גמול שעות נוספות והפרשי שכר.",
    [law("חוק שעות עבודה ומנוחה", null, "E3B-LEG-003"), law("חוק הגנת השכר", null, "E3B-LEG-010")],
    [INTAKE, EVID, PRELIT, FILE, HEAR],
    ["נטל ההוכחה בהיעדר דוחות נוכחות (תיקון 24) — לאימות", "התיישנות רכיבי שכר"]),
  simpleProcedure("proc-pension", "pension_rights_claim", "תביעת זכויות פנסיה",
    "תביעה בגין אי-הפרשות פנסיה מכוח צו הרחבה.",
    [law("צו הרחבה לביטוח פנסיוני מקיף במשק", null, "E3B-ORD-001")],
    [INTAKE, EVID, PRELIT, FILE, HEAR],
    ["גרסת צו ההרחבה והחלפתו טעונות אימות"]),
  simpleProcedure("proc-discrimination", "discrimination_claim", "תביעת הפליה בעבודה",
    "תביעה לפי חוק שוויון ההזדמנויות בעבודה.",
    [law("חוק שוויון ההזדמנויות בעבודה", null, "E3B-LEG-008")],
    [INTAKE, EVID, PRELIT, FILE, HEAR],
    ["היפוך נטל ההוכחה — לאימות מול הסעיף", "פסיקה מעצבת חסרה בקורפוס"]),
  simpleProcedure("proc-harassment", "harassment_complaint", "תלונת הטרדה מינית בעבודה",
    "טיפול בתלונה וחובות המעסיק.",
    [law("החוק למניעת הטרדה מינית", null, "E3B-LEG-009")],
    [INTAKE, EVID, { titleHe: "הגשת תלונה לאחראית", kind: "administrative", actor: "client" }, FILE, HEAR],
    ["חובות מעסיק לפי התקנות — לאימות"]),
  simpleProcedure("proc-regional-civil", "regional_labor_court_civil", "הליך אזרחי בבית הדין האזורי לעבודה",
    "מסלול דיוני כללי בבית הדין האזורי.",
    [courtRule("תקנות בית הדין לעבודה (סדרי דין)")],
    [{ titleHe: "כתב תביעה", kind: "filing", actor: "lawyer" }, { titleHe: "כתב הגנה", kind: "pleadings", actor: "opposing_counsel" }, { titleHe: "גילוי מסמכים", kind: "disclosure", actor: "lawyer" }, { titleHe: "קדם משפט", kind: "hearing", actor: "regional_labor_court" }, { titleHe: "הוכחות", kind: "hearing", actor: "regional_labor_court" }, { titleHe: "סיכומים", kind: "summations", actor: "lawyer" }, { titleHe: "פסק דין", kind: "judgment", actor: "regional_labor_court" }],
    ["מועדים דיוניים טעונים אימות מול התקנות העדכניות"]),
  simpleProcedure("proc-appeal-national", "appeal_to_national_labor_court", "ערעור לבית הדין הארצי לעבודה",
    "מסלול ערעור על פסק דין אזורי.",
    [courtRule("ערעור בזכות לבית הדין הארצי לעבודה")],
    [{ titleHe: "בחינת עילות ערעור ומועד", kind: "assessment", actor: "lawyer" }, { titleHe: "הגשת כתב ערעור", kind: "appeal", actor: "lawyer" }, { titleHe: "דיון בערעור", kind: "hearing", actor: "national_labor_court" }, { titleHe: "פסק דין בערעור", kind: "judgment", actor: "national_labor_court" }],
    ["מועד ערעור טעון אימות מול התקנות"]),
  simpleProcedure("proc-settlement-enforcement", "settlement_enforcement", "פשרה ואכיפה",
    "מסלול פשרה, אישור הסכם ואכיפת פסק דין.",
    [practice("ניהול משא ומתן והסכם פשרה — נוהג מקצועי")],
    [{ titleHe: "משא ומתן", kind: "pre_litigation", actor: "lawyer" }, { titleHe: "הסכם פשרה ואישורו", kind: "judgment", actor: "regional_labor_court" }, { titleHe: "אכיפה/הוצאה לפועל", kind: "enforcement", actor: "lawyer" }],
    ["הסכם פשרה אינו דין — נוהג מקצועי; אישורו השיפוטי הוא ההיבט המחייב"]),
];

export const EMPLOYMENT_PROCEDURE_GRAPH: ProcedureGraph = {
  procedures: EMPLOYMENT_PROCEDURES,
  graphVersion: PROCEDURE_GRAPH_VERSION,
};

/**
 * Employment case-law catalog (Epic 3B Triad, Pillar B).
 *
 * Curated CANDIDATE records across employment topics. Per the spec, since
 * lawful automated retrieval is unclear (official source access terms
 * unconfirmed; datacenter IPs may be blocked), these are metadata/pointer
 * records pointing to the OFFICIAL judiciary source. Case NUMBERS are never
 * fabricated: where a specific number is not verified, caseNumberRaw is
 * null and caseNumberStatus is "to_verify". Every record is
 * verification="unverified" until confirmed against the official source —
 * so none may back a substantive claim yet (discovery-only). The doctrine
 * descriptions are accurate statements of well-established Israeli labor law.
 */
import { bindingClass } from "./authority.ts";
import type { CaseLawCatalog, CourtInstance, JudgmentRecord } from "./types.ts";

export const CASE_LAW_CATALOG_VERSION = "employment-case-law-catalog-0.1.0";

const OFFICIAL = "https://supremedecisions.court.gov.il/"; // official judiciary published decisions
const PUBLISHER = "הרשות השופטת — מאגר פסקי הדין";
// NOTE: statute permalinks (severance/women/notice) are referenced by
// refId in citedStatutes; the URLs live in the legislation pillar.

let n = 0;
function rec(o: {
  court: CourtInstance; titleHe: string; topics: string[]; doctrineHe: string;
  citedStatutes: { refId: string | null; citationHe: string; sectionHe: string | null }[];
  outcomeHe?: string; remediesHe?: string[]; limitationsHe?: string[]; factualSimilarityNote?: string;
}): JudgmentRecord {
  n += 1;
  return {
    id: `CL-EMP-${String(n).padStart(3, "0")}`,
    caseNumberRaw: null,
    caseNumberStatus: "to_verify",
    court: o.court,
    instanceLabelHe: o.court === "national_labor" ? "בית הדין הארצי לעבודה" : o.court === "regional_labor" ? "בית הדין האזורי לעבודה" : o.court === "supreme" ? "בית המשפט העליון" : "ערכאה אחרת",
    judgmentDate: null,
    decisionType: "judgment",
    titleHe: o.titleHe,
    legalTopics: o.topics,
    doctrineHe: o.doctrineHe,
    citedStatutes: o.citedStatutes.map((c) => ({ statuteRefId: c.refId, citationHe: c.citationHe, sectionHe: c.sectionHe })),
    proceduralStageHe: null,
    outcomeHe: o.outcomeHe ?? null,
    remediesHe: o.remediesHe ?? [],
    authorityClass: bindingClass(o.court),
    appealStatusHe: null,
    relatedProceedings: [],
    laterTreatment: [{ kind: "unknown", byCaseId: null, note: "טיפול מאוחר טרם נבדק" }],
    canonicalSourceUrl: OFFICIAL,
    publisherHe: PUBLISHER,
    access: "pointer_only",
    verification: "unverified",
    factualSimilarityNote: o.factualSimilarityNote ?? null,
    limitationsHe: [
      "רשומת מועמד — מספר ההליך והפרטים טעונים אימות מול המקור הרשמי",
      "לגילוי בלבד; אינה יכולה לתמוך בטענה משפטית עד לאימות",
      ...(o.limitationsHe ?? []),
    ],
  };
}

export const EMPLOYMENT_CASE_LAW: JudgmentRecord[] = [
  rec({ court: "national_labor", titleHe: "פיטורי עובדת בהיריון — היקף ההגנה והסעד", topics: ["pregnancy_dismissal", "equal_opportunity", "remedies"], doctrineHe: "פיטורים בהיריון ללא היתר לפי סעיף 9 לחוק עבודת נשים מהווים הפרה; נפסקים פיצויים לרבות ללא הוכחת נזק לפי חוק שוויון ההזדמנויות.", citedStatutes: [{ refId: "E3B-LEG-007", citationHe: "חוק עבודת נשים, סעיף 9", sectionHe: "9" }, { refId: "E3B-LEG-008", citationHe: "חוק שוויון ההזדמנויות בעבודה", sectionHe: null }], outcomeHe: "לרוב לטובת העובדת בהיעדר היתר", remediesHe: ["פיצוי אובדן השתכרות", "פיצוי ללא הוכחת נזק", "פיצוי בגין פגם בשימוע"] }),
  rec({ court: "national_labor", titleHe: "חובת השימוע לפני פיטורים — רכיבי ההליך", topics: ["hearing_duty", "termination_procedure"], doctrineHe: "חובת השימוע נגזרת מחובת תום הלב; נדרשים זימון מראש, פירוט טענות, הזדמנות אמיתית והחלטה בלב פתוח; הפרתה מקימה סעד כספי עצמאי.", citedStatutes: [], outcomeHe: "פיצוי בגין פגם דיוני", remediesHe: ["פיצוי בגין פגם בשימוע"] }),
  rec({ court: "national_labor", titleHe: "התפטרות בדין מפוטר עקב הרעה מוחשית", topics: ["severance", "constructive_dismissal"], doctrineHe: "הרעה מוחשית בתנאי עבודה, או נסיבות שבהן אין לדרוש המשך עבודה, מזכות בפיצויי פיטורים לפי סעיף 11(א); נדרשת התראה והזדמנות לתקן.", citedStatutes: [{ refId: "E3B-LEG-001", citationHe: "חוק פיצויי פיטורים, סעיף 11(א)", sectionHe: "11" }] }),
  rec({ court: "national_labor", titleHe: "הסדר סעיף 14 — תחולה והיקף", topics: ["severance", "section14"], doctrineHe: "הסדר לפי סעיף 14 בא במקום פיצויי פיטורים רק בהיקף שהוחל ובכפוף לתנאיו; הוחל חלקית — חלה השלמה.", citedStatutes: [{ refId: "E3B-LEG-001", citationHe: "חוק פיצויי פיטורים, סעיף 14", sectionHe: "14" }] }),
  rec({ court: "national_labor", titleHe: "יחסי עובד-מעסיק — המבחן המעורב ומבחן ההשתלבות", topics: ["employee_vs_contractor"], doctrineHe: "מעמד עובד נקבע לפי המבחן המעורב שבמרכזו מבחן ההשתלבות (פן חיובי ושלילי); הכינוי החוזי אינו מכריע.", citedStatutes: [], factualSimilarityNote: "רלוונטי לסיווג פרילנסר/קבלן" }),
  rec({ court: "national_labor", titleHe: "הכרה בדיעבד ביחסי עבודה וקיזוז תמורה קבלנית", topics: ["employee_vs_contractor", "remedies"], doctrineHe: "בהכרה בדיעבד ביחסי עבודה ניתן להתחשב בתמורה הקבלנית הגבוהה ששולמה, בכפוף לתנאים שנקבעו בפסיקה.", citedStatutes: [] }),
  rec({ court: "national_labor", titleHe: "גמול שעות נוספות ונטל ההוכחה לאחר תיקון 24", topics: ["overtime", "wage_claims"], doctrineHe: "בהיעדר דוחות נוכחות, תיקון 24 לחוק הגנת השכר מעביר נטל להוכחת שעות העבודה למעסיק בגבולות שנקבעו.", citedStatutes: [{ refId: "E3B-LEG-003", citationHe: "חוק שעות עבודה ומנוחה", sectionHe: null }, { refId: "E3B-LEG-010", citationHe: "חוק הגנת השכר, תיקון 24", sectionHe: null }] }),
  rec({ court: "national_labor", titleHe: "חובת ביטוח פנסיוני מכוח צו ההרחבה", topics: ["pension", "extension_orders"], doctrineHe: "צו ההרחבה לפנסיה חובה מחיל חובת ביטוח פנסיוני על כלל העובדים; אי-הפרשה מקימה חוב.", citedStatutes: [{ refId: "E3B-ORD-001", citationHe: "צו הרחבה לביטוח פנסיוני מקיף במשק", sectionHe: null }] }),
  rec({ court: "national_labor", titleHe: "הפליה בעבודה והיפוך נטל ההוכחה", topics: ["equal_opportunity", "discrimination"], doctrineHe: "בהתקיים ראשית ראיה להפליה, עובר הנטל למעסיק להוכיח טעם ענייני, לפי חוק שוויון ההזדמנויות.", citedStatutes: [{ refId: "E3B-LEG-008", citationHe: "חוק שוויון ההזדמנויות בעבודה", sectionHe: null }] }),
  rec({ court: "national_labor", titleHe: "אחריות מעסיק למניעת הטרדה מינית", topics: ["workplace_harassment"], doctrineHe: "על המעסיק חובות אקטיביות למניעה, נוהל, ומינוי אחראית; הפרה מקימה אחריות.", citedStatutes: [{ refId: "E3B-LEG-009", citationHe: "החוק למניעת הטרדה מינית", sectionHe: null }] }),
  rec({ court: "regional_labor", titleHe: "עוגמת נפש והלנת שכר בדיון מהיר — עמדה מצמצמת", topics: ["wage_claims", "conflicting_authority"], doctrineHe: "עמדה לפיה בדיון מהיר יש לצמצם פיצוי עוגמת נפש לנסיבות קיצוניות — עמדה אזורית, אינה מחייבת.", citedStatutes: [{ refId: "E3B-LEG-010", citationHe: "חוק הגנת השכר", sectionHe: null }], limitationsHe: ["ערכאה אזורית — משקל משכנע בלבד, אינה גוברת על הלכת הארצי"] }),
  rec({ court: "national_labor", titleHe: "תקופת ההודעה המוקדמת וחלף הודעה", topics: ["notice_period"], doctrineHe: "אורך ההודעה המוקדמת נגזר מוותק וסוג השכר; ויתור על עבודה בתקופה מחייב תשלום חלף הודעה מוקדמת.", citedStatutes: [{ refId: "E3B-LEG-002", citationHe: "חוק הודעה מוקדמת לפיטורים ולהתפטרות", sectionHe: null }] }),
  rec({ court: "national_labor", titleHe: "תחולת צו הרחבה ענפי — מבחן עיקר העיסוק", topics: ["extension_orders", "collective_agreements"], doctrineHe: "תחולת צו הרחבה ענפי נבחנת לפי עיקר עיסוק המעסיק; בהתנגשות מקורות גוברת ההוראה המיטיבה.", citedStatutes: [{ refId: "E3B-LEG-011", citationHe: "חוק הסכמים קיבוציים", sectionHe: null }] }),
  rec({ court: "national_labor", titleHe: "דמי הבראה מכוח צו הרחבה כללי", topics: ["recuperation", "extension_orders"], doctrineHe: "זכאות לדמי הבראה מוקנית מכוח צו הרחבה כללי, לפי ותק ותעריף מעודכן.", citedStatutes: [{ refId: "E3B-ORD-002", citationHe: "צו הרחבה בדבר תשלום דמי הבראה", sectionHe: null }] }),
  rec({ court: "national_labor", titleHe: "פדיון חופשה שנתית והתיישנות", topics: ["vacation", "wage_claims"], doctrineHe: "עם סיום העסקה משולם פדיון חופשה בגין יתרה צבורה, בכפוף לתקופת ההתיישנות הקבועה בחוק חופשה שנתית.", citedStatutes: [{ refId: "E3B-LEG-004", citationHe: "חוק חופשה שנתית", sectionHe: null }] }),
  rec({ court: "national_labor", titleHe: "שיעור דמי מחלה וההגנה מפני פיטורים בתקופת מחלה", topics: ["sick_leave", "termination_procedure"], doctrineHe: "דמי מחלה משולמים לפי המדרג הקבוע בחוק; קיימות הגנות מפני פיטורים בתקופת מחלה בתנאים מסוימים.", citedStatutes: [{ refId: "E3B-LEG-005", citationHe: "חוק דמי מחלה", sectionHe: null }] }),
  rec({ court: "supreme", titleHe: "היקף הביקורת השיפוטית על בית הדין הארצי לעבודה", topics: ["labor_court_review"], doctrineHe: "בית המשפט העליון בשבתו כבג\"ץ אינו יושב כערכאת ערעור על בית הדין הארצי; התערבות שמורה לטעות משפטית מהותית שהצדק מחייב תיקונה.", citedStatutes: [{ refId: "E3B-LEG-012", citationHe: "חוק בית הדין לעבודה", sectionHe: null }] }),
  rec({ court: "national_labor", titleHe: "פיצויי פיטורים — רצף עבודה והפסקות", topics: ["severance"], doctrineHe: "זכאות לפיצויי פיטורים מותנית בשנת עבודה; הפסקות מסוימות אינן קוטעות את הרצף לפי החוק והתקנות.", citedStatutes: [{ refId: "E3B-LEG-001", citationHe: "חוק פיצויי פיטורים", sectionHe: null }] }),
  rec({ court: "regional_labor", titleHe: "אכיפת יחסי עבודה וסעד השבה לעבודה — היקף מצומצם", topics: ["remedies", "termination_procedure"], doctrineHe: "סעד אכיפה/השבה לעבודה ניתן במשורה ובנסיבות חריגות; הכלל הוא פיצוי כספי.", citedStatutes: [], limitationsHe: ["ערכאה אזורית — משקל משכנע"] }),
  rec({ court: "national_labor", titleHe: "קיזוז והשבה בתביעות שכר", topics: ["wage_claims", "remedies"], doctrineHe: "בתביעות שכר ניתן לקזז תשלומי יתר בכפוף להוראות חוק הגנת השכר ולנטל ההוכחה.", citedStatutes: [{ refId: "E3B-LEG-010", citationHe: "חוק הגנת השכר", sectionHe: null }] }),
];

export const EMPLOYMENT_CASE_LAW_CATALOG: CaseLawCatalog = {
  records: EMPLOYMENT_CASE_LAW,
  accessResearchHe: [
    "מקור רשמי: מאגר פסקי הדין של הרשות השופטת (supremedecisions.court.gov.il / court.gov.il).",
    "פסיקה היא נחלת הכלל לפי סעיף 6 לחוק זכות יוצרים; עם זאת תנאי הגישה למאגר וחסימות אנטי-בוט אינם מאושרים — לכן אין crawler.",
    "כל הרשומות הן מועמדות (unverified) ומצביעות למקור הרשמי; אימות מספרי ההליך ייעשה מול המקור.",
    "אין להשתמש במאגר מסחרי (נבו/תקדין) ואין לעקוף login/CAPTCHA/WAF.",
  ],
  catalogVersion: CASE_LAW_CATALOG_VERSION,
};

/**
 * Israeli legal source registry (Acquisition Slice 1).
 *
 * FACTUAL METADATA about real sources and how each may be acquired LAWFULLY —
 * it contains no legal text and asserts no holdings. Classifications reflect:
 *  - Copyright Act 2007 §6: no copyright in statutes, regulations, Knesset
 *    Protocols, and judicial decisions ⇒ OFFICIAL full text is ingestible.
 *  - Commercial platforms (Nevo/Takdin) gate access behind paywalls/licences
 *    and add copyrighted editorial content ⇒ REQUIRES_LICENSE until a licence
 *    is on file (never bypass the paywall).
 *  - Firm documents are tenant-owned ⇒ FIRM_OWNED_FULL_TEXT, isolated.
 *
 * Adding a row here does not ingest anything; it declares the lawful ceiling.
 */
import type { RegisteredSource, WorkstreamId, SourceClassification } from "./types.ts";

const SIX = "Copyright Act 2007 §6 (no copyright in legislation & judgments)";
const OFFICIAL_PUB = "Official government publication (open)";
const FIRM = "Firm ownership / tenant upload consent";
const KZ = "Kol-Zchut CC-BY-SA (secondary, discovery only)";

export const SOURCE_REGISTRY: readonly RegisteredSource[] = [
  // A — National legislation ------------------------------------------------
  {
    sourceKey: "il-knesset-legislation-db",
    displayNameHe: "מאגר החקיקה הלאומי (הכנסת)",
    sourceOwner: "Knesset",
    homeUrl: "https://main.knesset.gov.il/Activity/Legislation",
    workstream: "A_national_legislation",
    classification: "OPEN_OFFICIAL_FULL_TEXT",
    authorityTier: "binding_primary",
    officialStatus: "official",
    reuseBasisRef: SIX,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "חקיקה ראשית וכן נוסחים 'כפי שתוקנו'; טקסט מלא חופשי.",
  },
  {
    sourceKey: "il-reshumot-gazette",
    displayNameHe: "רשומות — הפרסום הרשמי",
    sourceOwner: "מדינת ישראל (רשומות)",
    homeUrl: "https://www.gov.il/he/departments/legalInfo/reshumot",
    workstream: "A_national_legislation",
    classification: "OPEN_OFFICIAL_FULL_TEXT",
    authorityTier: "binding_primary",
    officialStatus: "official",
    reuseBasisRef: SIX,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "הפרסום הרשמי המחייב (ספר החוקים, ק\"ת, י\"פ).",
  },
  // B — Secondary legislation ----------------------------------------------
  {
    sourceKey: "il-secondary-regulations",
    displayNameHe: "חקיקת משנה (תקנות, צווים, כללים)",
    sourceOwner: "מדינת ישראל (רשומות)",
    homeUrl: "https://www.gov.il/he/departments/legalInfo/reshumot",
    workstream: "B_secondary_legislation",
    classification: "OPEN_OFFICIAL_FULL_TEXT",
    authorityTier: "binding_primary",
    officialStatus: "official",
    reuseBasisRef: SIX,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "תקנות/צווים/כללים בקובץ התקנות; §6 חל על חקיקת משנה.",
  },
  // C — Historical legislation & amendments --------------------------------
  {
    sourceKey: "il-historical-amendments",
    displayNameHe: "נוסחים היסטוריים ותיקוני חקיקה",
    sourceOwner: "Knesset",
    homeUrl: "https://main.knesset.gov.il/Activity/Legislation",
    workstream: "C_historical_amendments",
    classification: "OPEN_OFFICIAL_FULL_TEXT",
    authorityTier: "binding_primary",
    officialStatus: "official",
    reuseBasisRef: SIX,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "תחולה/ביטול/תיקון ונוסחים לפי תאריך; יש לשמר טווח תוקף.",
  },
  // D — Supreme Court -------------------------------------------------------
  {
    sourceKey: "il-supreme-court",
    displayNameHe: "פסיקת בית המשפט העליון",
    sourceOwner: "בתי המשפט",
    homeUrl: "https://supremedecisions.court.gov.il",
    workstream: "D_supreme_court",
    classification: "OPEN_OFFICIAL_FULL_TEXT",
    authorityTier: "binding_primary",
    officialStatus: "official",
    reuseBasisRef: SIX,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "פסקי דין של העליון מתפרסמים חופשי; §6 חל על פסיקה.",
  },
  // E — Labour court --------------------------------------------------------
  {
    sourceKey: "il-national-labour-court",
    displayNameHe: "בית הדין הארצי לעבודה",
    sourceOwner: "בתי הדין לעבודה",
    homeUrl: "https://www.court.gov.il",
    workstream: "E_labour_court",
    classification: "OPEN_OFFICIAL_FULL_TEXT",
    authorityTier: "binding_primary",
    officialStatus: "official",
    reuseBasisRef: SIX,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "פסיקת הארצי — מחייבת בתחום העבודה; טקסט §6.",
  },
  {
    sourceKey: "il-regional-labour-courts",
    displayNameHe: "בתי הדין האזוריים לעבודה",
    sourceOwner: "בתי הדין לעבודה",
    homeUrl: "https://www.court.gov.il",
    workstream: "E_labour_court",
    classification: "PUBLIC_METADATA",
    authorityTier: "persuasive_primary",
    officialStatus: "official",
    reuseBasisRef: SIX,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "מטא-דאטה + קישור; טקסט מלא היכן שפורסם פרטנית.",
  },
  // F — District & administrative ------------------------------------------
  {
    sourceKey: "il-district-admin-courts",
    displayNameHe: "בתי משפט מחוזיים ולעניינים מנהליים",
    sourceOwner: "בתי המשפט",
    homeUrl: "https://www.court.gov.il",
    workstream: "F_district_admin",
    classification: "PUBLIC_METADATA",
    authorityTier: "persuasive_primary",
    officialStatus: "official",
    reuseBasisRef: SIX,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "חיפוש פסיקה ציבורי; מטא-דאטה + קישור, טקסט §6 היכן שפורסם.",
  },
  // G — Magistrates & specialist tribunals ---------------------------------
  {
    sourceKey: "il-magistrates-tribunals",
    displayNameHe: "בתי משפט שלום וטריבונלים ייעודיים",
    sourceOwner: "בתי המשפט / טריבונלים",
    homeUrl: "https://www.court.gov.il",
    workstream: "G_magistrates_tribunals",
    classification: "PUBLIC_METADATA",
    authorityTier: "persuasive_primary",
    officialStatus: "official",
    reuseBasisRef: SIX,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "שלום, משפחה, תעבורה, טריבונלים סטטוטוריים ומשמעתיים.",
  },
  // H — Regulatory guidance -------------------------------------------------
  {
    sourceKey: "il-boi-guidance",
    displayNameHe: "הנחיות בנק ישראל / הפיקוח על הבנקים",
    sourceOwner: "בנק ישראל",
    homeUrl: "https://www.boi.org.il",
    workstream: "H_regulatory_guidance",
    classification: "OPEN_OFFICIAL_FULL_TEXT",
    authorityTier: "official_regulatory",
    officialStatus: "official",
    reuseBasisRef: OFFICIAL_PUB,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "הוראות ניהול בנקאי תקין וחוזרים — פרסום רשמי פתוח.",
  },
  {
    sourceKey: "il-isa-guidance",
    displayNameHe: "הנחיות רשות ניירות ערך",
    sourceOwner: "רשות ניירות ערך",
    homeUrl: "https://www.isa.gov.il",
    workstream: "H_regulatory_guidance",
    classification: "OPEN_OFFICIAL_FULL_TEXT",
    authorityTier: "official_regulatory",
    officialStatus: "official",
    reuseBasisRef: OFFICIAL_PUB,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "עמדות סגל והנחיות — פרסום רשמי פתוח.",
  },
  // I — Legislative history -------------------------------------------------
  {
    sourceKey: "il-law-memoranda",
    displayNameHe: "תזכירי חוק (מאגר ממשלתי)",
    sourceOwner: "מדינת ישראל",
    homeUrl: "https://www.tazkirim.gov.il",
    workstream: "I_legislative_history",
    classification: "OPEN_OFFICIAL_FULL_TEXT",
    authorityTier: "official_regulatory",
    officialStatus: "official",
    reuseBasisRef: OFFICIAL_PUB,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "תזכירי חוק ודברי הסבר — היסטוריה חקיקתית.",
  },
  {
    sourceKey: "il-knesset-protocols",
    displayNameHe: "פרוטוקולים ודברי הכנסת",
    sourceOwner: "Knesset",
    homeUrl: "https://main.knesset.gov.il",
    workstream: "I_legislative_history",
    classification: "OPEN_OFFICIAL_FULL_TEXT",
    authorityTier: "official_regulatory",
    officialStatus: "official",
    reuseBasisRef: SIX,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "פרוטוקולי ועדות ומליאה — §6 חל על דברי הכנסת.",
  },
  // J — Licensed commercial providers --------------------------------------
  {
    sourceKey: "il-nevo",
    displayNameHe: "נבו (מאגר משפטי מסחרי)",
    sourceOwner: "Nevo Ltd.",
    homeUrl: "https://www.nevo.co.il",
    workstream: "J_licensed_providers",
    classification: "REQUIRES_LICENSE",
    authorityTier: "licensed_editorial",
    officialStatus: "secondary",
    reuseBasisRef: null,
    licenseOnFile: false,
    requiresExternalApproval: true,
    notesHe: "מאחורי תשלום; תוכן עריכתי מוגן. עד לרישיון — קישור/מטא-דאטה בלבד.",
  },
  {
    sourceKey: "il-takdin",
    displayNameHe: "תקדין (מאגר משפטי מסחרי)",
    sourceOwner: "Takdin",
    homeUrl: "https://www.takdin.co.il",
    workstream: "J_licensed_providers",
    classification: "REQUIRES_LICENSE",
    authorityTier: "licensed_editorial",
    officialStatus: "secondary",
    reuseBasisRef: null,
    licenseOnFile: false,
    requiresExternalApproval: true,
    notesHe: "מאחורי תשלום; עד לרישיון — קישור/מטא-דאטה בלבד.",
  },
  {
    sourceKey: "il-kolzchut",
    displayNameHe: "כל-זכות (מאגר זכויות)",
    sourceOwner: "Kol-Zchut",
    homeUrl: "https://www.kolzchut.org.il",
    workstream: "J_licensed_providers",
    classification: "DISCOVERY_ONLY",
    authorityTier: "discovery_material",
    officialStatus: "secondary",
    reuseBasisRef: KZ,
    licenseOnFile: false,
    requiresExternalApproval: false,
    notesHe: "משני בלבד — מסייע לאיתור מקור ראשוני, לעולם לא אסמכתה למסקנה.",
  },
  // K — Firm-owned private documents ---------------------------------------
  {
    sourceKey: "firm-owned-corpus",
    displayNameHe: "מסמכי המשרד (פרטי)",
    sourceOwner: "Tenant firm",
    homeUrl: null,
    workstream: "K_firm_owned",
    classification: "FIRM_OWNED_FULL_TEXT",
    authorityTier: "firm_internal",
    officialStatus: "unofficial",
    reuseBasisRef: FIRM,
    licenseOnFile: true,
    requiresExternalApproval: false,
    notesHe: "כתבי טענות, חוזים, חוות דעת, תקדימים פנימיים — בבידוד דייר מלא.",
  },
];

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

export function sourceByKey(key: string): RegisteredSource | null {
  return SOURCE_REGISTRY.find((s) => s.sourceKey === key) ?? null;
}

export function sourcesByWorkstream(w: WorkstreamId): readonly RegisteredSource[] {
  return SOURCE_REGISTRY.filter((s) => s.workstream === w);
}

export function sourcesByClassification(
  c: SourceClassification,
): readonly RegisteredSource[] {
  return SOURCE_REGISTRY.filter((s) => s.classification === c);
}

/** Sources implementable right now without external approval (STOP-free). */
export function immediatelyImplementableSources(): readonly RegisteredSource[] {
  return SOURCE_REGISTRY.filter((s) => !s.requiresExternalApproval);
}

/** Sources that need credentials/payment/new license before full text. */
export function stopSources(): readonly RegisteredSource[] {
  return SOURCE_REGISTRY.filter((s) => s.requiresExternalApproval);
}

/**
 * Controlled Hebrew employment-law vocabulary (Epic 3B, Phase 13).
 * A CLOSED, reviewed list: every expansion is visible, typed and
 * risk-annotated. NO uncontrolled expansion — extending it is a reviewed
 * change, not a runtime behavior. Consumed by the query-strategy engine.
 */

export type VariantType =
  | "common_language"
  | "legal_variant"
  | "spelling_variant"
  | "abbreviation"
  | "ocr_variant"
  | "gender_variant"
  | "plural_variant";

export interface VocabularyVariant {
  term: string;
  type: VariantType;
  driftRisk: "none" | "low" | "medium";
}

export interface VocabularyEntry {
  canonical: string;
  variants: VocabularyVariant[];
  statuteRef: string | null;
  sectionRef: string | null;
  meaningHe: string;
  expansionConfidence: number;   // 0..1
  reviewStatus: "reviewed";
}

const V = (term: string, type: VariantType, driftRisk: VocabularyVariant["driftRisk"] = "low"): VocabularyVariant => ({ term, type, driftRisk });

export const EMPLOYMENT_LAW_VOCABULARY: VocabularyEntry[] = [
  {
    canonical: "פיצויי פיטורים",
    variants: [V("פיצויי הפיטורים", "spelling_variant", "none"), V("פיצויי פיטורין", "spelling_variant"), V("פיצויים בגין פיטורים", "common_language"), V("פיצויי פיטורי", "ocr_variant")],
    statuteRef: "חוק פיצויי פיטורים", sectionRef: null,
    meaningHe: "תשלום לעובד שפוטר לאחר שנת עבודה, או שהתפטר בדין מפוטר",
    expansionConfidence: 0.95, reviewStatus: "reviewed",
  },
  {
    canonical: "סעיף 14",
    variants: [V("סעיף 14 לחוק פיצויי פיטורים", "legal_variant", "none"), V("הסדר סעיף 14", "legal_variant"), V("פטור מפיצויים לפי סעיף 14", "common_language", "medium")],
    statuteRef: "חוק פיצויי פיטורים", sectionRef: "14",
    meaningHe: "הסדר שתשלומי מעסיק לקופה באים במקום פיצויי פיטורים",
    expansionConfidence: 0.9, reviewStatus: "reviewed",
  },
  {
    canonical: "הרעה מוחשית",
    variants: [V("הרעה מוחשית בתנאי העבודה", "legal_variant", "none"), V("הרעת תנאים", "common_language"), V("התפטרות בדין מפוטר", "legal_variant", "medium")],
    statuteRef: "חוק פיצויי פיטורים", sectionRef: "11",
    meaningHe: "עילה להתפטרות המזכה בפיצויי פיטורים לפי סעיף 11(א)",
    expansionConfidence: 0.85, reviewStatus: "reviewed",
  },
  {
    canonical: "הודעה מוקדמת",
    variants: [V("הודעה מוקדמת לפיטורים", "legal_variant", "none"), V("חלף הודעה מוקדמת", "legal_variant"), V("תקופת ההודעה", "common_language")],
    statuteRef: "חוק הודעה מוקדמת לפיטורים ולהתפטרות", sectionRef: null,
    meaningHe: "פרק זמן/תמורה כספית טרם סיום יחסי עבודה",
    expansionConfidence: 0.9, reviewStatus: "reviewed",
  },
  {
    canonical: "שימוע",
    variants: [V("חובת השימוע", "legal_variant", "none"), V("זכות הטיעון", "legal_variant"), V("שימוע לפני פיטורים", "common_language")],
    statuteRef: null, sectionRef: null,
    meaningHe: "חובת הליך הוגן ומתן הזדמנות לעובד להשמיע טענותיו לפני פיטורים",
    expansionConfidence: 0.8, reviewStatus: "reviewed",
  },
  {
    canonical: "שעות נוספות",
    variants: [V("גמול שעות נוספות", "legal_variant", "none"), V("שעות עבודה נוספות", "spelling_variant"), V("תוספת שעות נוספות", "common_language")],
    statuteRef: "חוק שעות עבודה ומנוחה", sectionRef: null,
    meaningHe: "עבודה מעבר למכסת השעות היומית/שבועית, המזכה בגמול מוגדל",
    expansionConfidence: 0.9, reviewStatus: "reviewed",
  },
  {
    canonical: "חופשה שנתית",
    variants: [V("ימי חופשה", "common_language", "none"), V("דמי חופשה", "legal_variant"), V("פדיון חופשה", "legal_variant", "medium")],
    statuteRef: "חוק חופשה שנתית", sectionRef: null,
    meaningHe: "זכאות לחופשה בתשלום לפי ותק",
    expansionConfidence: 0.9, reviewStatus: "reviewed",
  },
  {
    canonical: "דמי מחלה",
    variants: [V("ימי מחלה", "common_language", "none"), V("תשלום דמי מחלה", "legal_variant"), V("היעדרות מחמת מחלה", "common_language")],
    statuteRef: "חוק דמי מחלה", sectionRef: null,
    meaningHe: "זכאות לתשלום בעד היעדרות עקב מחלה",
    expansionConfidence: 0.9, reviewStatus: "reviewed",
  },
  {
    canonical: "דמי הבראה",
    variants: [V("קצובת הבראה", "legal_variant", "none"), V("תשלום הבראה", "common_language")],
    statuteRef: "צו הרחבה בדבר תשלום דמי הבראה", sectionRef: null,
    meaningHe: "תשלום שנתי מכוח צו הרחבה כללי",
    expansionConfidence: 0.85, reviewStatus: "reviewed",
  },
  {
    canonical: "פנסיה חובה",
    variants: [V("ביטוח פנסיוני", "legal_variant", "none"), V("צו הרחבה לפנסיה", "legal_variant"), V("הפרשות לפנסיה", "common_language")],
    statuteRef: "צו הרחבה לביטוח פנסיוני מקיף במשק", sectionRef: null,
    meaningHe: "חובת ביטוח פנסיוני לכלל העובדים מכוח צו הרחבה",
    expansionConfidence: 0.85, reviewStatus: "reviewed",
  },
  {
    canonical: "עבודת נשים",
    variants: [V("חוק עבודת נשים", "legal_variant", "none"), V("הגנת נשים בעבודה", "common_language", "medium")],
    statuteRef: "חוק עבודת נשים", sectionRef: null,
    meaningHe: "הגנות סטטוטוריות בהיריון, לידה והורות",
    expansionConfidence: 0.9, reviewStatus: "reviewed",
  },
  {
    canonical: "פיטורים בהיריון",
    variants: [V("פיטורי עובדת בהיריון", "legal_variant", "none"), V("היתר פיטורים בהיריון", "legal_variant"), V("התקופה המוגנת", "legal_variant"), V("פיטורים בהריון", "spelling_variant")],
    statuteRef: "חוק עבודת נשים", sectionRef: "9",
    meaningHe: "איסור פיטורי עובדת בהיריון ללא היתר לפי סעיף 9",
    expansionConfidence: 0.9, reviewStatus: "reviewed",
  },
  {
    canonical: "שוויון הזדמנויות",
    variants: [V("שוויון ההזדמנויות בעבודה", "legal_variant", "none"), V("הפליה בעבודה", "common_language"), V("אפליה בעבודה", "spelling_variant")],
    statuteRef: "חוק שוויון ההזדמנויות בעבודה", sectionRef: null,
    meaningHe: "איסור הפליה מטעמים אסורים ביחסי עבודה",
    expansionConfidence: 0.9, reviewStatus: "reviewed",
  },
  {
    canonical: "הטרדה מינית",
    variants: [V("הטרדה מינית בעבודה", "legal_variant", "none"), V("מניעת הטרדה מינית", "legal_variant"), V("אחראית למניעת הטרדה", "legal_variant")],
    statuteRef: "החוק למניעת הטרדה מינית", sectionRef: null,
    meaningHe: "חובות מעסיק למניעה וטיפול בהטרדה מינית",
    expansionConfidence: 0.85, reviewStatus: "reviewed",
  },
  {
    canonical: "יחסי עובד מעסיק",
    variants: [V("יחסי עובד-מעסיק", "spelling_variant", "none"), V("יחסי עבודה", "common_language"), V("מבחן ההשתלבות", "legal_variant"), V("מעמד עובד", "common_language")],
    statuteRef: null, sectionRef: null,
    meaningHe: "קיום יחסי עבודה כתנאי לתחולת דיני העבודה",
    expansionConfidence: 0.85, reviewStatus: "reviewed",
  },
  {
    canonical: "עובד קבלן",
    variants: [V("עובד קבלן כוח אדם", "legal_variant", "none"), V("העסקה עקיפה", "common_language", "medium")],
    statuteRef: "חוק העסקת עובדים על ידי קבלני כוח אדם", sectionRef: null,
    meaningHe: "העסקה באמצעות קבלן כוח אדם והסדריה",
    expansionConfidence: 0.8, reviewStatus: "reviewed",
  },
  {
    canonical: "עובד שעתי",
    variants: [V("שכר שעתי", "common_language", "none"), V("עובד בשכר שעה", "common_language")],
    statuteRef: null, sectionRef: null,
    meaningHe: "עובד המתוגמל לפי שעות עבודה בפועל",
    expansionConfidence: 0.8, reviewStatus: "reviewed",
  },
  {
    canonical: "עובד חודשי",
    variants: [V("שכר חודשי", "common_language", "none"), V("עובד במשכורת חודשית", "common_language")],
    statuteRef: null, sectionRef: null,
    meaningHe: "עובד המתוגמל במשכורת חודשית קבועה",
    expansionConfidence: 0.8, reviewStatus: "reviewed",
  },
  {
    canonical: "צו הרחבה",
    variants: [V("צו הרחבה כללי", "legal_variant", "none"), V("צו הרחבה ענפי", "legal_variant"), V("הרחבת הסכם קיבוצי", "legal_variant")],
    statuteRef: "חוק הסכמים קיבוציים", sectionRef: null,
    meaningHe: "הרחבת תחולת הסכם קיבוצי בצו שר",
    expansionConfidence: 0.85, reviewStatus: "reviewed",
  },
  {
    canonical: "הסכם קיבוצי",
    variants: [V("הסכם קיבוצי כללי", "legal_variant", "none"), V("הסכם קיבוצי מיוחד", "legal_variant")],
    statuteRef: "חוק הסכמים קיבוציים", sectionRef: null,
    meaningHe: "הסכם בין ארגון עובדים למעסיק/ארגון מעסיקים",
    expansionConfidence: 0.85, reviewStatus: "reviewed",
  },
  {
    canonical: "הגנת השכר",
    variants: [V("חוק הגנת השכר", "legal_variant", "none"), V("הלנת שכר", "legal_variant"), V("פיצויי הלנה", "legal_variant")],
    statuteRef: "חוק הגנת השכר", sectionRef: null,
    meaningHe: "הגנות על תשלום שכר במועד ואיסור ניכויים",
    expansionConfidence: 0.9, reviewStatus: "reviewed",
  },
  {
    canonical: "שכר מינימום",
    variants: [V("חוק שכר מינימום", "legal_variant", "none"), V("שכר המינימום", "spelling_variant")],
    statuteRef: "חוק שכר מינימום", sectionRef: null,
    meaningHe: "השכר המזערי הקבוע בחוק",
    expansionConfidence: 0.9, reviewStatus: "reviewed",
  },
];

const INDEX = new Map<string, VocabularyEntry>();
for (const e of EMPLOYMENT_LAW_VOCABULARY) {
  INDEX.set(e.canonical, e);
  for (const v of e.variants) if (!INDEX.has(v.term)) INDEX.set(v.term, e);
}

/** Look up a canonical entry by any known term/variant (exact). */
export function lookupTerm(term: string): VocabularyEntry | null {
  return INDEX.get(term.trim()) ?? null;
}

/** Controlled expansion: canonical + none/low-drift variants only.
 * Medium-drift variants are excluded from automatic expansion. */
export function controlledExpansions(canonical: string): string[] {
  const e = INDEX.get(canonical);
  if (!e) return [];
  return [e.canonical, ...e.variants.filter((v) => v.driftRisk !== "medium").map((v) => v.term)];
}

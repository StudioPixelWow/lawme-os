/**
 * Amendment-operation evaluation set (Epic Track A step 8).
 *
 * 100+ labeled Hebrew amendment clauses. Entries tagged `real: true` are
 * transcribed from the pilot's live-extracted ספר-החוקים PDFs (post-normalize);
 * the rest are systematic coverage of each operation type, written in the same
 * formulaic register. Each carries a manually-verified expected operation type
 * and target section. Used by amendment-eval.ts to compute precision/recall.
 */
import type { OperationTypeV2 } from "../amendment-parser-v2.ts";

export interface EvalEntry {
  text: string;
  expectedType: OperationTypeV2;
  expectedTarget: string | null;
  real?: boolean;
}

export const AMENDMENT_EVAL_SET: readonly EvalEntry[] = [
  // ---- replace_words (real) ----
  { text: 'בסעיף 3, בכל מקום, במקום "פקיד סעד" יבוא "עובד סוציאלי"', expectedType: "replace_words", expectedTarget: "3", real: true },
  { text: 'בסעיף 6א(א), במקום "לפקיד סעד כאמור" יבוא "לעובד סוציאלי שמונה"', expectedType: "replace_words", expectedTarget: "6א(א)", real: true },
  { text: 'בסעיף 44(ב), במקום "על 25%" יקראו "על 35%"', expectedType: "replace_words", expectedTarget: "44(ב)", real: true },
  { text: 'בסעיף 4 לחוק העיקרי, במקום "לא פחות משלוש שנים" יבוא "לא פחות מחמש שנים"', expectedType: "replace_words", expectedTarget: "4", real: true },
  { text: 'בסעיף 9א(א) לחוק העיקרי, במקום "בהתייעצות עם" יבוא "בהסכמת"', expectedType: "replace_words", expectedTarget: "9א(א)", real: true },
  { text: 'בסעיף 10(א) לחוק העיקרי, במקום "ובהתייעצות עם" יבוא "ובהסכמת"', expectedType: "replace_words", expectedTarget: "10(א)", real: true },
  { text: 'בפסקה (2), במקום "משש שנים" יבוא "משבע שנים"', expectedType: "replace_words", expectedTarget: null, real: true },
  { text: 'בסעיף 7(4), במקום "יושב ראש הועדה" יבוא "היושב ראש"', expectedType: "replace_words", expectedTarget: "7(4)", real: true },
  { text: 'בסעיף 12, במקום "שלושים ימים" יבוא "ארבעים וחמישה ימים"', expectedType: "replace_words", expectedTarget: "12" },
  { text: 'בסעיף 2, במקום "השר" יבוא "שר האוצר"', expectedType: "replace_words", expectedTarget: "2" },
  // ---- replace_section (real + coverage) ----
  { text: "במקום סעיף 14 לחוק העיקרי יבוא:", expectedType: "replace_section", expectedTarget: "14", real: true },
  { text: "במקום סעיף 8 יבוא:", expectedType: "replace_section", expectedTarget: "8" },
  { text: "במקום סעיף 22א יבוא סעיף חדש:", expectedType: "replace_section", expectedTarget: "22א" },
  { text: "החלפת סעיף 5", expectedType: "replace_section", expectedTarget: "5" },
  { text: "במקום סעיף 3 לחוק יבוא:", expectedType: "replace_section", expectedTarget: "3" },
  // ---- add_section (real + coverage) ----
  { text: "אחרי סעיף 13 לחוק הבחירות יבוא סעיף זה:", expectedType: "add_section", expectedTarget: "13", real: true },
  { text: "אחרי סעיף 7 יבוא סעיף 7א:", expectedType: "add_section", expectedTarget: "7" },
  { text: "אחרי סעיף 30 יבוא:", expectedType: "add_section", expectedTarget: "30" },
  { text: "הוספת סעיף 15ב", expectedType: "add_section", expectedTarget: "15ב" },
  { text: "אחרי סעיף 2 לחוק העיקרי יבוא סעיף 2א", expectedType: "add_section", expectedTarget: "2" },
  // ---- delete_section (real + coverage) ----
  { text: "סעיף קטן (ה) בטל", expectedType: "delete_section", expectedTarget: "(ה)", real: true },
  { text: "סעיף 9 — בטל", expectedType: "delete_section", expectedTarget: "9" },
  { text: "סעיף 17 בטל", expectedType: "delete_section", expectedTarget: "17" },
  { text: "ביטול סעיף 4", expectedType: "delete_section", expectedTarget: "4" },
  { text: "סעיף קטן (ג) - בטל", expectedType: "delete_section", expectedTarget: "(ג)" },
  // ---- insert_words (real + coverage) ----
  { text: 'אחרי המילים "פקיד סעד" יבוא "עובד סוציאלי"', expectedType: "insert_words", expectedTarget: null, real: true },
  { text: 'בסעיף 5, אחרי המילים "בית המשפט" יבוא "המחוזי"', expectedType: "insert_words", expectedTarget: "5" },
  { text: 'אחרי המילים "שר הפנים" יבוא "או מי מטעמו"', expectedType: "insert_words", expectedTarget: null },
  { text: 'בסעיף 8, אחרי המילים "ועדת הכספים" יבוא "של הכנסת"', expectedType: "insert_words", expectedTarget: "8" },
  // ---- delete_words (coverage) ----
  { text: 'המילים "כאמור בסעיף 6" יימחקו', expectedType: "delete_words", expectedTarget: null },
  { text: 'בסעיף 3, המילים "לפי בקשתו" יימחקו', expectedType: "delete_words", expectedTarget: "3" },
  { text: 'המילה "בכתב" תימחק', expectedType: "delete_words", expectedTarget: null },
  { text: 'בסעיף 11, המילים "ובלבד שלא יעלה על שנה" יימחקו', expectedType: "delete_words", expectedTarget: "11" },
  // ---- rename_term (real + coverage) ----
  { text: 'בסעיף 1, במקום ההגדרה "פקיד סעד" יבוא:', expectedType: "rename_term", expectedTarget: "1", real: true },
  { text: 'בסעיף 1, אחרי ההגדרה "נידן נעדר" יבוא:', expectedType: "rename_term", expectedTarget: "1", real: true },
  { text: 'בהגדרת "אדם", במקום "יחיד" יבוא "יחיד או תאגיד"', expectedType: "rename_term", expectedTarget: null },
  { text: 'במקום ההגדרה "רשות מקומית" יבוא הגדרה חדשה', expectedType: "rename_term", expectedTarget: null },
  // ---- renumber_section (real + coverage) ----
  { text: 'האמור בו יסומן כפסקה "(1)"', expectedType: "renumber_section", expectedTarget: null, real: true },
  { text: "הסעיף הקיים יסומן כסעיף קטן (א)", expectedType: "renumber_section", expectedTarget: null },
  { text: "האמור בסעיף 5 יסומן (א)", expectedType: "renumber_section", expectedTarget: "5" },
  // ---- change_effective_date / commencement (real + coverage) ----
  { text: "תחילתו של חוק זה ביום פרסומו", expectedType: "change_effective_date", expectedTarget: null, real: true },
  { text: "תחילתו של חוק זה 30 ימים מיום פרסומו", expectedType: "change_effective_date", expectedTarget: null },
  { text: "יום התחילה יהיה ביום ט' בטבת", expectedType: "change_effective_date", expectedTarget: null },
  { text: "תחילתו של תיקון זה ביום 1 בינואר 2026", expectedType: "change_effective_date", expectedTarget: null },
  // ---- transitional (coverage) ----
  { text: "הוראת מעבר: הוראות סעיף 4 יחולו על מינוי שלאחר תחילתו", expectedType: "transitional", expectedTarget: "4" },
  { text: "הוראות מעבר: עניין תלוי ועומד יידון לפי הדין הקודם", expectedType: "transitional", expectedTarget: null },
  { text: "הוראת שעה: הוראה זו תעמוד בתוקף שלוש שנים", expectedType: "transitional", expectedTarget: null },
  // ---- schedules (coverage) ----
  { text: 'בתוספת הראשונה, במקום "פרט 3" יבוא "פרט 3א"', expectedType: "replace_schedule", expectedTarget: null },
  { text: "אחרי התוספת השנייה יבוא תוספת שלישית", expectedType: "add_schedule", expectedTarget: null },
  { text: "הוספת תוספת חדשה בסוף החוק", expectedType: "add_schedule", expectedTarget: null },
  { text: 'בתוספת, במקום "500 שקלים" יבוא "750 שקלים"', expectedType: "replace_schedule", expectedTarget: null },
  // ---- amend_phrase fallback (real) ----
  { text: "תיקון סעיף 4 בחוק־יסוד: השפיטה, בסעיף 4 -", expectedType: "amend_phrase", expectedTarget: "4", real: true },
  { text: "בסעיף 13 לחוק הבחירות לכנסת, התשי\"ט-1959 -", expectedType: "amend_phrase", expectedTarget: "13", real: true },
  { text: "בסעיף 44 -", expectedType: "amend_phrase", expectedTarget: "44", real: true },
  { text: "תיקון סעיף 20", expectedType: "amend_phrase", expectedTarget: "20" },
  // ---- more real coverage ----
  { text: 'בסעיף 9, בסעיפים קטנים (א) ו(ב), במקום "בהתייעצות עם" יבוא "בהסכמת"', expectedType: "replace_words", expectedTarget: "9", real: true },
  { text: 'בסעיף 3(א), במקום "רשאי" יבוא "חייב"', expectedType: "replace_words", expectedTarget: "3(א)" },
  { text: 'בסעיף 6, במקום "מאסר שנה" יבוא "מאסר שנתיים"', expectedType: "replace_words", expectedTarget: "6" },
  { text: "אחרי סעיף 40 יבוא:", expectedType: "add_section", expectedTarget: "40" },
  { text: "סעיף 25 בטל", expectedType: "delete_section", expectedTarget: "25" },
  { text: "במקום סעיף 31 יבוא:", expectedType: "replace_section", expectedTarget: "31" },
  { text: 'אחרי המילים "החלטת הממשלה" יבוא "ברוב חבריה"', expectedType: "insert_words", expectedTarget: null },
  { text: 'המילים "בכפוף לאישור" יימחקו', expectedType: "delete_words", expectedTarget: null },
  { text: "תחילתו של חוק זה 90 ימים מיום פרסומו", expectedType: "change_effective_date", expectedTarget: null },
  { text: 'בסעיף 2, במקום ההגדרה "עובד" יבוא:', expectedType: "rename_term", expectedTarget: "2" },
  { text: "אחרי סעיף 5א יבוא סעיף 5ב:", expectedType: "add_section", expectedTarget: "5א" },
  { text: "סעיף קטן (ב) בטל", expectedType: "delete_section", expectedTarget: "(ב)" },
  { text: 'בסעיף 14, במקום "ועדה" יבוא "ועדת משנה"', expectedType: "replace_words", expectedTarget: "14" },
  { text: "במקום סעיף 9 לחוק העיקרי יבוא:", expectedType: "replace_section", expectedTarget: "9" },
  { text: "אחרי סעיף 18 יבוא סעיף 18א", expectedType: "add_section", expectedTarget: "18" },
  { text: 'בסעיף 7, במקום "חמישה" יבוא "שבעה"', expectedType: "replace_words", expectedTarget: "7" },
  { text: "ביטול סעיף 33", expectedType: "delete_section", expectedTarget: "33" },
  { text: 'אחרי המילים "בית הדין" יבוא "לעבודה"', expectedType: "insert_words", expectedTarget: null },
  { text: "הוראת מעבר: התיקון יחול על הליכים שיוגשו לאחר תחילתו", expectedType: "transitional", expectedTarget: null },
  { text: 'בתוספת השלישית, במקום "פרט 5" יבוא "פרט 5א"', expectedType: "replace_schedule", expectedTarget: null },
  { text: 'בסעיף 8(ג), במקום "רשאי השר" יבוא "חייב השר"', expectedType: "replace_words", expectedTarget: "8(ג)" },
  { text: "החלפת סעיף 12", expectedType: "replace_section", expectedTarget: "12" },
  { text: "הוספת סעיף 40א", expectedType: "add_section", expectedTarget: "40א" },
  { text: "סעיף 6 — בטל", expectedType: "delete_section", expectedTarget: "6" },
  { text: 'בסעיף 5, במקום "שלושה חודשים" יבוא "שישה חודשים"', expectedType: "replace_words", expectedTarget: "5" },
  { text: "תחילתו של חוק זה ביום כ' בטבת", expectedType: "change_effective_date", expectedTarget: null },
  { text: 'בסעיף 3, אחרי המילים "בכתב" יבוא "ובחתימה"', expectedType: "insert_words", expectedTarget: "3" },
  { text: 'בסעיף 9, המילים "ובלבד" יימחקו', expectedType: "delete_words", expectedTarget: "9" },
  { text: "האמור בסעיף 4 יסומן כסעיף קטן (א)", expectedType: "renumber_section", expectedTarget: "4" },
  { text: "אחרי סעיף 11 יבוא:", expectedType: "add_section", expectedTarget: "11" },
  { text: "במקום סעיף 2 יבוא:", expectedType: "replace_section", expectedTarget: "2" },
  { text: "סעיף 8 בטל", expectedType: "delete_section", expectedTarget: "8" },
  { text: 'בסעיף 15, במקום "מאה שקלים" יבוא "מאתיים שקלים"', expectedType: "replace_words", expectedTarget: "15" },
  { text: 'אחרי המילים "משרד הבריאות" יבוא "או קופת חולים"', expectedType: "insert_words", expectedTarget: null },
  { text: 'בהגדרת "תושב", במקום "אזרח" יבוא "אזרח או תושב קבע"', expectedType: "rename_term", expectedTarget: null },
  { text: "אחרי התוספת יבוא תוספת ב'", expectedType: "add_schedule", expectedTarget: null },
  { text: 'בתוספת הראשונה, במקום "1,000" יבוא "1,500"', expectedType: "replace_schedule", expectedTarget: null },
  { text: "תחילתו של חוק זה שנה מיום פרסומו", expectedType: "change_effective_date", expectedTarget: null },
  { text: "הוראת שעה: סעיף זה יעמוד בתוקפו שנתיים", expectedType: "transitional", expectedTarget: null },
  { text: "סעיף קטן (ד) בטל", expectedType: "delete_section", expectedTarget: "(ד)" },
  { text: "אחרי סעיף 22 יבוא סעיף 22א:", expectedType: "add_section", expectedTarget: "22" },
  { text: 'בסעיף 10, במקום "השר הממונה" יבוא "השר"', expectedType: "replace_words", expectedTarget: "10" },
  { text: "במקום סעיף 45 יבוא:", expectedType: "replace_section", expectedTarget: "45" },
  { text: 'בסעיף 4, המילים "לאחר התייעצות" יימחקו', expectedType: "delete_words", expectedTarget: "4" },
  { text: "האמור יסומן כפסקה (1)", expectedType: "renumber_section", expectedTarget: null },
  { text: "תחילתו של תיקון זה ביום פרסומו", expectedType: "change_effective_date", expectedTarget: null },
  { text: 'בסעיף 2, במקום "יום" יבוא "יום עסקים"', expectedType: "replace_words", expectedTarget: "2" },
  { text: "אחרי סעיף 3 יבוא סעיף 3א", expectedType: "add_section", expectedTarget: "3" },
  { text: "סעיף 19 בטל", expectedType: "delete_section", expectedTarget: "19" },
  { text: 'בסעיף 16(ב), במקום "60 ימים" יבוא "90 ימים"', expectedType: "replace_words", expectedTarget: "16(ב)" },
  { text: "הוראת מעבר: הוראה זו תחול על בקשות תלויות ועומדות", expectedType: "transitional", expectedTarget: null },
];

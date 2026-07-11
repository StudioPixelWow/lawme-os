/**
 * Israeli procedure-code registry.
 * Canonical form uses the standard double-quote gershayim (") before the
 * final letter. courtHint is filled ONLY where the code itself implies the
 * court system unambiguously — nothing is invented.
 */
import type { ProcedureInfo } from "./types.ts";

const P = (
  code: string,
  asciiKey: string,
  nameHe: string,
  nameEn: string,
  courtHint: string | null,
): ProcedureInfo => ({ code, asciiKey, nameHe, nameEn, courtHint });

/** Keyed by the code WITHOUT punctuation (bare Hebrew letters). */
export const PROCEDURE_CODES: Record<string, ProcedureInfo> = {
  // --- civil appeals & leave ---
  עא: P('ע"א', "EA", "ערעור אזרחי", "Civil appeal", null),
  רעא: P('רע"א', "REA", "רשות ערעור אזרחי", "Civil leave to appeal", null),
  ברע: P('בר"ע', "BRE", "בקשת רשות ערעור", "Application for leave to appeal", null),
  // --- constitutional / administrative ---
  בגץ: P('בג"ץ', "BAGATZ", "בית משפט גבוה לצדק", "High Court of Justice petition", "supreme"),
  עתמ: P('עת"מ', "ATM", "עתירה מנהלית", "Administrative petition", "administrative"),
  עמנ: P('עמ"נ', "AMN", "ערעור מנהלי", "Administrative appeal", "administrative"),
  // --- first-instance civil / criminal ---
  תא: P('ת"א', "TA", "תיק אזרחי", "Civil case", null),
  תאמ: P('תא"מ', "TAM", "תביעה אזרחית בסדר דין מהיר", "Fast-track civil claim", null),
  תאק: P('תא"ק', "TAK", "תביעה אזרחית בסדר דין מקוצר", "Summary-procedure civil claim", null),
  תפ: P('ת"פ', "TP", "תיק פלילי", "Criminal case", null),
  הפ: P('ה"פ', "HP", "המרצת פתיחה", "Originating motion", null),
  // --- family ---
  עמש: P('עמ"ש', "AMSH", "ערעור משפחה", "Family appeal", "family"),
  רמש: P('רמ"ש', "RMSH", "רשות ערעור משפחה", "Family leave to appeal", "family"),
  תלהמ: P('תלה"מ', "TLHM", "תובענה להסדר התדיינויות במשפחה", "Family litigation-arrangement claim", "family"),
  // --- labor courts ---
  סע: P('ס"ע', "SE", "סכסוך עבודה", "Labor dispute", "labor-regional"),
  סעש: P('סע"ש', "SAS", "סכסוך עבודה בסמכות שופט", "Labor dispute (judge jurisdiction)", "labor-regional"),
  עע: P('ע"ע', "EE", "ערעור עבודה", "Labor appeal", "labor-national"),
  עבל: P('עב"ל', "AVL", "ערעור ביטוח לאומי", "National Insurance appeal", "labor-national"),
  בל: P('ב"ל', "BL", "ביטוח לאומי", "National Insurance case", "labor-regional"),
  דמ: P('ד"מ', "DM", "דיון מהיר", "Expedited labor hearing", "labor-regional"),
  // --- tax ---
  עמ: P('ע"מ', "AM", "ערעור מס", "Tax appeal", null),
};

/** Alias spellings occasionally seen in the wild → bare canonical key. */
export const CODE_ALIASES: Record<string, string> = {
  בגצ: "בגץ", // final tsadi variant of בג"ץ
};

/** Year sanity bounds for validation (state founded 1948). */
export const MIN_YEAR = 1948;
export const MAX_YEAR_AHEAD = 1; // allow next-year filings around new year

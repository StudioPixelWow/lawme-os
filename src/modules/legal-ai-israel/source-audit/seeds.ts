/**
 * Seed registry — candidate Israeli legal sources for auditing. Every entry
 * enters as a CANDIDATE (audit pending, collector audit_required). NONE is
 * marked OPEN here: a source only earns a usable status by a real audit.
 */
import type { SourceType, OwnerType } from "./types.ts";

export interface SeedSource {
  name: string;
  url: string;
  sourceType: SourceType;
  ownerType: OwnerType;
  note: string;
}

export const SEED_SOURCES: readonly SeedSource[] = [
  { name: "הרשות השופטת", url: "https://www.court.gov.il/", sourceType: "court", ownerType: "official", note: "אתר הרשות השופטת" },
  { name: "בית המשפט העליון — פסיקה", url: "https://supremedecisions.court.gov.il/", sourceType: "court", ownerType: "official", note: "חיפוש החלטות ופסקי דין של העליון" },
  { name: "gov.il — dynamic collectors", url: "https://www.gov.il/", sourceType: "official_government", ownerType: "official", note: "אוספי החלטות/דוברות/ועדות" },
  { name: "data.gov.il", url: "https://data.gov.il/", sourceType: "open_data", ownerType: "official", note: "פורטל נתונים פתוחים (CKAN)" },
  { name: "בתי הדין לעבודה", url: "https://www.court.gov.il/", sourceType: "court", ownerType: "official", note: "פסיקת עבודה — תת-מסלול" },
  { name: "בתי הדין הרבניים", url: "https://www.gov.il/he/departments/rbc", sourceType: "tribunal", ownerType: "official", note: "הנהלת בתי הדין הרבניים" },
  { name: "המפקחים על רישום מקרקעין", url: "https://www.gov.il/he/departments/dynamiccollectors/tabu_search_verdict", sourceType: "tribunal", ownerType: "official", note: "פסיקת מפקחים" },
  { name: "בתי דין מנהליים / ועדות ערר", url: "https://www.gov.il/", sourceType: "tribunal", ownerType: "official", note: "החלטות מנהליות פומביות" },
  { name: "רשות התחרות", url: "https://www.gov.il/he/departments/competition_authority", sourceType: "regulator", ownerType: "official", note: "החלטות ופרסומים" },
  { name: "רשות ניירות ערך", url: "https://www.isa.gov.il/", sourceType: "regulator", ownerType: "official", note: "החלטות אכיפה/עמדות" },
  { name: "רשות המסים", url: "https://www.gov.il/he/departments/israel_tax_authority", sourceType: "regulator", ownerType: "official", note: "החלטות מיסוי/פרסומים" },
  { name: "מערכת בתי הדין (unicourt)", url: "https://unicourt.justice.gov.il/", sourceType: "tribunal", ownerType: "official", note: "מפתח בתי דין וועדות" },
  { name: "ארכיון המדינה", url: "https://www.gov.il/he/departments/israel_state_archives", sourceType: "archive", ownerType: "official", note: "חומרי ארכיון" },
  { name: "נבו (מסחרי)", url: "https://www.nevo.co.il/", sourceType: "commercial_database", ownerType: "commercial", note: "מאגר מסחרי — לא לאיסוף; רישום לצורך מיפוי בלבד" },
  { name: "תקדין (מסחרי)", url: "https://www.takdin.co.il/", sourceType: "commercial_database", ownerType: "commercial", note: "מאגר מסחרי — לא לאיסוף" },
  { name: "Judgments.org.il", url: "https://judgments.org.il/", sourceType: "document_repository", ownerType: "commercial", note: "מאגר צד-ג' חינמי; server-side 403 — allowlist/API נדרש" },
];

/**
 * Offline fixtures + a fixture JsonHttp (no network, ever).
 *
 * Serves OData (Knesset) and CKAN datastore (data.gov.il) responses from
 * in-memory rows, with pagination that mirrors the real APIs, so the whole
 * pipeline runs end-to-end in CI. It can also simulate transient failures
 * (retry test) and terminal access blocks (fail-closed test).
 */
import type { JsonHttp } from "../collectors/http.ts";
import { HttpAccessBlockedError } from "../collectors/http.ts";

// ---- Knesset OData fixture rows ----
export const KNESSET_LAWS: Record<string, unknown>[] = [
  { LawID: "2001", Name: "חוק הגנת השכר, התשי\"ח-1958", LawTypeDesc: "חוק ראשי", PublicationDate: "1958-07-24", LawValidity: "בתוקף", KnessetNum: "3", LastUpdatedDate: "2021-01-01" },
  { LawID: "2002", Name: "חוק שעות עבודה ומנוחה, התשי\"א-1951", LawTypeDesc: "חוק ראשי", PublicationDate: "1951-05-25", LawValidity: "בתוקף", KnessetNum: "1", LastUpdatedDate: "2020-06-01" },
  { LawID: "2003", Name: "", LawTypeDesc: "חוק ראשי", PublicationDate: "1959-01-01", LawValidity: "בתוקף", KnessetNum: "3", LastUpdatedDate: "2019-01-01" }, // missing title → low confidence
];

export const KNESSET_BILLS: Record<string, unknown>[] = [
  { BillID: "5001", Name: "הצעת חוק הגנת השכר (תיקון), התשפ\"ד-2024", SubTypeDesc: "ממשלתית", KnessetNum: "25", StatusID: "108", StatusDesc: "אושרה", PublicationDate: "2024-02-01", Number: "1234", SessionNum: "2", LastUpdatedDate: "2024-02-10" },
  { BillID: "5002", Name: "הצעת חוק שעות עבודה (תיקון)", SubTypeDesc: "פרטית", KnessetNum: "25", StatusID: "102", StatusDesc: "בהכנה", PublicationDate: "2024-03-01", Number: "1235", SessionNum: "2", LastUpdatedDate: "2024-03-05" },
];

export const KNESSET_DOCBILLS: Record<string, unknown>[] = [
  { DocumentBillID: "9001", BillID: "5001", GroupTypeDesc: "נוסח לקריאה ראשונה", ApplicationDesc: "PDF", FilePath: "https://fs.knesset.gov.il/25/law/25_lsr_5001.pdf", LastUpdatedDate: "2024-02-05" },
];

export const KNESSET_SUBJECTS: Record<string, unknown>[] = [
  { SubjectID: "7001", Name: "דיני עבודה" },
  { SubjectID: "7002", Name: "שכר מינימום" },
];

export const KNESSET_INITIATORS: Record<string, unknown>[] = [
  { BillID: "5002", PersonID: "301", IsInitiator: true, Ordinal: "1" },
];

// A "deleted" law row for tombstone tests (served by a variant http).
export const KNESSET_LAWS_WITH_DELETION: Record<string, unknown>[] = [
  { ...KNESSET_LAWS[0] },
  { LawID: "2002", __deleted: true }, // will be marked deleted by the collector? OData has no __deleted; handled in mapper via rec.deleted — see updated-run helper
];

// ---- data.gov.il CKAN datastore fixture rows ----
// ararim / mishmoret carry full document text (full_text). judgments carry a
// summary only (summary) — never to be marked full_text.
export const ARARIM_ROWS: Record<string, unknown>[] = [
  {
    _id: 1, "מספר הליך": "ערר 1234-01-23", "ערכאה": "בית הדין לעררים תל אביב",
    "צדדים": "פלוני נ' משרד הפנים", "תאריך החלטה": "2023-03-15", "נושא": "מעמד",
    "קישור": "https://data.gov.il/ararim/1234.pdf",
    "נוסח ההחלטה": "החלטה\nלאחר שעיינתי בטענות הצדדים, הערר מתקבל. המבקש זכאי למעמד.\nסוף דבר\nהערר מתקבל.",
  },
  {
    _id: 2, "מספר הליך": "ערר 5678-02-23", "ערכאה": "בית הדין לעררים ירושלים",
    "צדדים": "אלמוני נ' רשות האוכלוסין", "תאריך החלטה": "2023-05-20", "נושא": "אשרה",
    "קישור": "https://data.gov.il/ararim/5678.pdf",
    "נוסח ההחלטה": "פסק דין\nהעובדות\nהמבקש הגיש בקשה לאשרה. דיון והכרעה\nהבקשה נדחית.",
  },
  {
    _id: 3, "מספר הליך": "", "ערכאה": "בית הדין לעררים חיפה",
    "צדדים": "", "תאריך החלטה": "2023-06-01", // missing case number + parties → gates/low confidence
    "נוסח ההחלטה": "החלטה קצרה ללא פרטים מזהים.",
  },
];

export const MISHMORET_ROWS: Record<string, unknown>[] = [
  {
    _id: 1, "מספר תיק": "משמורת 9001-03-22", "בית הדין": "בית הדין למשמורת",
    "צדדים": "מדינת ישראל נ' פלוני", "תאריך": "2022-11-10", "נושא": "משמורת",
    "קישור": "https://data.gov.il/mishmoret/9001.pdf",
    "נוסח ההחלטה": "החלטה\nהוחלט על שחרור בערובה בתנאים.",
  },
];

export const JUDGMENTS_ROWS: Record<string, unknown>[] = [
  {
    _id: 1, "מספר תיק": "ת\"א 11111-01-21", "בית המשפט": "שלום תל אביב", "מחוז": "תל אביב",
    "תאריך": "2021-04-01", "תמצית": "תביעה כספית שהתקבלה חלקית.", "הוצאות": "5000 ש\"ח",
    // NOTE: no full text — summary only. Must be content_level = summary, never full_text.
  },
  {
    _id: 2, "מספר תיק": "ע\"א 22222-02-21", "בית המשפט": "מחוזי חיפה", "מחוז": "חיפה",
    "תאריך": "2021-07-15", "תמצית": "ערעור שנדחה.",
  },
];

// A restricted decision whose SUMMARY carries a publication-restriction notice
// (איסור פרסום) → must be quarantined (judgments-style, since real datasets ship
// a summary, not full text).
export const ARARIM_RESTRICTED: Record<string, unknown>[] = [
  {
    _id: 99, "מספר הליך": "עת'מ 4444-04-23", "מחוז": "ירושלים",
    "תאריך פסק הדין": "2023-08-01",
    "פירוט ההחלטה": "צו איסור פרסום - חל איסור פרסום על פרטי הקטין.",
  },
];

// ---- Fixture HTTP ----

export interface FixtureConfig {
  odata: Record<string, Record<string, unknown>[]>; // entitySet -> rows
  ckan: Record<string, Record<string, unknown>[]>; // resourceId -> rows
  failFirstN?: number; // simulate N transient failures before succeeding (retry test)
  blockStatus?: number; // if set, throw HttpAccessBlockedError (fail-closed test)
}

export class FixtureHttp implements JsonHttp {
  private readonly cfg: FixtureConfig;
  private failsRemaining: number;
  constructor(cfg: FixtureConfig) {
    this.cfg = cfg;
    this.failsRemaining = cfg.failFirstN ?? 0;
  }

  async getJson(url: string): Promise<unknown> {
    if (this.cfg.blockStatus) throw new HttpAccessBlockedError(url, this.cfg.blockStatus);
    if (this.failsRemaining > 0) { this.failsRemaining -= 1; throw new Error("simulated transient network error"); }

    // OData: /ParliamentInfo/<EntitySet>?$top=T&$skip=S
    const odataMatch = url.match(/ParliamentInfo\/([A-Za-z_]+)\?/);
    if (odataMatch) {
      const set = odataMatch[1];
      const top = Number(url.match(/\$top=(\d+)/)?.[1] ?? "100");
      const skip = Number(url.match(/\$skip=(\d+)/)?.[1] ?? "0");
      const rows = this.cfg.odata[set] ?? [];
      return { value: rows.slice(skip, skip + top), "@odata.count": rows.length };
    }

    // CKAN datastore_search: ?resource_id=RID&limit=L&offset=O
    if (url.includes("datastore_search")) {
      const rid = decodeURIComponent(url.match(/resource_id=([^&]+)/)?.[1] ?? "");
      const limit = Number(url.match(/limit=(\d+)/)?.[1] ?? "100");
      const offset = Number(url.match(/offset=(\d+)/)?.[1] ?? "0");
      const rows = this.cfg.ckan[rid] ?? [];
      return { success: true, result: { records: rows.slice(offset, offset + limit), total: rows.length } };
    }

    throw new Error(`fixture http has no handler for ${url}`);
  }

  async getText(url: string): Promise<string> {
    return JSON.stringify(await this.getJson(url));
  }
}

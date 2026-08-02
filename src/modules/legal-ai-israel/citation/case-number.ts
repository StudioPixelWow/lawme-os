/**
 * Israeli case-number normalizer (LEGAL AI ISRAEL — Phase 1 parser).
 *
 * Parses Israeli proceeding case numbers in both the classic form
 * (`ע"א 6821/93`) and the modern net-hamishpat form (`ת"א 12345-01-20`,
 * serial-month-year). It is tolerant of gershayim/quote variants (״ " ׳ ')
 * and spacing, and ALWAYS preserves the raw input alongside the normalized
 * value. It fabricates nothing: unknown proceeding types return a result with
 * `proceedingTypeCanonical: null` rather than a guess.
 *
 * node --test conventions: union types, relative `.ts` imports, no enums.
 */

export type CaseNumberFormat = "classic" | "modern" | "unknown";

export interface NormalizedCaseNumber {
  raw: string;
  proceedingTypeRaw: string | null;
  proceedingTypeCanonical: string | null; // canonical Hebrew, e.g. `ע"א`
  proceedingCode: string | null;          // latin code, e.g. "aa"
  serial: string | null;                  // the running number
  month: string | null;                   // modern form only
  year: string | null;                    // 2 or 4 digit as published
  format: CaseNumberFormat;
  normalized: string;                     // canonical display string
}

interface ProceedingType {
  canonicalHe: string; // with gershayim
  code: string;        // stable latin code
  labelHe: string;
}

/** Registry of Israeli proceeding types (extensible). */
export const PROCEEDING_TYPES: readonly ProceedingType[] = [
  { canonicalHe: "בג\"ץ", code: "hcj", labelHe: "בג\"ץ — בית משפט גבוה לצדק" },
  { canonicalHe: "דנג\"ץ", code: "hcj_further", labelHe: "דיון נוסף בג\"ץ" },
  { canonicalHe: "ע\"א", code: "ca", labelHe: "ערעור אזרחי" },
  { canonicalHe: "רע\"א", code: "clca", labelHe: "רשות ערעור אזרחי" },
  { canonicalHe: "דנ\"א", code: "cfh", labelHe: "דיון נוסף אזרחי" },
  { canonicalHe: "עע\"מ", code: "aaa", labelHe: "ערעור עניינים מנהליים" },
  { canonicalHe: "עת\"מ", code: "amm", labelHe: "עתירה מנהלית" },
  { canonicalHe: "בש\"פ", code: "hcrim", labelHe: "בקשת רשות פלילי" },
  { canonicalHe: "ע\"פ", code: "crima", labelHe: "ערעור פלילי" },
  { canonicalHe: "רע\"פ", code: "clcrim", labelHe: "רשות ערעור פלילי" },
  { canonicalHe: "ת\"א", code: "civ", labelHe: "תביעה אזרחית" },
  { canonicalHe: "תא\"מ", code: "civ_small", labelHe: "תביעה אזרחית בסדר דין מהיר" },
  { canonicalHe: "ת\"ק", code: "small_claims", labelHe: "תביעה קטנה" },
  { canonicalHe: "חדל\"ת", code: "insolv", labelHe: "חדלות פירעון (תאגיד)" },
  { canonicalHe: "ס\"ע", code: "labor_se", labelHe: "סכסוך עבודה" },
  { canonicalHe: "סע\"ש", code: "labor_sesh", labelHe: "סכסוך עבודה (סע\"ש)" },
  { canonicalHe: "ע\"ע", code: "labor_appeal", labelHe: "ערעור עבודה" },
  { canonicalHe: "עמ\"ש", code: "family_appeal", labelHe: "ערעור משפחה" },
  { canonicalHe: "רמ\"ש", code: "family_lca", labelHe: "רשות ערעור משפחה" },
  { canonicalHe: "תלה\"מ", code: "family_claim", labelHe: "תובענה לענייני משפחה" },
  { canonicalHe: "ה\"פ", code: "originating", labelHe: "המרצת פתיחה" },
  { canonicalHe: "פר\"ק", code: "winding_up", labelHe: "פירוק" },
  { canonicalHe: "ערר", code: "appeal_err", labelHe: "ערר" },
];

/** Strip gershayim/quotes/geresh/dots/spaces → letters only, for matching. */
function stripToken(s: string): string {
  return s.replace(/[׳״"'’׳.\s]/g, "");
}

const CODE_BY_STRIPPED: ReadonlyMap<string, ProceedingType> = new Map(
  PROCEEDING_TYPES.map((p) => [stripToken(p.canonicalHe), p]),
);

// Longest stripped key first, so "עע"מ" wins over "ע"ע" prefixes etc.
const STRIPPED_KEYS: readonly string[] = [...CODE_BY_STRIPPED.keys()].sort(
  (a, b) => b.length - a.length,
);

const CLASSIC = /^(\d+)\s*\/\s*(\d{2,4})$/;               // 6821/93
const MODERN = /^(\d+)\s*-\s*(\d{1,2})\s*-\s*(\d{2,4})$/; // 12345-01-20

/** Parse a raw Israeli case number. Returns null only for empty input. */
export function parseCaseNumber(raw: string): NormalizedCaseNumber | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // Split into a leading proceeding token and the numeric remainder.
  const firstDigit = trimmed.search(/\d/);
  const head = firstDigit > 0 ? trimmed.slice(0, firstDigit).trim() : "";
  const tail = firstDigit > 0 ? trimmed.slice(firstDigit).trim() : trimmed;

  let type: ProceedingType | null = null;
  const proceedingTypeRaw: string | null = head.length > 0 ? head : null;
  if (head.length > 0) {
    const strippedHead = stripToken(head);
    for (const key of STRIPPED_KEYS) {
      if (strippedHead === key) { type = CODE_BY_STRIPPED.get(key)!; break; }
    }
    // "חדלות פירעון" spelled out → insolv
    if (!type && strippedHead.includes(stripToken("חדלותפירעון"))) {
      type = CODE_BY_STRIPPED.get(stripToken("חדל\"ת")) ?? null;
    }
  }

  let format: CaseNumberFormat = "unknown";
  let serial: string | null = null;
  let month: string | null = null;
  let year: string | null = null;

  const modern = tail.match(MODERN);
  const classic = tail.match(CLASSIC);
  if (modern) {
    format = "modern";
    serial = modern[1];
    month = modern[2].padStart(2, "0");
    year = modern[3];
  } else if (classic) {
    format = "classic";
    serial = classic[1];
    year = classic[2];
  }

  const canonicalHe = type ? type.canonicalHe : null;
  const numericPart =
    format === "modern" ? `${serial}-${month}-${year}` :
    format === "classic" ? `${serial}/${year}` :
    tail;
  const normalized = canonicalHe ? `${canonicalHe} ${numericPart}` : numericPart;

  return {
    raw: trimmed,
    proceedingTypeRaw,
    proceedingTypeCanonical: canonicalHe,
    proceedingCode: type ? type.code : null,
    serial,
    month,
    year,
    format,
    normalized,
  };
}

/** True when both the proceeding type and a numeric form were recognized. */
export function isFullyParsed(n: NormalizedCaseNumber): boolean {
  return n.proceedingTypeCanonical !== null && n.format !== "unknown";
}

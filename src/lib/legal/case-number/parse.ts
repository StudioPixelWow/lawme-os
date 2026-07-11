/**
 * Israeli case-number parser.
 * Tolerates: Hebrew/ASCII/typographic quote marks, geresh/gershayim,
 * maqaf/en-dash/em-dash hyphens, stray spaces, common OCR noise.
 * Never invents metadata — anything underivable is null + warning.
 */
import { CODE_ALIASES, MAX_YEAR_AHEAD, MIN_YEAR, PROCEDURE_CODES } from "./formats.ts";
import type { CaseNumberFormat, ParsedCaseNumber, ProcedureInfo } from "./types.ts";

/** All characters treated as an internal quote mark inside a code. */
const QUOTE_CHARS = /["״׳'‘’“”ʺʹ`]/g;
/** All characters treated as a hyphen between number groups. */
const HYPHEN_CHARS = /[-‐‑‒–—־]/g;
/** Zero-width and directional marks that OCR/copy-paste inject. */
const INVISIBLES = /[\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;
const EXOTIC_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;

export interface PreprocessResult {
  cleaned: string;
  hadNoise: boolean;
}

/** Normalize the raw string into a predictable working form. */
export function preprocess(input: string): PreprocessResult {
  const original = input;
  let s = input.normalize("NFC");
  s = s.replace(INVISIBLES, "");
  s = s.replace(EXOTIC_SPACES, " ");
  s = s.replace(HYPHEN_CHARS, "-");
  s = s.replace(QUOTE_CHARS, '"');
  s = s.replace(/\s+/g, " ").trim();
  // OCR: space accidentally inserted around hyphens/slashes inside numbers
  s = s.replace(/(\d)\s*-\s*(\d)/g, "$1-$2").replace(/(\d)\s*\/\s*(\d)/g, "$1/$2");
  return { cleaned: s, hadNoise: s !== original.trim() };
}

interface CodeMatch {
  procedure: ProcedureInfo | null;
  bareCode: string | null;
  rest: string;
  codeWarnings: string[];
}

/** Extract the leading Hebrew procedure code (with or without quote marks). */
function extractCode(cleaned: string): CodeMatch {
  const m = cleaned.match(/^([א-ת"]{1,7})\s+(.+)$/);
  if (!m) return { procedure: null, bareCode: null, rest: cleaned, codeWarnings: [] };
  const bare = m[1].replace(/"/g, "");
  const canonicalKey = CODE_ALIASES[bare] ?? bare;
  const procedure = PROCEDURE_CODES[canonicalKey] ?? null;
  const warnings: string[] = [];
  if (!procedure && /^[א-ת]{1,6}$/.test(bare)) {
    warnings.push(`קוד הליך לא מוכר: "${m[1]}" — נשמר כפי שהוא, ללא מטא-נתונים`);
  }
  return { procedure, bareCode: bare, rest: m[2].trim(), codeWarnings: warnings };
}

interface NumberMatch {
  format: CaseNumberFormat;
  sequence: number | null;
  month: number | null;
  year: number | null;
  numberWarnings: string[];
}

/** Convert a 2-digit year to 4 digits (48-99 → 19xx, else 20xx). */
export function expandYear(two: number): number {
  return two >= 48 ? 1900 + two : 2000 + two;
}

/** Parse the numeric portion after the code. */
function extractNumber(rest: string): NumberMatch {
  const warnings: string[] = [];

  // Hyphenated (Net HaMishpat): serial-month-year2  e.g. 12345-01-20
  const hyphen = rest.match(/^(\d{1,6})-(\d{1,2})-(\d{2})$/);
  if (hyphen) {
    const sequence = Number(hyphen[1]);
    const month = Number(hyphen[2]);
    const year = expandYear(Number(hyphen[3]));
    if (month < 1 || month > 12) {
      warnings.push(`חודש לא תקין (${hyphen[2]}) — ייתכן סדר שדות שונה`);
      return { format: "hyphenated", sequence, month: null, year, numberWarnings: warnings };
    }
    return { format: "hyphenated", sequence, month, year, numberWarnings: warnings };
  }

  // Slash (historical & Supreme Court): serial/year2 or serial/year4
  const slash = rest.match(/^(\d{1,6})\/(\d{2}|\d{4})$/);
  if (slash) {
    const sequence = Number(slash[1]);
    const rawYear = Number(slash[2]);
    const year = slash[2].length === 4 ? rawYear : expandYear(rawYear);
    return { format: "slash", sequence, month: null, year, numberWarnings: warnings };
  }

  warnings.push(`מבנה מספרי לא מזוהה: "${rest}"`);
  return { format: "unrecognized", sequence: null, month: null, year: null, numberWarnings: warnings };
}

/** Full parse of a raw case-number string. */
export function parseCaseNumber(input: string): ParsedCaseNumber {
  const base: ParsedCaseNumber = {
    original: input,
    ok: false,
    display: null,
    searchKey: null,
    procedureCode: null,
    procedure: null,
    sequence: null,
    month: null,
    year: null,
    format: "unrecognized",
    courtHint: null,
    confidence: 0,
    warnings: [],
  };
  if (!input || !input.trim()) {
    base.warnings.push("קלט ריק");
    return base;
  }

  const { cleaned, hadNoise } = preprocess(input);
  const { procedure, bareCode, rest, codeWarnings } = extractCode(cleaned);
  const num = extractNumber(rest);
  const warnings = [...codeWarnings, ...num.numberWarnings];

  // Year sanity
  const maxYear = new Date().getFullYear() + MAX_YEAR_AHEAD;
  if (num.year !== null && (num.year < MIN_YEAR || num.year > maxYear)) {
    warnings.push(`שנה מחוץ לטווח סביר: ${num.year}`);
  }

  const ok = num.format !== "unrecognized" && num.sequence !== null && bareCode !== null;

  // Confidence: known code + parsed number = 1.0; unknown code = 0.7;
  // noise-corrected input caps at 0.9; unparsed = 0.
  let confidence = 0;
  if (ok) {
    confidence = procedure ? 1.0 : 0.7;
    if (hadNoise) confidence = Math.min(confidence, 0.9);
    if (warnings.length > 0) confidence = Math.min(confidence, 0.8);
  }

  return {
    ...base,
    ok,
    procedureCode: procedure?.code ?? (bareCode ? cleaned.split(" ")[0] : null),
    procedure,
    sequence: num.sequence,
    month: num.month,
    year: num.year,
    format: num.format,
    courtHint: procedure?.courtHint ?? null,
    confidence,
    warnings,
  };
}

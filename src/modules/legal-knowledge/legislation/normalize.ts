/**
 * Statute & section normalization (Epic 3B, Phase 5).
 * Deterministic, Hebrew-aware utilities so real legislation and its
 * sections can be matched reliably across spelling/quote variants and
 * citation forms. No network, no model.
 */
import { normalizeText } from "../extraction/normalize-text.ts";

export const LEGISLATION_NORMALIZE_VERSION = "legislation-normalize-1.0.0";

/** Hebrew-number → integer for section numbers (א=1 … כב=22 …). */
const HEB_ONES: Record<string, number> = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9 };
const HEB_TENS: Record<string, number> = { י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90 };
const HEB_HUNDREDS: Record<string, number> = { ק: 100, ר: 200, ש: 300, ת: 400 };

export function hebrewNumeralToInt(input: string): number | null {
  const s = input.replace(/["'׳״]/g, "").trim();
  if (!s) return null;
  let total = 0;
  for (const ch of s) {
    if (ch in HEB_HUNDREDS) total += HEB_HUNDREDS[ch];
    else if (ch in HEB_TENS) total += HEB_TENS[ch];
    else if (ch in HEB_ONES) total += HEB_ONES[ch];
    else return null; // non-Hebrew-numeral char → not a pure gematria token
  }
  return total > 0 ? total : null;
}

/**
 * Normalize a statute NAME to a stable key: strips the definite article,
 * year suffixes ("התשכ״ג-1963" / "1963"), punctuation and spacing so
 * "חוק פיצויי הפיטורים, התשכ״ג-1963" and "חוק פיצויי פיטורים" collapse.
 */
export function normalizeStatuteName(name: string): string {
  let s = normalizeText(name);
  s = s.replace(/,?\s*הת?ש[א-ת]{1,3}["'׳״]?[א-ת]?\s*[-–]?\s*\d{4}/g, ""); // Hebrew-year + Gregorian
  s = s.replace(/[-–]\s*\d{4}\b/g, "");
  s = s.replace(/\b\d{4}\b/g, "");
  s = s.replace(/["'׳״(),.]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  // drop a leading definite article on the second word ("פיצויי הפיטורים")
  s = s.replace(/(^|\s)ה(?=[א-ת])/g, "$1");
  return s;
}

/** Stable slug id for a statute, e.g. "severance-pay-law". Caller supplies
 * the canonical English slug; this validates/normalizes it. */
export function normalizeStatuteId(slug: string): string {
  return slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export interface ParsedSection {
  raw: string;
  /** primary section number as integer where derivable */
  sectionNumber: number | null;
  /** normalized canonical form, e.g. "14", "11א", "24(ב)(1)" */
  normalized: string;
  subsections: string[];      // ["ב","1"] for 11(ב)(1)
  letterSuffix: string | null; // "א" in 11א
}

/**
 * Parse a Hebrew section reference. Handles: "14", "סעיף 14", "11א",
 * "11(א)", "24(ב)(1)", "סעיף 11(א) לחוק".
 */
export function parseSectionRef(input: string): ParsedSection | null {
  const s = normalizeText(input).replace(/^סעיף\s+/, "").replace(/\s+לחוק.*$/, "").trim();
  const m = s.match(/^(\d+)\s*([א-ת]?)\s*((?:\([^)]+\))*)/);
  if (!m) return null;
  const num = Number(m[1]);
  const letter = m[2] || null;
  const subs = [...(m[3] || "").matchAll(/\(([^)]+)\)/g)].map((x) => x[1].trim());
  const normalized = `${num}${letter ?? ""}${subs.map((x) => `(${x})`).join("")}`;
  return { raw: input, sectionNumber: Number.isFinite(num) ? num : null, normalized, subsections: subs, letterSuffix: letter };
}

/** Section-range parsing: "13-16" / "סעיפים 13 עד 16" → [13,14,15,16]. */
export function parseSectionRange(input: string): number[] {
  const s = normalizeText(input).replace(/סעיפים?\s+/g, "");
  const m = s.match(/(\d+)\s*(?:[-–]|עד)\s*(\d+)/);
  if (!m) {
    const single = parseSectionRef(s);
    return single?.sectionNumber != null ? [single.sectionNumber] : [];
  }
  const a = Number(m[1]), b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a || b - a > 500) return [];
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

/** Does normalized section `a` refer to the same section as `b`? */
export function sameSectionKey(a: string, b: string): boolean {
  const pa = parseSectionRef(a), pb = parseSectionRef(b);
  if (!pa || !pb) return false;
  return pa.normalized === pb.normalized;
}

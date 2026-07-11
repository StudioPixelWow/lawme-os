/**
 * Hebrew-aware text normalization shared by all extractors and by the
 * lexical index — the SAME normalization must be applied at index time
 * and at query time.
 */

const QUOTE_CHARS = /[״“”„‟]/g;
const APOSTROPHE_CHARS = /[׳‘’‛]/g;
/** Zero-width & directional marks — DELETED. Explicit escapes only (a
 * literal char class here once swallowed U+0020 — never again). */
const ZERO_WIDTH = /[\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;
/** Exotic spaces — converted to a regular space, never deleted. */
const EXOTIC_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;

export function normalizeText(input: string): string {
  return input
    .normalize("NFC")
    .replace(ZERO_WIDTH, "")
    .replace(EXOTIC_SPACES, " ")
    .replace(QUOTE_CHARS, '"')
    .replace(APOSTROPHE_CHARS, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** Rough language detection sufficient for POC routing. */
export function detectLanguage(text: string): "he" | "en" | "mixed" | "unknown" {
  const hebrew = (text.match(/[א-ת]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  const total = hebrew + latin;
  if (total < 10) return "unknown";
  const heRatio = hebrew / total;
  if (heRatio > 0.85) return "he";
  if (heRatio < 0.15) return "en";
  return "mixed";
}

/**
 * Tokenizer for the lexical index: lowercases Latin, strips punctuation,
 * folds Hebrew final letters so classic morphology variants match
 * (ץ→צ, ם→מ, ן→נ, ך→כ, ף→פ).
 */
export function tokenize(text: string): string[] {
  const folded = normalizeText(text)
    .replace(/ץ/g, "צ").replace(/ם/g, "מ").replace(/ן/g, "נ")
    .replace(/ך/g, "כ").replace(/ף/g, "פ")
    .toLowerCase();
  return folded
    .split(/[^א-תa-z0-9"]+/)
    .map((t) => t.replace(/^"+|"+$/g, ""))
    .filter((t) => t.length >= 2);
}

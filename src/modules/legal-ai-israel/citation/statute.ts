/**
 * Hebrew statutory-reference extraction (LEGAL AI ISRAEL — Phase 2).
 *
 * Deterministic parser for references such as:
 *   "סעיף 12 לחוק החוזים", "סעיפים 12 ו-39 לחוק החוזים",
 *   "תקנה 201 לתקנות סדר הדין האזרחי", "סעיף 2(א)",
 *   "סעיף 7א לחוק איסור לשון הרע", "חוק המקרקעין, תשכ\"ט-1969".
 * It never invents statutory text; unresolved statutes are stored as-is.
 */

export type InstrumentKind = "law" | "regulation" | "ordinance" | "unknown";

export interface StatuteCitation {
  raw: string;
  instrumentKind: InstrumentKind;
  statuteNameRaw: string | null;
  statuteNameNormalized: string | null;
  sections: string[];        // e.g. ["12"], ["12","39"], ["2(א)"], ["7א"]
  enactmentYearHe: string | null; // e.g. "תשכ\"ט"
  enactmentYear: number | null;   // e.g. 1969
  startOffset: number;
  endOffset: number;
}

interface StatuteAlias {
  canonicalName: string;
  enactmentYear: number | null;
  aliases: readonly string[];
}

/** Alias table of common Israeli statutes (extensible; no statutory text). */
export const STATUTE_ALIASES: readonly StatuteAlias[] = [
  { canonicalName: "חוק החוזים (חלק כללי), התשל\"ג-1973", enactmentYear: 1973, aliases: ["חוק החוזים", "חוק החוזים חלק כללי"] },
  { canonicalName: "חוק המקרקעין, התשכ\"ט-1969", enactmentYear: 1969, aliases: ["חוק המקרקעין"] },
  { canonicalName: "חוק איסור לשון הרע, התשכ\"ה-1965", enactmentYear: 1965, aliases: ["חוק איסור לשון הרע", "חוק לשון הרע"] },
  { canonicalName: "תקנות סדר הדין האזרחי, התשע\"ט-2018", enactmentYear: 2018, aliases: ["תקנות סדר הדין האזרחי", "תקסד\"א"] },
  { canonicalName: "חוק החברות, התשנ\"ט-1999", enactmentYear: 1999, aliases: ["חוק החברות"] },
  { canonicalName: "חוק הגנת הצרכן, התשמ\"א-1981", enactmentYear: 1981, aliases: ["חוק הגנת הצרכן"] },
  { canonicalName: "חוק החוזים (תרופות בשל הפרת חוזה), התשל\"א-1970", enactmentYear: 1970, aliases: ["חוק התרופות", "חוק החוזים תרופות"] },
  { canonicalName: "חוק הכשרות המשפטית והאפוטרופסות, התשכ\"ב-1962", enactmentYear: 1962, aliases: ["חוק הכשרות המשפטית והאפוטרופסות"] },
];

const ALIAS_LOOKUP: ReadonlyMap<string, StatuteAlias> = (() => {
  const m = new Map<string, StatuteAlias>();
  for (const s of STATUTE_ALIASES) {
    m.set(s.canonicalName, s);
    for (const a of s.aliases) m.set(a, s);
  }
  return m;
})();

function normalizeName(raw: string): { canonical: string | null; year: number | null } {
  const trimmed = raw.replace(/[\s,]+$/g, "").trim();
  const direct = ALIAS_LOOKUP.get(trimmed);
  if (direct) return { canonical: direct.canonicalName, year: direct.enactmentYear };
  // prefix match on aliases (e.g. "חוק החוזים (חלק כללי)")
  for (const [key, s] of ALIAS_LOOKUP) {
    if (trimmed.startsWith(key) || key.startsWith(trimmed)) return { canonical: s.canonicalName, year: s.enactmentYear };
  }
  return { canonical: null, year: null };
}

function splitSections(tok: string): string[] {
  return tok
    .split(/\s*(?:,|ו-|ו\s|\sו)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /[\d]/.test(s));
}

// "סעיף/סעיפים/תקנה/תקנות <sections> ל(חוק|תקנות|פקודת) <name>"
const SECTION_RE =
  /(סעיפים|סעיף|תקנות|תקנה)\s+([0-9א-ת()]+(?:\s*(?:,|ו-|ו)\s*[0-9א-ת()]+)*)\s+ל(חוק|תקנות|פקוד[הת])\s+([^,.\n:;]+)/g;

// "חוק/תקנות/פקודת <name>, תש..-YYYY"
const NAMED_YEAR_RE =
  /(חוק|תקנות|פקוד[הת])\s+([^,.\n:;]+?),?\s*(תש[א-ת"׳]{1,4})\s*[-–]\s*(\d{4})/g;

function kindOf(word: string): InstrumentKind {
  if (word.startsWith("חוק")) return "law";
  if (word.startsWith("תקנ")) return "regulation";
  if (word.startsWith("פקוד")) return "ordinance";
  return "unknown";
}

export function extractStatuteCitations(text: string): StatuteCitation[] {
  if (!text) return [];
  const out: StatuteCitation[] = [];

  SECTION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SECTION_RE.exec(text)) !== null) {
    // The instrument word (חוק/תקנות/פקודת) is part of the statute's name.
    const nameRaw = `${m[3]} ${m[4].trim()}`.trim();
    const norm = normalizeName(nameRaw);
    out.push({
      raw: m[0],
      instrumentKind: kindOf(m[3]),
      statuteNameRaw: nameRaw,
      statuteNameNormalized: norm.canonical,
      sections: splitSections(m[2]),
      enactmentYearHe: null,
      enactmentYear: norm.year,
      startOffset: m.index,
      endOffset: m.index + m[0].length,
    });
  }

  NAMED_YEAR_RE.lastIndex = 0;
  while ((m = NAMED_YEAR_RE.exec(text)) !== null) {
    const nameRaw = `${m[1]} ${m[2].trim()}`;
    const norm = normalizeName(nameRaw);
    out.push({
      raw: m[0],
      instrumentKind: kindOf(m[1]),
      statuteNameRaw: nameRaw,
      statuteNameNormalized: norm.canonical,
      sections: [],
      enactmentYearHe: m[3],
      enactmentYear: Number(m[4]),
      startOffset: m.index,
      endOffset: m.index + m[0].length,
    });
  }

  return out.sort((a, b) => a.startOffset - b.startOffset);
}

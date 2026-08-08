/**
 * Printed-folio detection for the production citation model.
 *
 * Extracts the printed page label (folio) from a page's header/footer geometry,
 * supporting:
 *   - Arabic-digit folios;
 *   - Hebrew GEMATRIA folios (א, יב, קכ״ג …), including the טו/טז conventions;
 *   - folios MERGED into a running header line (token at the line edge);
 *   - NULL when absent — never inferred without sufficient confidence.
 *
 * The physical `pdf_page_index` is always known and authoritative; this only adds
 * the *printed* label, which is inherently nullable. A weak signal returns null
 * (a missing folio is acceptable; a guessed one is not).
 */
import type { LayoutItem } from "./layout-reconstruct.ts";

const VAL: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400,
  ך: 20, ם: 40, ן: 50, ף: 80, ץ: 90, // final forms
};
const GERESH = /[׳״'"]/g;

/** Value of a Hebrew-numeral token, or null if it isn't a well-formed numeral. */
export function gematriaValue(tokenRaw: string): number | null {
  const s = (tokenRaw ?? "").replace(GERESH, "").trim();
  if (!s || !/^[א-ת]+$/.test(s)) return null;
  let sum = 0;
  for (const c of s) { const v = VAL[c]; if (v == null) return null; sum += v; }
  return sum > 0 ? sum : null;
}

export interface FolioResult {
  printed_page_label: string | null;   // original token as printed (nullable)
  gazette_page_number: string | null;  // numeric value as string (nullable)
  kind: "digit" | "gematria" | null;
  confidence: "high" | "medium" | null;
}
const NONE: FolioResult = { printed_page_label: null, gazette_page_number: null, kind: null, confidence: null };

const isDigit = (t: string) => /^\d{1,4}$/.test(t);
const hasGeresh = (t: string) => /[׳״]/.test(t);
const plausible = (n: number | null) => n != null && n >= 1 && n <= 3000;

/**
 * Detect a printed folio from header/footer bands. Confidence gating:
 *  - digit token in a band                                   → high
 *  - gershayim-marked Hebrew numeral (…״.)                    → high
 *  - isolated short Hebrew numeral (≤4 letters) alone/at edge → medium
 *  - anything weaker                                          → null (never inferred)
 */
export function detectPrintedFolio(items: LayoutItem[]): FolioResult {
  if (!items?.length) return NONE;
  const ys = items.map((i) => i.y); const top = Math.max(...ys), bot = Math.min(...ys); const span = Math.max(1, top - bot);
  const header = items.filter((i) => i.y >= top - 0.12 * span);
  const footer = items.filter((i) => i.y <= bot + 0.12 * span);

  const mk = (label: string, value: number, kind: "digit" | "gematria", confidence: "high"): FolioResult =>
    ({ printed_page_label: label, gazette_page_number: String(value), kind, confidence });

  for (const band of [footer, header]) { // folios usually at the bottom
    const toks = band.map((i) => ({ s: i.str.trim(), x: i.x })).filter((t) => t.s);
    if (!toks.length) continue;
    // 1) digit anywhere in the band (incl. merged in a header line)
    const d = toks.find((t) => isDigit(t.s));
    if (d) return mk(d.s, parseInt(d.s, 10), "digit", "high");
    // 2) gershayim-marked Hebrew numeral (strong signal, even inside a header line)
    const g = toks.find((t) => hasGeresh(t.s) && plausible(gematriaValue(t.s)));
    if (g) return mk(g.s, gematriaValue(g.s)!, "gematria", "high");
    // Bare unmarked Hebrew letters are NOT treated as a folio (a real word can sum
    // to a valid gematria); we require an explicit numeral marker. Absent ⇒ null.
  }
  return NONE; // absent OR unmarked ⇒ null, never guessed
}

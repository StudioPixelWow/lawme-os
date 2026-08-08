/**
 * LAW ME — Founder-Approved ENGINEERING EVALUATION metrics (pure, deterministic).
 *
 * SEPARATE from the strict human-ground-truth benchmark. These are AUTOMATIC /
 * PROXY engineering metrics. They MUST NEVER be reported as human-ground-truth
 * accuracy or as certification of correctness (founder constraint #6).
 *
 * Design principle — neutrality: the only external "reference" used is the PDF's
 * OWN embedded text layer, and only as an ORDER-INDEPENDENT glyph multiset. That
 * measures whether an engine preserves the glyphs actually present in the
 * authoritative PDF, without privileging any engine's reading order (reading
 * order is the contested, human-judgment axis — measured intrinsically instead).
 * For scanned pages with no text layer there is NO objective text reference, and
 * we say so rather than invent one.
 */

export const HEB = /[֐-׿]/;
export const stripSpace = (t: string) => (t ?? "").replace(/\s+/g, "");

/** Multiset of non-space characters. */
export function glyphs(t: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of stripSpace(t)) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}
export const glyphTotal = (m: Map<string, number>) => { let n = 0; for (const v of m.values()) n += v; return n; };

/** Fraction of *letters* that are Hebrew. Low on a Hebrew statute page ⇒ garbled
 *  encoding (F2 glyph problem) or a scanned page with no real text layer. */
export function hebrewShare(t: string): number {
  let letters = 0, heb = 0;
  for (const c of (t ?? "")) { if (/\p{L}/u.test(c)) { letters++; if (HEB.test(c)) heb++; } }
  return letters ? heb / letters : 0;
}

/** Order-independent glyph loss vs the reference multiset (0 = nothing lost). */
export function textLoss(ref: Map<string, number>, out: Map<string, number>): number {
  const total = glyphTotal(ref); if (!total) return 0;
  let miss = 0; for (const [c, n] of ref) miss += Math.max(0, n - (out.get(c) ?? 0));
  return miss / total;
}
/** Glyphs the engine emitted beyond the reference (spurious duplication/insertion). */
export function duplication(ref: Map<string, number>, out: Map<string, number>): number {
  const total = glyphTotal(ref); if (!total) return 0;
  let extra = 0; for (const [c, n] of out) extra += Math.max(0, n - (ref.get(c) ?? 0));
  return extra / total;
}

/** NON-GATING diagnostic (founder rule): fraction of adjacent numeric section
 *  markers that are non-decreasing. Confounded by years/amounts/sub-clauses — a
 *  hint only, never a gate. */
export function sectionMonotonicDiag(sections: string[]): number {
  const nums = (sections ?? []).map((s) => parseInt(String(s).replace(/[^0-9]/g, ""), 10)).filter((n) => Number.isFinite(n));
  if (nums.length < 2) return 1;
  let ok = 0; for (let i = 1; i < nums.length; i++) if (nums[i] >= nums[i - 1]) ok++;
  return ok / (nums.length - 1);
}

/** Intrinsic caption/body separation health for layout-2-style output: a caption
 *  that is really body text (too long) is a false separation. */
export function falseSeparationRate(captions: string[]): number {
  const caps = captions ?? []; if (!caps.length) return 0;
  const bad = caps.filter((c) => (c ?? "").length > 40 || (c ?? "").split(/\s+/).filter(Boolean).length > 8).length;
  return bad / caps.length;
}

/** Very rough folio/page-label presence for citation alignment (Hebrew gematria
 *  or digits near page edges). Presence signal only. */
export function folioDetected(text: string): boolean {
  const t = text ?? "";
  return /(?:עמ['׳]?\s*[א-ת0-9]|\bעמוד\b|\bדף\b|\b\d{2,4}\b\s*$)/.test(t.slice(-120)) || /^\s*\d{2,4}\b/.test(t.slice(0, 40));
}

export interface PageMetrics {
  id: string; engine: string; stratum: string;
  has_text_layer: boolean; reference_reliable: boolean;
  ref_chars: number; engine_chars: number;
  text_loss_rate: number | null; duplication_rate: number | null;
  hebrew_share: number; ref_hebrew_share: number;
  section_monotonic_diag: number; false_separation_rate: number;
  folio_detected: boolean; unresolved: boolean; failure: boolean;
  notes: string[];
}

/** Compute one engine's metrics on one page against the objective reference. */
export function scorePage(args: {
  id: string; engine: string; stratum: string;
  reference: { text: string; has_text_layer: boolean };
  output: { text: string; sections?: string[]; captions?: string[]; unresolved?: boolean };
}): PageMetrics {
  const { id, engine, stratum } = args;
  const refText = args.reference.text ?? "";
  const outText = args.output.text ?? "";
  const has = !!args.reference.has_text_layer && stripSpace(refText).length > 0;
  const refG = glyphs(refText), outG = glyphs(outText);
  const ref_hebrew_share = hebrewShare(refText);
  const hebrew_share = hebrewShare(outText);
  // Reference is only reliable as a glyph oracle if there IS a text layer AND it
  // is not itself garbled (garbled ⇒ F2, and OCR may legitimately disagree).
  const reference_reliable = has && ref_hebrew_share >= 0.6;
  const notes: string[] = [];
  if (has && ref_hebrew_share < 0.6) notes.push(`reference text-layer looks garbled (hebrew_share=${ref_hebrew_share.toFixed(2)}) — likely F2 glyph corruption; glyph-loss vs this reference is not meaningful`);
  if (!has) notes.push("no PDF text layer — OCR-only; no objective text reference (needs human certification)");
  if (hebrew_share < 0.6 && stripSpace(outText).length > 20) notes.push(`engine output low hebrew_share=${hebrew_share.toFixed(2)} (possible glyph/encoding problem)`);

  const text_loss_rate = reference_reliable ? textLoss(refG, outG) : null;
  const duplication_rate = reference_reliable ? duplication(refG, outG) : null;
  const unresolved = !!args.output.unresolved;
  const failure = unresolved || (!has) || (reference_reliable && (text_loss_rate ?? 0) > 0.02) || (hebrew_share < 0.5 && stripSpace(outText).length > 20);

  return {
    id, engine, stratum,
    has_text_layer: has, reference_reliable,
    ref_chars: glyphTotal(refG), engine_chars: glyphTotal(outG),
    text_loss_rate, duplication_rate,
    hebrew_share, ref_hebrew_share,
    section_monotonic_diag: sectionMonotonicDiag(args.output.sections ?? []),
    false_separation_rate: falseSeparationRate(args.output.captions ?? []),
    folio_detected: folioDetected(outText),
    unresolved, failure, notes,
  };
}

export function aggregate(rows: PageMetrics[]) {
  const num = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null && !Number.isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const pct = (x: number | null) => x == null ? null : +(x * 100).toFixed(2);
  const withRef = rows.filter((r) => r.reference_reliable);
  return {
    pages: rows.length,
    pages_with_reliable_reference: withRef.length,
    pages_no_text_layer: rows.filter((r) => !r.has_text_layer).length,
    pages_garbled_reference: rows.filter((r) => r.has_text_layer && !r.reference_reliable).length,
    mean_text_loss_pct: pct(num(withRef.map((r) => r.text_loss_rate))),
    mean_duplication_pct: pct(num(withRef.map((r) => r.duplication_rate))),
    mean_hebrew_share: pct(num(rows.map((r) => r.hebrew_share))),
    mean_section_monotonic_diag_pct: pct(num(rows.map((r) => r.section_monotonic_diag))),
    mean_false_separation_pct: pct(num(rows.map((r) => r.false_separation_rate))),
    folio_detected_rate_pct: pct(num(rows.map((r) => (r.folio_detected ? 1 : 0)))),
    unresolved_rate_pct: pct(num(rows.map((r) => (r.unresolved ? 1 : 0)))),
    failure_rate_pct: pct(num(rows.map((r) => (r.failure ? 1 : 0)))),
  };
}

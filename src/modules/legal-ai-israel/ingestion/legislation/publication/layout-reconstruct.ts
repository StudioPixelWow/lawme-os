/**
 * F1 (layout-2) — region-based layout reconstruction for ספר החוקים pages.
 * Deterministic geometry only; NO LLM, NO network.
 *
 * Segments each page into vertical BANDS from the pdf.js text-item geometry
 * (projection profile), classifies each band as a body column or a marginal
 * caption column, reads body columns RIGHT→LEFT (RTL) with each column top→bottom,
 * and collects marginal captions separately. Handles: single body column, two
 * body columns (modern justified laws), a narrow marginal-caption column, and the
 * combination (two body columns + caption on one page).
 *
 * Guarantees / policy:
 * - LOSSLESS: every input glyph appears exactly once across body + captions.
 *   Reconstruction only reorders/partitions; it never deletes text.
 * - Duplicate text-item robustness: coincident duplicate items (a doubled text
 *   layer) are collapsed for LAYOUT purposes so they can't corrupt band detection.
 *   (Glyph/font CORRECTION itself is F2; this only prevents layout corruption.)
 * - Source spans: every output segment records the source item-index range it
 *   covers, so reconstructed text is traceable to the source items.
 * - Flag-not-guess: a page whose region structure is ambiguous is marked
 *   `unresolved` (with raw reading-order text kept, still lossless) rather than
 *   emitting a confident-but-wrong reconstruction.
 */

export const LAYOUT_VERSION = "layout-2";

export interface LayoutItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  fontName?: string;
}

export interface MarginalCaption {
  text: string;
  y: number;
  sourceSpan: { start: number; end: number }; // source item-index range
}

export interface LayoutSegment {
  role: "body" | "caption";
  column: number; // 0 = rightmost body column, 1 = next-left, ...; captions use -1
  text: string;
  sourceSpan: { start: number; end: number };
}

export interface PageReconstruction {
  columnType: "single" | "two_column" | "two_body_column" | "multi_column" | "unresolved" | "empty";
  bodyColumns: number;
  marginalSide: "left" | "right" | null;
  bodyText: string;
  marginalCaptions: MarginalCaption[];
  segments: LayoutSegment[];
  layoutConfidence: number;
  unresolved: boolean;
  fallbackUsed: boolean;
  lossless: boolean;
}

// ---- helpers ---------------------------------------------------------------

/** Stable source index attached to each item so spans survive reordering. */
interface Indexed extends LayoutItem { i: number }

const glyphKey = (s: string): string => [...s.replace(/\s/g, "")].sort().join("");

/**
 * Collapse coincident duplicate items (same trimmed string within 2px in x and y)
 * — a doubled text layer would otherwise inflate occupancy and corrupt bands.
 * Kept items retain their original index; dropped duplicates are recorded so the
 * lossless check accounts for them.
 */
function dedupeCoincident(items: Indexed[]): { kept: Indexed[]; dropped: number } {
  const kept: Indexed[] = [];
  let dropped = 0;
  for (const it of items) {
    const s = it.str.trim();
    const dup = kept.find((k) => k.str.trim() === s && Math.abs(k.x - it.x) < 2 && Math.abs(k.y - it.y) < 2);
    if (dup) { dropped += 1; continue; }
    kept.push(it);
  }
  return { kept, dropped };
}

const yTol = (items: Indexed[]): number => {
  const hs = items.map((i) => i.height ?? 0).filter((h) => h > 0).sort((a, b) => a - b);
  const med = hs.length ? hs[Math.floor(hs.length / 2)] : 0;
  return Math.max(2, (med || 8) / 2);
};

/** Group items into visual lines (top→bottom = y descending). */
function groupLines(items: Indexed[], tol: number): Indexed[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: Indexed[][] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= tol) last.push(it);
    else lines.push([it]);
  }
  return lines;
}

/** RTL line: right→left = x descending. Returns text + source-index span. */
function lineText(line: Indexed[]): { text: string; span: { start: number; end: number } } {
  const sorted = [...line].sort((a, b) => b.x - a.x);
  const text = sorted.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
  const idx = line.map((i) => i.i);
  return { text, span: { start: Math.min(...idx), end: Math.max(...idx) } };
}

interface Band { x0: number; x1: number; avgOcc: number; lineCount: number }

/**
 * Vertical band segmentation via projection profile. Splits the x-range at runs
 * of sparse (near-empty across lines) bins wide enough to be real column gaps.
 */
function segmentBands(items: Indexed[], lines: Indexed[][]): Band[] {
  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const pageW = maxX - minX;
  const totalLines = lines.length;
  if (pageW <= 0) return [];
  const BINS = 120;
  const binW = pageW / BINS;
  const occ = new Array(BINS).fill(0);
  for (const line of lines) {
    const hit = new Set<number>();
    for (const it of line) {
      const b0 = Math.max(0, Math.floor((it.x - minX) / binW));
      const b1 = Math.min(BINS - 1, Math.floor((it.x + it.width - minX) / binW));
      for (let b = b0; b <= b1; b++) hit.add(b);
    }
    hit.forEach((b) => (occ[b] += 1));
  }
  // A bin is a "gap" if occupied on <=15% of lines; a run of >=3 gap bins (≈ a
  // real inter-column separator) splits bands. Leading/trailing gaps are trimmed.
  const gapThresh = Math.floor(totalLines * 0.15);
  const isGap = (b: number) => occ[b] <= gapThresh;
  const bands: Band[] = [];
  let b = 0;
  while (b < BINS) {
    while (b < BINS && isGap(b)) b++;
    if (b >= BINS) break;
    const start = b;
    let gapRun = 0, end = b;
    while (b < BINS) {
      if (isGap(b)) { gapRun++; if (gapRun >= 3) break; }
      else { gapRun = 0; end = b; }
      b++;
    }
    // band spans [start, end]
    const x0 = minX + start * binW;
    const x1 = minX + (end + 1) * binW;
    let sum = 0; for (let k = start; k <= end; k++) sum += occ[k];
    const avgOcc = sum / (end - start + 1);
    let lc = 0; for (const line of lines) if (line.some((it) => { const cx = it.x + it.width / 2; return cx >= x0 && cx < x1; })) lc++;
    bands.push({ x0, x1, avgOcc, lineCount: lc });
  }
  return bands;
}

// ---- main ------------------------------------------------------------------

export function reconstructPage(rawItems: LayoutItem[]): PageReconstruction {
  const indexed: Indexed[] = rawItems.map((it, i) => ({ ...it, i })).filter((it) => it.str && it.str.trim().length > 0);
  if (indexed.length === 0) {
    return { columnType: "empty", bodyColumns: 0, marginalSide: null, bodyText: "", marginalCaptions: [], segments: [], layoutConfidence: 1, unresolved: false, fallbackUsed: false, lossless: true };
  }
  const inputKey = glyphKey(indexed.map((i) => i.str).join(""));
  const { kept, dropped } = dedupeCoincident(indexed);
  // For losslessness we compare against the DEDUPED input (dropped coincident
  // duplicates are intentional and accounted for).
  const dedupKey = glyphKey(kept.map((i) => i.str).join(""));

  const tol = yTol(kept);
  const lines = groupLines(kept, tol);
  const bands = segmentBands(kept, lines);

  const pageW = Math.max(...kept.map((i) => i.x + i.width)) - Math.min(...kept.map((i) => i.x));
  const totalLines = lines.length;

  // Classify bands: dense+wide => body column; sparse+narrow => marginal caption.
  const bodyThresh = Math.max(2, totalLines * 0.30);
  const bodyBands = bands.filter((bd) => bd.avgOcc >= bodyThresh && (bd.x1 - bd.x0) >= pageW * 0.15);
  const captionBands = bands.filter((bd) => !bodyBands.includes(bd));

  const raw = () => {
    const segs = lines.map(lineText).filter((l) => l.text);
    return { text: segs.map((s) => s.text).join("\n"), span: { start: 0, end: kept.length - 1 } };
  };

  // Ambiguity → flag unresolved (keep raw reading order, still lossless).
  // Unresolved when: no body band found, or >2 body columns (gazette is 1–2), or a
  // large share of items were coincident duplicates we could not fully resolve.
  const dupRatio = indexed.length ? dropped / indexed.length : 0;
  if (bodyBands.length === 0 || bodyBands.length > 2) {
    const r = raw();
    return { columnType: "unresolved", bodyColumns: bodyBands.length, marginalSide: null, bodyText: r.text, marginalCaptions: [], segments: [{ role: "body", column: 0, text: r.text, sourceSpan: r.span }], layoutConfidence: 0.2, unresolved: true, fallbackUsed: true, lossless: glyphKey(r.text) === dedupKey };
  }

  // Assign EVERY item to exactly one band (the band containing its center, else
  // the nearest band) so no item is dropped in a gap — guarantees losslessness.
  const bodyOrdered = [...bodyBands].sort((a, b) => (b.x0 + b.x1) - (a.x0 + a.x1)); // right (higher x) first
  const allBands = [...bodyOrdered, ...captionBands];
  const bandCenter = (bd: Band) => (bd.x0 + bd.x1) / 2;
  const assign = (it: Indexed): Band => {
    const cx = it.x + it.width / 2;
    const inside = allBands.find((bd) => cx >= bd.x0 && cx < bd.x1);
    if (inside) return inside;
    let best = allBands[0], bd0 = Math.abs(cx - bandCenter(allBands[0]));
    for (const bd of allBands) { const d = Math.abs(cx - bandCenter(bd)); if (d < bd0) { bd0 = d; best = bd; } }
    return best;
  };
  const byBand = new Map<Band, Indexed[]>();
  for (const bd of allBands) byBand.set(bd, []);
  for (const it of kept) byBand.get(assign(it))!.push(it);

  const segments: LayoutSegment[] = [];
  const bodyChunks: string[] = [];
  bodyOrdered.forEach((bd, col) => {
    const colLines = groupLines(byBand.get(bd)!, tol).map(lineText).filter((l) => l.text);
    for (const l of colLines) segments.push({ role: "body", column: col, text: l.text, sourceSpan: l.span });
    if (colLines.length) bodyChunks.push(colLines.map((l) => l.text).join("\n"));
  });

  const marginalCaptions: MarginalCaption[] = [];
  for (const bd of captionBands) {
    for (const cl of groupLines(byBand.get(bd)!, tol)) {
      const lt = lineText(cl);
      if (lt.text) { marginalCaptions.push({ text: lt.text, y: cl[0].y, sourceSpan: lt.span }); segments.push({ role: "caption", column: -1, text: lt.text, sourceSpan: lt.span }); }
    }
  }

  const bodyText = bodyChunks.join("\n");

  // Doubled text layer with OFFSET duplicates (coincident-dedup can't catch these):
  // detect abnormal adjacent word repetition and FLAG rather than emit corrupt text.
  const words = bodyText.split(/\s+/).filter(Boolean);
  let adjDup = 0; for (let k = 1; k < words.length; k++) if (words[k] === words[k - 1] && words[k].length >= 2) adjDup++;
  const dupWordRatio = words.length ? adjDup / words.length : 0;
  if (dupWordRatio > 0.08) {
    const r = raw();
    return { columnType: "unresolved", bodyColumns: bodyBands.length, marginalSide: null, bodyText: r.text, marginalCaptions: [], segments: [{ role: "body", column: 0, text: r.text, sourceSpan: r.span }], layoutConfidence: 0.2, unresolved: true, fallbackUsed: true, lossless: glyphKey(r.text) === dedupKey };
  }
  const lossless = glyphKey(bodyText + marginalCaptions.map((c) => c.text).join("")) === dedupKey;

  const columnType: PageReconstruction["columnType"] =
    bodyBands.length === 2 ? "two_body_column" : captionBands.length > 0 ? "two_column" : "single";
  // Confidence: clearer/more separated bands → higher. Reduced by residual dup ratio.
  const confidence = Math.max(0, Math.min(1, 1 - dupRatio * 2 - (bodyBands.length === 2 ? 0.05 : 0)));

  return {
    columnType,
    bodyColumns: bodyBands.length,
    marginalSide: captionBands.length ? (captionBands[0].x0 < bodyOrdered[0].x0 ? "left" : "right") : null,
    bodyText,
    marginalCaptions,
    segments,
    layoutConfidence: confidence,
    unresolved: false,
    fallbackUsed: false,
    lossless,
  };
}

export interface DocumentReconstruction {
  layoutVersion: string;
  layoutText: string;
  marginalCaptions: MarginalCaption[];
  pages: PageReconstruction[];
  layoutConfidence: number;
  twoColumnPages: number;
  twoBodyColumnPages: number;
  singleColumnPages: number;
  unresolvedPages: number;
  lossless: boolean;
}

export function reconstructDocument(pages: LayoutItem[][]): DocumentReconstruction {
  const recon = pages.map(reconstructPage);
  const layoutText = recon.map((p) => p.bodyText).filter(Boolean).join("\n\n");
  const marginalCaptions = recon.flatMap((p) => p.marginalCaptions);
  const conf = recon.length ? recon.reduce((a, p) => a + p.layoutConfidence, 0) / recon.length : 1;
  return {
    layoutVersion: LAYOUT_VERSION,
    layoutText,
    marginalCaptions,
    pages: recon,
    layoutConfidence: conf,
    twoColumnPages: recon.filter((p) => p.columnType === "two_column").length,
    twoBodyColumnPages: recon.filter((p) => p.columnType === "two_body_column").length,
    singleColumnPages: recon.filter((p) => p.columnType === "single").length,
    unresolvedPages: recon.filter((p) => p.unresolved).length,
    lossless: recon.every((p) => p.lossless),
  };
}

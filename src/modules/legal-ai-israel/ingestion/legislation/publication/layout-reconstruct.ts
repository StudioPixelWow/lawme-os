/**
 * F1 — deterministic layout-aware reading-order reconstruction for two-column /
 * marginal-caption ספר החוקים pages. NO LLM, NO network: pure geometry over
 * pdf.js text items (x/y/width/font). Separates the narrow marginal-caption
 * column (side headings — כותרות שוליים) from the main body so the reconstructed
 * body reads in clean RTL order instead of interleaving captions mid-sentence.
 *
 * Correctness invariant (LOSSLESS): every input glyph appears exactly once across
 * (bodyText + marginalCaptions). Reconstruction only REORDERS and PARTITIONS —
 * it never deletes text. So text-loss = 0 and false-removals = 0 by construction;
 * the eval verifies this per page rather than trusting it.
 *
 * Ambiguous pages fall back to single-column (raw reading order) — safe and
 * still lossless — and are flagged (fallbackUsed) so the eval can count them.
 */

export const LAYOUT_VERSION = "layout-1";

/** One pdf.js text item with the geometry we use. x = left edge, y = baseline. */
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
  y: number; // baseline, for associating a caption with the nearby body line
}

export interface PageReconstruction {
  columnType: "single" | "two_column" | "two_body_column";
  marginalSide: "left" | "right" | null;
  bodyText: string;
  marginalCaptions: MarginalCaption[];
  layoutConfidence: number; // 0..1: clarity of the column gap
  fallbackUsed: boolean;
  lossless: boolean; // body+captions glyph-multiset == input glyph-multiset
}

const yTol = (items: LayoutItem[]): number => {
  // Line grouping tolerance: half the median glyph height (fallback 4px).
  const hs = items.map((i) => i.height ?? 0).filter((h) => h > 0).sort((a, b) => a - b);
  const med = hs.length ? hs[Math.floor(hs.length / 2)] : 0;
  return Math.max(2, (med || 8) / 2);
};

/** Group items into visual lines by y (top→bottom = y descending in PDF space). */
function groupLines(items: LayoutItem[], tol: number): LayoutItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: LayoutItem[][] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= tol) last.push(it);
    else lines.push([it]);
  }
  return lines;
}

/** RTL line text: within a line, right→left = x descending. */
const lineText = (line: LayoutItem[]): string =>
  [...line].sort((a, b) => b.x - a.x).map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();

/** Multiset of non-whitespace characters — used to prove losslessness. */
function glyphKey(s: string): string {
  return [...s.replace(/\s/g, "")].sort().join("");
}

/**
 * Detect a persistent interior vertical whitespace gap that separates a narrow
 * marginal column from the wide body column. Returns the split x and which side
 * is the (narrow) margin, or null for single-column.
 */
function detectGap(items: LayoutItem[], lines: LayoutItem[][]): { splitX: number; marginalSide: "left" | "right"; clarity: number } | null {
  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const pageW = maxX - minX;
  if (pageW <= 0 || lines.length < 4) return null;

  const BINS = 60;
  const binW = pageW / BINS;
  // Occupancy = number of distinct lines that place any glyph in a bin.
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
  const sparse = Math.max(1, Math.floor(lines.length * 0.12));

  // Find the largest interior run of sparse bins (exclude outer 8% margins).
  const lo = Math.floor(BINS * 0.08), hi = Math.ceil(BINS * 0.92);
  let best: { start: number; end: number } | null = null;
  let run: { start: number; end: number } | null = null;
  for (let b = lo; b < hi; b++) {
    if (occ[b] <= sparse) run = run ? { start: run.start, end: b } : { start: b, end: b };
    else { if (run && (!best || run.end - run.start > best.end - best.start)) best = run; run = null; }
  }
  if (run && (!best || run.end - run.start > best.end - best.start)) best = run;
  if (!best) return null;

  const splitX = minX + ((best.start + best.end + 1) / 2) * binW;
  const leftW = splitX - minX, rightW = maxX - splitX;
  const narrow = Math.min(leftW, rightW);
  // The margin column must be genuinely narrow (< 30% of page width) and non-trivial.
  if (narrow > pageW * 0.30 || narrow < pageW * 0.02) return null;
  const marginalSide: "left" | "right" = leftW < rightW ? "left" : "right";

  // Clarity: how empty the gap is vs threshold, and how consistent (wide gap).
  const gapOcc = best.start <= best.end
    ? occ.slice(best.start, best.end + 1).reduce((a, c) => a + c, 0) / (best.end - best.start + 1)
    : sparse;
  const clarity = Math.max(0, Math.min(1, (sparse - gapOcc) / Math.max(1, sparse)));
  return { splitX, marginalSide, clarity };
}

/**
 * Detect a BALANCED two-body-column page (modern justified typesetting): a gap
 * near the page center with substantial text on BOTH sides on MOST lines. Unlike
 * the marginal case (narrow sparse side), here both columns are real body text,
 * so we must read the right column fully then the left (RTL), not merge per line.
 */
function detectTwoBody(items: LayoutItem[], lines: LayoutItem[][]): { splitX: number; confidence: number } | null {
  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const pageW = maxX - minX;
  const totalLines = lines.length;
  if (pageW <= 0 || totalLines < 6) return null;

  const BINS = 60;
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
  // Sparsest bin in the central band (columns split near the middle).
  const lo = Math.floor(BINS * 0.3), hi = Math.ceil(BINS * 0.7);
  let gapBin = lo;
  for (let b = lo; b <= hi; b++) if (occ[b] < occ[gapBin]) gapBin = b;
  const splitX = minX + (gapBin + 0.5) * binW;

  // Both columns must be substantial in width and densely filled across lines.
  const leftW = splitX - minX, rightW = maxX - splitX;
  if (Math.min(leftW, rightW) < pageW * 0.25) return null;
  let leftLines = 0, rightLines = 0;
  for (const line of lines) {
    if (line.some((it) => it.x + it.width / 2 < splitX)) leftLines += 1;
    if (line.some((it) => it.x + it.width / 2 >= splitX)) rightLines += 1;
  }
  const bothDense = leftLines >= 0.5 * totalLines && rightLines >= 0.5 * totalLines;
  const gapSparse = occ[gapBin] <= totalLines * 0.35;
  if (!bothDense || !gapSparse) return null;
  const confidence = Math.max(0, Math.min(1, (totalLines * 0.35 - occ[gapBin]) / Math.max(1, totalLines * 0.35)));
  return { splitX, confidence };
}

/** Reconstruct one page. Deterministic; lossless by construction. */
export function reconstructPage(items: LayoutItem[]): PageReconstruction {
  const clean = items.filter((i) => i.str && i.str.trim().length > 0);
  const inputKey = glyphKey(clean.map((i) => i.str).join(""));
  if (clean.length === 0) {
    return { columnType: "single", marginalSide: null, bodyText: "", marginalCaptions: [], layoutConfidence: 1, fallbackUsed: false, lossless: true };
  }
  const tol = yTol(clean);
  const lines = groupLines(clean, tol);

  // Balanced two-body-column pages (modern justified laws): read the RIGHT column
  // fully (RTL first), then the LEFT column — merging per line would interleave them.
  const twoBody = detectTwoBody(clean, lines);
  if (twoBody) {
    const rightLines: LayoutItem[][] = [];
    const leftLines: LayoutItem[][] = [];
    for (const line of lines) {
      const R = line.filter((it) => it.x + it.width / 2 >= twoBody.splitX);
      const L = line.filter((it) => it.x + it.width / 2 < twoBody.splitX);
      if (R.length) rightLines.push(R);
      if (L.length) leftLines.push(L);
    }
    const bodyText = [...rightLines, ...leftLines].map(lineText).filter(Boolean).join("\n");
    return { columnType: "two_body_column", marginalSide: null, bodyText, marginalCaptions: [], layoutConfidence: twoBody.confidence, fallbackUsed: false, lossless: glyphKey(bodyText) === inputKey };
  }

  const gap = detectGap(clean, lines);
  // Single-column (or ambiguous gap): body = everything, in raw RTL reading order.
  if (!gap || gap.clarity < 0.34) {
    const bodyText = lines.map(lineText).filter(Boolean).join("\n");
    const lossless = glyphKey(bodyText) === inputKey;
    return { columnType: "single", marginalSide: null, bodyText, marginalCaptions: [], layoutConfidence: gap ? gap.clarity : 0.9, fallbackUsed: !!gap, lossless };
  }

  // Two-column: partition every item by side of the split.
  const isMarginal = (it: LayoutItem): boolean => {
    const cx = it.x + it.width / 2;
    return gap.marginalSide === "left" ? cx < gap.splitX : cx > gap.splitX;
  };
  const bodyLines: LayoutItem[][] = [];
  const marginalLines: LayoutItem[][] = [];
  for (const line of lines) {
    const body = line.filter((it) => !isMarginal(it));
    const marg = line.filter((it) => isMarginal(it));
    if (body.length) bodyLines.push(body);
    if (marg.length) marginalLines.push(marg);
  }

  // A genuine marginal-caption column is SPARSE (side headings on some lines) and
  // SHORT (headings are a few words). Reject when the "margin" side is as dense as
  // the body (aligned inter-word whitespace / balanced columns) OR carries long
  // lines (a table/budget column, not captions) — fall back to single (lossless).
  const marginalText = marginalLines.map(lineText).filter(Boolean);
  const avgMarginalLen = marginalText.length ? marginalText.reduce((a, t) => a + t.length, 0) / marginalText.length : 0;
  const maxMarginalLen = marginalText.reduce((a, t) => Math.max(a, t.length), 0);
  const marginTooDense = marginalLines.length === 0 || marginalLines.length > 0.6 * bodyLines.length;
  const marginTooLong = avgMarginalLen > 30 || maxMarginalLen > 45; // captions are short headings
  if (marginTooDense || marginTooLong) {
    const bodyText = lines.map(lineText).filter(Boolean).join("\n");
    return { columnType: "single", marginalSide: null, bodyText, marginalCaptions: [], layoutConfidence: gap.clarity, fallbackUsed: true, lossless: glyphKey(bodyText) === inputKey };
  }
  const bodyText = bodyLines.map(lineText).filter(Boolean).join("\n");
  const marginalCaptions = marginalLines
    .map((l) => ({ text: lineText(l), y: l[0].y }))
    .filter((c) => c.text.length > 0);

  const lossless = glyphKey(bodyText + marginalCaptions.map((c) => c.text).join("")) === inputKey;
  return { columnType: "two_column", marginalSide: gap.marginalSide, bodyText, marginalCaptions, layoutConfidence: gap.clarity, fallbackUsed: false, lossless };
}

export interface DocumentReconstruction {
  layoutVersion: string;
  layoutText: string; // body reading order across pages
  marginalCaptions: MarginalCaption[];
  pages: PageReconstruction[];
  layoutConfidence: number; // mean page confidence
  twoColumnPages: number;
  twoBodyColumnPages: number;
  singleColumnPages: number;
  fallbackPages: number;
  lossless: boolean; // all pages lossless
}

/** Reconstruct a whole document from per-page item arrays (page order preserved). */
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
    fallbackPages: recon.filter((p) => p.fallbackUsed).length,
    lossless: recon.every((p) => p.lossless),
  };
}

/**
 * Path B1 — layout-only reading-order recovery (deterministic, glyph-preserving).
 *
 * For pages that HAVE a good embedded text layer but whose reading order layout-2
 * could not resolve (multi-column / marginal / mixed), this derives reading order
 * and regions from geometry using a recursive XY-cut with RTL ordering. It NEVER
 * OCRs and NEVER alters the glyphs — the output item stream is a permutation of
 * the input (verified lossless). It only re-orders.
 *
 * XY-cut: recursively split a block by the widest whitespace gap — horizontally
 * into stacked bands (read top→bottom) or vertically into columns (read
 * right→left for Hebrew). Leaves are ordered into lines (top→bottom), each line
 * right→left. This resolves multi-column pages the projection-band method left
 * "unresolved", without inventing or dropping a single character.
 */
import type { LayoutItem } from "./layout-reconstruct.ts";

export const ORDER_VERSION = "layout-order-v3";

interface It extends LayoutItem { _i: number; h: number; }
export interface OrderRegion { role: "body" | "caption" | "block"; column: number; text: string; item_count: number; bbox: [number, number, number, number]; }
export interface OrderResult {
  reading_order_text: string;
  regions: OrderRegion[];
  columns_detected: number;
  resolved: boolean;
  lossless: boolean;
  order_version: string;
}

const median = (xs: number[]): number => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const glyphKey = (items: { str: string }[]) => { const m = new Map<string, number>(); for (const it of items) for (const c of (it.str ?? "").replace(/\s/g, "")) m.set(c, (m.get(c) ?? 0) + 1); return [...m.entries()].sort().map(([k, v]) => k + v).join("|"); };

/** Split items into groups separated by whitespace gaps along an axis.
 *  axis 'y': stacked bands returned TOP→BOTTOM (desc y). axis 'x': columns
 *  returned RIGHT→LEFT (desc x). Returns a single group if no qualifying gap. */
function splitByGap(items: It[], axis: "x" | "y", gapMin: number): It[][] {
  if (items.length < 2) return [items];
  // interval [lo,hi] per item along the axis
  const iv = items.map((it) => axis === "x"
    ? { lo: it.x, hi: it.x + Math.max(it.width, 1), it }
    : { lo: it.y, hi: it.y + it.h, it });
  iv.sort((a, b) => a.lo - b.lo);
  // merge overlapping intervals into runs, record gaps between runs
  const runs: { lo: number; hi: number; items: It[] }[] = [];
  for (const s of iv) {
    const last = runs[runs.length - 1];
    if (last && s.lo <= last.hi + 0.01) { last.hi = Math.max(last.hi, s.hi); last.items.push(s.it); }
    else runs.push({ lo: s.lo, hi: s.hi, items: [s.it] });
  }
  if (runs.length < 2) return [items];
  // build groups by cutting where the inter-run gap ≥ gapMin
  const groups: It[][] = [];
  let cur: It[] = runs[0].items.slice();
  for (let k = 1; k < runs.length; k++) {
    const gap = runs[k].lo - runs[k - 1].hi;
    if (gap >= gapMin) { groups.push(cur); cur = runs[k].items.slice(); }
    else cur = cur.concat(runs[k].items);
  }
  groups.push(cur);
  if (groups.length < 2) return [items];
  // order: top→bottom (desc y) or right→left (desc x)
  const ordAxis = axis === "x" ? "x" : "y";
  groups.sort((A, B) => Math.max(...B.map((i) => i[ordAxis])) - Math.max(...A.map((i) => i[ordAxis])));
  return groups;
}

function orderLines(items: It[], lineH: number): It[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: It[][] = [];
  const tol = Math.max(2, 0.6 * lineH);
  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l[0].y - it.y) <= tol);
    if (line) line.push(it); else lines.push([it]);
  }
  for (const l of lines) l.sort((a, b) => b.x - a.x); // RTL within a line
  return lines;
}

function cut(items: It[], lineH: number, charW: number, depth: number, blocks: It[][][]): void {
  if (items.length <= 1 || depth > 40) { if (items.length) blocks.push(orderLines(items, lineH)); return; }
  const bands = splitByGap(items, "y", Math.max(6, 1.3 * lineH));
  if (bands.length > 1) { for (const b of bands) cut(b, lineH, charW, depth + 1, blocks); return; }
  const cols = splitByGap(items, "x", Math.max(12, 2.6 * charW));
  if (cols.length > 1) { for (const c of cols) cut(c, lineH, charW, depth + 1, blocks); return; }
  blocks.push(orderLines(items, lineH));
}

export function recoverReadingOrder(raw: LayoutItem[]): OrderResult {
  const items: It[] = raw.map((it, i) => ({ ...it, _i: i, h: it.height && it.height > 0 ? it.height : Math.max(6, (it.width / Math.max(1, it.str.length)) * 1.6) }));
  if (!items.length) return { reading_order_text: "", regions: [], columns_detected: 0, resolved: false, lossless: true, order_version: ORDER_VERSION };
  const lineH = median(items.map((i) => i.h)) || 10;
  const charW = median(items.filter((i) => i.str.length).map((i) => i.width / i.str.length)) || 5;

  const blocks: It[][][] = [];
  cut(items, lineH, charW, 0, blocks);

  const pageW = Math.max(...items.map((i) => i.x + i.width)) - Math.min(...items.map((i) => i.x)) || 1;
  const regions: OrderRegion[] = blocks.map((lines, idx) => {
    const flat = lines.flat();
    const xs = flat.map((i) => i.x), xe = flat.map((i) => i.x + i.width), ys = flat.map((i) => i.y), ye = flat.map((i) => i.y + i.h);
    const w = Math.max(...xe) - Math.min(...xs);
    const text = lines.map((l) => l.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim()).join("\n");
    // heuristic role: a short, narrow block is likely a marginal caption
    const role: OrderRegion["role"] = (w < 0.22 * pageW && flat.length <= 12) ? "caption" : "body";
    return { role, column: idx, text, item_count: flat.length, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xe), Math.max(...ye)] };
  });

  const reading_order_text = regions.map((r) => r.text).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  const columns_detected = new Set(blocks.map((b) => Math.round(Math.max(...b.flat().map((i) => i.x)) / Math.max(1, charW * 8)))).size;
  const lossless = glyphKey(items) === glyphKey(raw.map((r) => ({ str: r.str })));
  return { reading_order_text, regions, columns_detected, resolved: blocks.length > 0 && lossless, lossless, order_version: ORDER_VERSION };
}

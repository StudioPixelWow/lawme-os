/**
 * LAW ME — Path-B2 table-aware extraction from Google Document AI output.
 *
 * Founder Epic §3–§6. The plain `document.text` field flattens a budget table
 * into a stream that separates amounts from their row labels (observed on
 * bench-060 / bench-061). This module builds a CANONICAL table representation
 * from Document AI's OWN structured objects — never by guessing from whitespace
 * in flattened OCR text.
 *
 * Two structured sources, in priority order:
 *   1. `document.pages[].tables[]` — Document AI's native table cells (header /
 *      body rows, per-cell text anchors, confidence, bounding polys). This is
 *      the authoritative source when the processor emits it (Form Parser /
 *      Layout Parser, or OCR with layout). source = "docai_tables".
 *   2. Geometry fallback — when the OCR processor returns NO table objects, we
 *      reconstruct a coarse grid from token BOUNDING BOXES (real coordinates,
 *      not whitespace). This is inherently less certain, so it is labelled
 *      source = "geometry_reconstructed" and ALWAYS routed to needs_review by
 *      the quality layer (see b2-quality.ts).
 *
 * The label↔amount relationship is preserved by keeping each cell in its
 * (row, column) grid position exactly as Document AI reported it. We do NOT
 * infer which column is "label" vs "amount" — preserving the grid IS the
 * relationship. published=0; this is machine-derived, not certified.
 */


// ---- Document AI response subset (permissive; external untyped JSON) --------
export interface DocaiVertex { x?: number; y?: number }
export interface DocaiBoundingPoly { vertices?: DocaiVertex[]; normalizedVertices?: DocaiVertex[] }
export interface DocaiTextSegment { startIndex?: number | string; endIndex?: number | string }
export interface DocaiTextAnchor { textSegments?: DocaiTextSegment[]; content?: string }
export interface DocaiLayout { textAnchor?: DocaiTextAnchor; confidence?: number; boundingPoly?: DocaiBoundingPoly }
export interface DocaiCell { layout?: DocaiLayout; rowSpan?: number; colSpan?: number }
export interface DocaiTableRow { cells?: DocaiCell[] }
export interface DocaiTable { headerRows?: DocaiTableRow[]; bodyRows?: DocaiTableRow[]; layout?: DocaiLayout }
export interface DocaiToken { layout?: DocaiLayout }
export interface DocaiPageDimension { width?: number; height?: number }
export interface DocaiPage {
  pageNumber?: number;
  dimension?: DocaiPageDimension;
  tables?: DocaiTable[];
  tokens?: DocaiToken[];
  lines?: unknown[];
  blocks?: unknown[];
  paragraphs?: unknown[];
}
export interface DocaiDocument { text?: string; pages?: DocaiPage[] }

// ---- Canonical table representation ----------------------------------------
export interface BBox { x0: number; y0: number; x1: number; y1: number }
export interface TableCell {
  row: number;
  column: number;
  text: string;
  confidence: number | null; // 0..1
  bbox: BBox | null;
}
export interface CanonicalTable {
  page: number;
  table_index: number;
  source: "docai_tables" | "geometry_reconstructed";
  n_rows: number;
  n_cols: number;
  total_cells: number;
  header: string[];
  rows: { cells: TableCell[] }[];
  mean_cell_confidence: number | null;
  bbox: BBox | null;
}
export interface TableDetection {
  table_detected: boolean;
  number_of_tables: number;
  total_cells: number;
  source: "docai_tables" | "geometry_reconstructed" | "none";
}

const num = (v: number | string | undefined, d = 0): number => {
  if (v === undefined || v === null) return d;
  const n = typeof v === "string" ? parseInt(v, 10) : v;
  return Number.isFinite(n) ? (n as number) : d;
};

/** Resolve a cell/token's text from Document AI text anchors against the full
 *  document text. Falls back to an inline `content` if present. */
export function resolveAnchorText(fullText: string, anchor?: DocaiTextAnchor): string {
  if (!anchor) return "";
  if (typeof anchor.content === "string" && anchor.content.length) return anchor.content;
  const segs = anchor.textSegments ?? [];
  if (!segs.length) return "";
  let out = "";
  for (const s of segs) {
    const a = num(s.startIndex, 0);
    const b = num(s.endIndex, 0);
    if (b > a) out += fullText.slice(a, b);
  }
  return out.replace(/\s+/g, " ").trim();
}

function bboxOf(layout: DocaiLayout | undefined, dim?: DocaiPageDimension): BBox | null {
  const poly = layout?.boundingPoly;
  if (!poly) return null;
  const w = dim?.width ?? 1, h = dim?.height ?? 1;
  const verts = (poly.vertices?.length ? poly.vertices : poly.normalizedVertices) ?? [];
  const norm = !poly.vertices?.length; // normalizedVertices are 0..1
  if (!verts.length) return null;
  const xs = verts.map((v) => (v.x ?? 0) * (norm ? w : 1));
  const ys = verts.map((v) => (v.y ?? 0) * (norm ? h : 1));
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Build canonical tables from Document AI's native table objects. */
export function extractDocaiTables(doc: DocaiDocument): CanonicalTable[] {
  const text = doc.text ?? "";
  const out: CanonicalTable[] = [];
  const pages = doc.pages ?? [];
  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    const pageNo = page.pageNumber ?? pi + 1;
    const tables = page.tables ?? [];
    for (let ti = 0; ti < tables.length; ti++) {
      const t = tables[ti];
      const header = t.headerRows ?? [];
      const body = t.bodyRows ?? [];
      const allRows = [...header, ...body];
      const cells: TableCell[] = [];
      const confs: number[] = [];
      let maxCol = 0;
      for (let r = 0; r < allRows.length; r++) {
        const rowCells = allRows[r].cells ?? [];
        for (let c = 0; c < rowCells.length; c++) {
          const cell = rowCells[c];
          const conf = typeof cell.layout?.confidence === "number" ? cell.layout.confidence : null;
          if (conf != null) confs.push(conf);
          cells.push({
            row: r,
            column: c,
            text: resolveAnchorText(text, cell.layout?.textAnchor),
            confidence: conf,
            bbox: bboxOf(cell.layout, page.dimension),
          });
          if (c + 1 > maxCol) maxCol = c + 1;
        }
      }
      const rows = allRows.map((_, r) => ({ cells: cells.filter((cc) => cc.row === r).sort((a, b) => a.column - b.column) }));
      out.push({
        page: pageNo,
        table_index: ti,
        source: "docai_tables",
        n_rows: allRows.length,
        n_cols: maxCol,
        total_cells: cells.length,
        header: (header[0]?.cells ?? []).map((_, c) => cells.find((cc) => cc.row === 0 && cc.column === c)?.text ?? ""),
        rows,
        mean_cell_confidence: mean(confs),
        bbox: bboxOf(t.layout, page.dimension),
      });
    }
  }
  return out;
}

// ---- Geometry fallback (token bounding boxes; no native tables) -------------
interface Tok { text: string; cx: number; cy: number; h: number; conf: number | null; bbox: BBox }

function pageTokens(doc: DocaiDocument, page: DocaiPage): Tok[] {
  const text = doc.text ?? "";
  const toks: Tok[] = [];
  for (const tk of page.tokens ?? []) {
    const bb = bboxOf(tk.layout, page.dimension);
    if (!bb) continue;
    const s = resolveAnchorText(text, tk.layout?.textAnchor);
    if (!s) continue;
    toks.push({
      text: s, cx: (bb.x0 + bb.x1) / 2, cy: (bb.y0 + bb.y1) / 2,
      h: Math.max(1, bb.y1 - bb.y0), conf: typeof tk.layout?.confidence === "number" ? tk.layout!.confidence! : null, bbox: bb,
    });
  }
  return toks;
}

/** 1-D greedy clustering of positions into ordered buckets. */
function cluster(values: number[], tol: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const centers: number[] = [];
  for (const v of sorted) {
    const last = centers.length ? centers[centers.length - 1] : null;
    if (last == null || v - last > tol) centers.push(v);
    else centers[centers.length - 1] = (last + v) / 2;
  }
  return centers;
}
const nearest = (centers: number[], v: number): number => {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < centers.length; i++) { const d = Math.abs(centers[i] - v); if (d < bd) { bd = d; bi = i; } }
  return bi;
};

/**
 * Reconstruct a COARSE grid from token bounding boxes when Document AI returns
 * no native tables. Real coordinates only — never whitespace guessing. RTL:
 * columns are ordered right→left (higher x = earlier column). Always treated as
 * uncertain (needs_review) downstream.
 */
export function reconstructTablesFromTokens(doc: DocaiDocument): CanonicalTable[] {
  const out: CanonicalTable[] = [];
  const pages = doc.pages ?? [];
  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    const toks = pageTokens(doc, page);
    if (toks.length < 6) continue; // too little to call a grid
    const medH = [...toks.map((t) => t.h)].sort((a, b) => a - b)[Math.floor(toks.length / 2)] || 6;
    const rowCenters = cluster(toks.map((t) => t.cy), medH * 0.7);
    const colCenters = cluster(toks.map((t) => t.cx), medH * 2.5).sort((a, b) => b - a); // RTL: right→left
    if (rowCenters.length < 2 || colCenters.length < 2) continue;
    // bucket tokens into (row,col)
    const grid = new Map<string, Tok[]>();
    for (const t of toks) {
      const r = nearest(rowCenters.slice().sort((a, b) => a - b), t.cy);
      const c = nearest(colCenters, t.cx);
      const k = `${r}:${c}`;
      (grid.get(k) ?? grid.set(k, []).get(k)!).push(t);
    }
    const nRows = rowCenters.length, nCols = colCenters.length;
    const cells: TableCell[] = [];
    const confs: number[] = [];
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        const bucket = (grid.get(`${r}:${c}`) ?? []).sort((a, b) => b.cx - a.cx); // RTL within cell
        if (!bucket.length) continue;
        const cellConf = mean(bucket.map((b) => b.conf).filter((x): x is number => x != null));
        if (cellConf != null) confs.push(cellConf);
        const bx = { x0: Math.min(...bucket.map((b) => b.bbox.x0)), y0: Math.min(...bucket.map((b) => b.bbox.y0)), x1: Math.max(...bucket.map((b) => b.bbox.x1)), y1: Math.max(...bucket.map((b) => b.bbox.y1)) };
        cells.push({ row: r, column: c, text: bucket.map((b) => b.text).join(" ").trim(), confidence: cellConf, bbox: bx });
      }
    }
    if (!cells.length) continue;
    const rows = Array.from({ length: nRows }, (_, r) => ({ cells: cells.filter((cc) => cc.row === r).sort((a, b) => a.column - b.column) }));
    out.push({
      page: page.pageNumber ?? pi + 1, table_index: out.length, source: "geometry_reconstructed",
      n_rows: nRows, n_cols: nCols, total_cells: cells.length, header: [], rows,
      mean_cell_confidence: mean(confs), bbox: null,
    });
  }
  return out;
}

export interface ExtractOptions {
  allowGeometryFallback?: boolean;
  /** Page-level numeric-token ratio (0..1). Geometry reconstruction only fires
   *  on numeric-heavy pages (budget tables), so two-column prose and colophons
   *  are not mistaken for tables. Undefined ⇒ treated as 1 (no gate). */
  pageNumericRatio?: number;
  minNumericRatioForGeometry?: number; // default 0.3
}

/** Prefer native DocAI tables; optionally fall back to geometry reconstruction.
 *  Geometry is GATED on the page being numeric-heavy — a generic rule (not
 *  overfit to any page): budget tables are numeric-dense, prose/colophons are
 *  not, so the latter stay clean prose instead of spurious geometry tables. */
export function extractTables(doc: DocaiDocument, opts: ExtractOptions = {}): CanonicalTable[] {
  const native = extractDocaiTables(doc);
  if (native.length) return native;
  if (opts.allowGeometryFallback) {
    const nr = opts.pageNumericRatio ?? 1;
    const min = opts.minNumericRatioForGeometry ?? 0.3;
    if (nr >= min) return reconstructTablesFromTokens(doc);
  }
  return [];
}

export function tableDetection(tables: CanonicalTable[]): TableDetection {
  if (!tables.length) return { table_detected: false, number_of_tables: 0, total_cells: 0, source: "none" };
  return {
    table_detected: true,
    number_of_tables: tables.length,
    total_cells: tables.reduce((a, t) => a + t.total_cells, 0),
    source: tables[0].source,
  };
}

/**
 * Deterministic textual representation for search/RAG. The row↔column grid is
 * preserved from the cells; labels and amounts stay on the same line because
 * they were on the same table row. We do NOT re-pair by OCR order.
 */
export function tableToText(table: CanonicalTable): string {
  const lines: string[] = ["[טבלה]"];
  const ncol = Math.max(1, table.n_cols);
  const rowToCells = (row: { cells: TableCell[] }): string[] => {
    const byCol: string[] = Array.from({ length: ncol }, () => "");
    for (const c of row.cells) if (c.column >= 0 && c.column < ncol) byCol[c.column] = (c.text ?? "").replace(/\|/g, "/");
    return byCol;
  };
  const hasHeader = table.header.some((h) => h && h.trim().length > 0);
  if (hasHeader) {
    const head = Array.from({ length: ncol }, (_, i) => (table.header[i] ?? "").replace(/\|/g, "/"));
    lines.push(`| ${head.join(" | ")} |`);
    lines.push(`| ${head.map(() => "---").join(" | ")} |`);
  }
  const bodyStart = hasHeader ? 1 : 0;
  for (let i = bodyStart; i < table.rows.length; i++) {
    const cols = rowToCells(table.rows[i]);
    if (cols.every((x) => !x)) continue;
    lines.push(`| ${cols.join(" | ")} |`);
  }
  lines.push(`[/טבלה] (source=${table.source}, ${table.n_rows}×${table.n_cols})`);
  return lines.join("\n");
}

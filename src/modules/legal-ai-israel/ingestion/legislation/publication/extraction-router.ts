/**
 * Production hybrid extraction ROUTER (deterministic, per page).
 *
 * Decides which extraction path a page takes and records why, so every stored
 * output is auditable and reprocessing is deterministic:
 *
 *   Path A  — deterministic: good text layer + Hebrew-share ≥ threshold + no
 *             unresolved duplicate-layer anomaly + layout-2 resolved order
 *             → layout-2, glyphs preserved from the PDF.
 *   Path B1 — layout-only recovery: good text layer + good glyphs but layout-2
 *             reading order unresolved → re-derive order with layout-order-v3 on
 *             the SAME glyph stream (never OCR).
 *   Path B2 — OCR: no usable text layer (scanned) OR garbled/low-Hebrew layer
 *             (F2) → render the official PDF page and OCR (cloud provider chosen
 *             by the operator B2 comparison; Tesseract is offline fallback only).
 *
 * The router NEVER overwrites raw text and NEVER changes `published` (stays 0).
 * Unresolved / low-confidence pages are marked `needs_review`.
 */
export const ROUTER_VERSION = "hybrid-router-1";

export interface RouteSignals {
  has_text_layer: boolean;
  hebrew_share: number;              // 0..1 on the embedded layer
  layout2_unresolved: boolean;       // layout-2 could not resolve reading order
  duplicate_layer_anomaly?: boolean; // overprinted text-layer dedup could not resolve
  b1_resolved?: boolean;             // did layout-order-v3 resolve the order (if run)
  ocr_confidence?: number;           // 0..1 if an OCR engine produced output
}

export interface RouteConfig {
  hebrew_min: number;                // below ⇒ treat layer as garbled (F2) → OCR
  b2_provider: string;               // selected cloud provider id (or "pending")
}
export const DEFAULT_ROUTE_CONFIG: RouteConfig = { hebrew_min: 0.6, b2_provider: "pending" };

export interface RouteDecision {
  route: "A" | "B1" | "B2";
  engine: string;
  engine_version: string;
  route_reason: string;
  confidence: number;                // 0..1 automatic/proxy confidence (NOT certified accuracy)
  machine_derived: true;
  needs_review: boolean;
  published: 0;
  router_version: string;
}

const LAYOUT2_VERSION = "layout-2";
const B1_VERSION = "layout-order-v3";

export function routePage(sig: RouteSignals, cfg: RouteConfig = DEFAULT_ROUTE_CONFIG): RouteDecision {
  const base = { machine_derived: true as const, published: 0 as const, router_version: ROUTER_VERSION };

  // Path B2 — OCR required (no usable text layer, or garbled/F2 layer).
  if (!sig.has_text_layer) {
    return { ...base, route: "B2", engine: cfg.b2_provider === "pending" ? "cloud-ocr:pending" : cfg.b2_provider, engine_version: cfg.b2_provider, route_reason: "no_text_layer_scanned", confidence: sig.ocr_confidence ?? 0, needs_review: true };
  }
  if (sig.hebrew_share < cfg.hebrew_min) {
    return { ...base, route: "B2", engine: cfg.b2_provider === "pending" ? "cloud-ocr:pending" : cfg.b2_provider, engine_version: cfg.b2_provider, route_reason: `garbled_text_layer_low_hebrew_share(${sig.hebrew_share.toFixed(2)}<${cfg.hebrew_min})_F2`, confidence: sig.ocr_confidence ?? 0, needs_review: true };
  }

  // Path B1 — good glyphs, unresolved order → layout-only recovery (no OCR).
  if (sig.layout2_unresolved || sig.duplicate_layer_anomaly) {
    const resolved = sig.b1_resolved !== false; // undefined ⇒ assume attempted/resolved
    return {
      ...base, route: "B1", engine: B1_VERSION, engine_version: B1_VERSION,
      route_reason: sig.duplicate_layer_anomaly ? "duplicate_layer_anomaly_order_recovery" : "layout_unresolved_reading_order_F1",
      confidence: resolved ? 0.7 : 0.4, needs_review: !resolved,
    };
  }

  // Path A — deterministic.
  return { ...base, route: "A", engine: LAYOUT2_VERSION, engine_version: LAYOUT2_VERSION, route_reason: "deterministic_text_layer_resolved", confidence: 0.95, needs_review: false };
}

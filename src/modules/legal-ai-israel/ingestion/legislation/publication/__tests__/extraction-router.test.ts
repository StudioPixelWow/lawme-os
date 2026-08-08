import { test } from "node:test";
import assert from "node:assert/strict";
import { routePage, DEFAULT_ROUTE_CONFIG } from "../extraction-router.ts";
import { recoverReadingOrder } from "../layout-order-v3.ts";
import type { LayoutItem } from "../layout-reconstruct.ts";

// ── Router ───────────────────────────────────────────────────────────────────
test("router: clean text-layer + resolved ⇒ Path A (layout-2), no review", () => {
  const d = routePage({ has_text_layer: true, hebrew_share: 0.98, layout2_unresolved: false });
  assert.equal(d.route, "A"); assert.equal(d.engine, "layout-2"); assert.equal(d.needs_review, false);
  assert.equal(d.machine_derived, true); assert.equal(d.published, 0);
});
test("router: good glyphs but unresolved order ⇒ Path B1 (layout-only, no OCR)", () => {
  const d = routePage({ has_text_layer: true, hebrew_share: 0.95, layout2_unresolved: true, b1_resolved: true });
  assert.equal(d.route, "B1"); assert.equal(d.engine, "layout-order-v3");
  assert.match(d.route_reason, /reading_order/); assert.equal(d.needs_review, false);
});
test("router: unresolved order that B1 still can't fix ⇒ needs_review", () => {
  const d = routePage({ has_text_layer: true, hebrew_share: 0.95, layout2_unresolved: true, b1_resolved: false });
  assert.equal(d.route, "B1"); assert.equal(d.needs_review, true);
});
test("router: no text layer ⇒ Path B2 OCR, needs_review", () => {
  const d = routePage({ has_text_layer: false, hebrew_share: 0, layout2_unresolved: false });
  assert.equal(d.route, "B2"); assert.match(d.route_reason, /no_text_layer/); assert.equal(d.needs_review, true);
});
test("router: garbled low-Hebrew layer ⇒ Path B2 (F2), never Path A", () => {
  const d = routePage({ has_text_layer: true, hebrew_share: 0.2, layout2_unresolved: false });
  assert.equal(d.route, "B2"); assert.match(d.route_reason, /F2/);
});
test("router: never publishes and always marks machine_derived", () => {
  for (const s of [{ has_text_layer: true, hebrew_share: 0.9, layout2_unresolved: false }, { has_text_layer: false, hebrew_share: 0, layout2_unresolved: false }]) {
    const d = routePage(s); assert.equal(d.published, 0); assert.equal(d.machine_derived, true);
  }
  assert.equal(DEFAULT_ROUTE_CONFIG.hebrew_min, 0.6);
});

// ── Path B1 XY-cut ───────────────────────────────────────────────────────────
// Build a synthetic two-column RTL page: a header line on top, then two columns.
// PDF y: higher = up. RTL: right column first, and within a line right→left.
function twoColumnPage(): LayoutItem[] {
  const items: LayoutItem[] = [];
  // header spanning full width, top of page
  items.push({ str: "כותרת", x: 250, y: 700, width: 100, height: 12 });
  // right column (x ~ 400-500), two lines
  items.push({ str: "ימין1", x: 450, y: 650, width: 60, height: 12 });
  items.push({ str: "ימין2", x: 450, y: 630, width: 60, height: 12 });
  // left column (x ~ 100-200), two lines
  items.push({ str: "שמאל1", x: 120, y: 650, width: 60, height: 12 });
  items.push({ str: "שמאל2", x: 120, y: 630, width: 60, height: 12 });
  return items;
}
test("B1 recoverReadingOrder: header first, then right column, then left (RTL)", () => {
  const r = recoverReadingOrder(twoColumnPage());
  assert.equal(r.lossless, true);
  assert.equal(r.resolved, true);
  const order = r.reading_order_text.replace(/\s+/g, " ");
  // header before both columns
  assert.ok(order.indexOf("כותרת") < order.indexOf("ימין1"));
  // right column entirely before left column (RTL reading)
  assert.ok(order.indexOf("ימין2") < order.indexOf("שמאל1"), `order was: ${order}`);
});
test("B1 recoverReadingOrder: empty input is handled and lossless", () => {
  const r = recoverReadingOrder([]);
  assert.equal(r.resolved, false); assert.equal(r.reading_order_text, ""); assert.equal(r.lossless, true);
});
test("B1 recoverReadingOrder: single-column preserves within-line RTL and loses nothing", () => {
  const items: LayoutItem[] = [
    { str: "א", x: 400, y: 500, width: 10, height: 12 },
    { str: "ב", x: 380, y: 500, width: 10, height: 12 },
    { str: "ג", x: 400, y: 480, width: 10, height: 12 },
  ];
  const r = recoverReadingOrder(items);
  assert.equal(r.lossless, true);
  const order = r.reading_order_text.replace(/\s+/g, "");
  assert.equal(order.replace(/\n/g, ""), "אבג"); // right→left on line 1 (א then ב), then next line ג
});

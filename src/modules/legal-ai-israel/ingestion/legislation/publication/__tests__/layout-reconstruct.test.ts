import { test } from "node:test";
import assert from "node:assert/strict";
import { reconstructPage, reconstructDocument, LAYOUT_VERSION, type LayoutItem } from "../layout-reconstruct.ts";

// Helper: a word item at (x,y) with a width proportional to length.
const w = (str: string, x: number, y: number): LayoutItem => ({ str, x, y, width: str.length * 10, height: 12 });

/** Single-column body page: four justified lines, no marginal column. */
function singleColumnPage(): LayoutItem[] {
  const items: LayoutItem[] = [];
  const ys = [700, 680, 660, 640];
  for (const y of ys) { items.push(w("ראשון", 470, y), w("שני", 380, y), w("שלישי", 290, y), w("רביעי", 200, y)); }
  return items;
}

/** Two-column page: wide body (x≈200–550) + narrow LEFT marginal caption column (x≈40). */
function marginalPage(): LayoutItem[] {
  const items: LayoutItem[] = [];
  const ys = [700, 680, 660, 640, 620, 600];
  for (const y of ys) { items.push(w("מטרת", 470, y), w("הקרן", 380, y), w("תהיה", 290, y), w("לרכז", 200, y)); }
  // Marginal captions (short side headings) on two lines only, far left.
  items.push(w("כותרתא", 40, 700));
  items.push(w("כותרתב", 40, 660));
  return items;
}

test("single-column page: no marginal split, all text in body, lossless", () => {
  const r = reconstructPage(singleColumnPage());
  assert.equal(r.columnType, "single");
  assert.equal(r.marginalCaptions.length, 0);
  assert.equal(r.lossless, true);
  assert.match(r.bodyText, /ראשון/);
});

test("single-column body reads RTL within a line (right→left)", () => {
  const r = reconstructPage(singleColumnPage());
  const firstLine = r.bodyText.split("\n")[0];
  assert.equal(firstLine, "ראשון שני שלישי רביעי");
});

test("two-column: marginal captions separated from body, body clean, lossless", () => {
  const r = reconstructPage(marginalPage());
  assert.equal(r.columnType, "two_column");
  assert.equal(r.marginalSide, "left");
  assert.equal(r.marginalCaptions.length, 2, "both side headings detected");
  // Contamination check: caption text must NOT appear inside the body.
  assert.ok(!r.bodyText.includes("כותרתא"), "caption must not contaminate body");
  assert.ok(!r.bodyText.includes("כותרתב"), "caption must not contaminate body");
  assert.match(r.bodyText, /מטרת הקרן תהיה לרכז/);
  assert.equal(r.lossless, true, "body+captions must contain every input glyph");
});

test("losslessness holds: no glyph is dropped in two-column mode", () => {
  const items = marginalPage();
  const r = reconstructPage(items);
  const inGlyphs = [...items.map((i) => i.str).join("").replace(/\s/g, "")].sort().join("");
  const outGlyphs = [...(r.bodyText + r.marginalCaptions.map((c) => c.text).join("")).replace(/\s/g, "")].sort().join("");
  assert.equal(outGlyphs, inGlyphs);
});

test("empty page is handled and lossless", () => {
  const r = reconstructPage([]);
  assert.equal(r.bodyText, "");
  assert.equal(r.lossless, true);
});

test("document reconstruction aggregates pages + version + counts", () => {
  const doc = reconstructDocument([singleColumnPage(), marginalPage()]);
  assert.equal(doc.layoutVersion, LAYOUT_VERSION);
  assert.equal(doc.singleColumnPages, 1);
  assert.equal(doc.twoColumnPages, 1);
  assert.equal(doc.lossless, true);
  assert.ok(doc.layoutText.length > 0);
  assert.equal(doc.marginalCaptions.length, 2);
});

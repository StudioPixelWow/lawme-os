import { test } from "node:test";
import assert from "node:assert/strict";
import { reconstructPage, reconstructDocument, LAYOUT_VERSION, type LayoutItem } from "../layout-reconstruct.ts";

const wd = (str: string, x: number, y: number): LayoutItem => ({ str, x, y, width: str.length * 9, height: 11 });

/** Realistic single body column: 6 justified lines, words staggered per line so
 *  the column reads as one dense band (no aligned inter-word gaps). */
function singleColumnPage(): LayoutItem[] {
  const items: LayoutItem[] = [];
  const ys = [700, 686, 672, 658, 644, 630];
  const wordsPerLine = [
    ["ראשית", "המדינה", "תקבע", "בתקנות"],
    ["הוראות", "בדבר", "אופן", "הגשת"],
    ["בקשה", "לרישום", "לפי", "חוק"],
    ["זה", "ובכלל", "זה", "מועדים"],
    ["ואגרות", "וכן", "דרכי", "פרסום"],
    ["ההחלטות", "לציבור", "הרחב", "כאמור"],
  ];
  ys.forEach((y, li) => {
    let x = 410 - (li % 2) * 7; // RTL: first word rightmost, decreasing x
    for (const w of wordsPerLine[li]) { const width = w.length * 9; x -= width; items.push(wd(w, x, y)); x -= 14; }
  });
  return items;
}

/** Wide body column (x≈120–430) on all lines + a narrow RIGHT marginal caption
 *  column (x≈470) present on only two lines. */
function marginalPage(): LayoutItem[] {
  const items: LayoutItem[] = [];
  const ys = [700, 686, 672, 658, 644, 630];
  const lines = [
    ["בסעיף", "1", "לחוק", "העיקרי", "יבוא"],
    ["במקום", "ההגדרה", "הראשונה", "יבוא", "זה"],
    ["אחרי", "פסקה", "שלישית", "תבוא", "פסקה"],
    ["ובלבד", "שלא", "יחול", "על", "מי"],
    ["שהוראות", "אלה", "חלות", "עליו", "כדין"],
    ["לענין", "סעיף", "קטן", "זה", "בלבד"],
  ];
  // Body: RTL (first word rightmost ≈ x430, decreasing), spanning ~x120–430.
  ys.forEach((y, li) => { let x = 430 - (li % 2) * 6; for (const w of lines[li]) { const width = w.length * 9; x -= width; items.push(wd(w, x, y)); x -= 12; } });
  // Marginal caption (narrow, far right beyond the body) on two lines only.
  items.push(wd("תיקון", 470, 700));
  items.push(wd("הוספה", 470, 672));
  return items;
}

test("single body column: one band, all text in body, lossless", () => {
  const r = reconstructPage(singleColumnPage());
  assert.equal(r.columnType, "single");
  assert.equal(r.bodyColumns, 1);
  assert.equal(r.marginalCaptions.length, 0);
  assert.equal(r.lossless, true);
  assert.equal(r.unresolved, false);
});

test("marginal caption separated from body; body clean; lossless", () => {
  const r = reconstructPage(marginalPage());
  assert.ok(r.marginalCaptions.length >= 1, "caption column detected");
  assert.ok(!r.bodyText.includes("תיקון"), "caption not in body");
  assert.match(r.bodyText, /בסעיף 1 לחוק העיקרי יבוא/);
  assert.equal(r.lossless, true);
});

test("losslessness: body+captions glyph-multiset == deduped input", () => {
  for (const page of [singleColumnPage(), marginalPage()]) {
    const r = reconstructPage(page);
    const inG = [...page.map((i) => i.str).join("").replace(/\s/g, "")].sort().join("");
    const outG = [...(r.bodyText + r.marginalCaptions.map((c) => c.text).join("")).replace(/\s/g, "")].sort().join("");
    assert.equal(outG, inG);
  }
});

test("coincident duplicate items are collapsed (doubled text layer), still lossless", () => {
  const page = singleColumnPage();
  const doubled = [...page, ...page.map((i) => ({ ...i, x: i.x + 0.5 }))]; // near-coincident duplicates
  const r = reconstructPage(doubled);
  assert.equal(r.lossless, true);
  // body should not be doubled: the word "ראשית" appears once, not twice in a row
  assert.ok(!/ראשית\s+ראשית/.test(r.bodyText), "coincident duplicates collapsed");
});

test("segments carry source spans", () => {
  const r = reconstructPage(marginalPage());
  for (const s of r.segments) {
    assert.ok(Number.isInteger(s.sourceSpan.start) && Number.isInteger(s.sourceSpan.end));
    assert.ok(s.sourceSpan.end >= s.sourceSpan.start);
  }
});

test("empty page handled and lossless", () => {
  const r = reconstructPage([]);
  assert.equal(r.columnType, "empty");
  assert.equal(r.lossless, true);
});

test("document reconstruction aggregates version + counts", () => {
  const doc = reconstructDocument([singleColumnPage(), marginalPage()]);
  assert.equal(doc.layoutVersion, LAYOUT_VERSION);
  assert.equal(doc.lossless, true);
  assert.ok(doc.layoutText.length > 0);
});

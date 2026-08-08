import { test } from "node:test";
import assert from "node:assert/strict";
import { gematriaValue, detectPrintedFolio } from "../citation-folio.ts";
import type { LayoutItem } from "../layout-reconstruct.ts";

test("gematriaValue: standard sums + geresh stripping", () => {
  assert.equal(gematriaValue("א"), 1);
  assert.equal(gematriaValue("י"), 10);
  assert.equal(gematriaValue("יב"), 12);
  assert.equal(gematriaValue('קכ״ג'), 123);   // 100+20+3, gershayim ignored
  assert.equal(gematriaValue("תתקצט"), 999);
  assert.equal(gematriaValue("שלום"), 376);   // a word still sums (caller must gate by context)
  assert.equal(gematriaValue("abc"), null);
  assert.equal(gematriaValue(""), null);
});

const foot = (toks: { s: string; x: number }[]): LayoutItem[] => [
  { str: "גוף", x: 300, y: 700, width: 40, height: 12 }, // body up top
  ...toks.map((t) => ({ str: t.s, x: t.x, y: 30, width: 20, height: 12 })), // footer band
];

test("detectPrintedFolio: digit folio in footer ⇒ high confidence", () => {
  const r = detectPrintedFolio(foot([{ s: "364", x: 300 }]));
  assert.equal(r.kind, "digit"); assert.equal(r.printed_page_label, "364"); assert.equal(r.gazette_page_number, "364"); assert.equal(r.confidence, "high");
});

test("detectPrintedFolio: gershayim-marked gematria ⇒ high, even beside header text", () => {
  const r = detectPrintedFolio(foot([{ s: "ספר", x: 500 }, { s: 'קכ״ג', x: 100 }]));
  assert.equal(r.kind, "gematria"); assert.equal(r.gazette_page_number, "123"); assert.equal(r.confidence, "high");
});

test("detectPrintedFolio: bare unmarked gematria word is NOT inferred ⇒ null", () => {
  // 'יב' without a gershayim marker is not accepted (could be an abbreviation);
  // confidence gating requires an explicit numeral marker.
  const r = detectPrintedFolio(foot([{ s: "יב", x: 300 }]));
  assert.equal(r.printed_page_label, null); assert.equal(r.confidence, null);
});

test("detectPrintedFolio: marked gematria 'י״ב' ⇒ high", () => {
  const r = detectPrintedFolio(foot([{ s: "י״ב", x: 300 }]));
  assert.equal(r.kind, "gematria"); assert.equal(r.gazette_page_number, "12"); assert.equal(r.confidence, "high");
});

test("detectPrintedFolio: absent / weak signal ⇒ null (never inferred)", () => {
  // a footer line of Hebrew words with no numeral marker — and a lone header word
  const busy = foot([{ s: "משרד", x: 500 }, { s: "המשפטים", x: 400 }, { s: "ירושלים", x: 300 }, { s: "התשפ", x: 200 }]);
  const r = detectPrintedFolio(busy);
  assert.equal(r.printed_page_label, null); assert.equal(r.confidence, null);
  assert.deepEqual(detectPrintedFolio([]), { printed_page_label: null, gazette_page_number: null, kind: null, confidence: null });
});

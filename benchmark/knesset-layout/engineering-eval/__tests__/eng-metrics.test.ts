/**
 * Deterministic tests for the engineering-eval metrics. Synthetic inputs only.
 * These guard the AUTOMATIC/PROXY metric math — they say nothing about human
 * accuracy (there is none here by design).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  glyphs, glyphTotal, hebrewShare, textLoss, duplication, sectionMonotonicDiag,
  falseSeparationRate, scorePage, aggregate,
} from "../eng-metrics.ts";

test("glyph multiset ignores whitespace and counts", () => {
  const m = glyphs("אב ג\nא");
  assert.equal(glyphTotal(m), 4);
  assert.equal(m.get("א"), 2);
});

test("hebrewShare: pure Hebrew ~1, garbled/latin low", () => {
  assert.ok(hebrewShare("שלום עולם") > 0.99);
  assert.ok(hebrewShare("Ïåíi qzx") < 0.2);
  assert.equal(hebrewShare(""), 0);
});

test("textLoss / duplication are order-independent vs the multiset", () => {
  const ref = glyphs("אבגד");
  assert.equal(textLoss(ref, glyphs("דגבא")), 0);         // reordering loses nothing
  assert.equal(textLoss(ref, glyphs("אבג")), 0.25);        // one of four missing
  assert.equal(duplication(ref, glyphs("אבגדד")), 0.25);   // one extra glyph
});

test("sectionMonotonicDiag is a lenient non-gating diagnostic", () => {
  assert.equal(sectionMonotonicDiag(["1", "2", "3"]), 1);
  assert.equal(sectionMonotonicDiag(["1", "5", "2"]), 0.5); // one drop out of two steps
  assert.equal(sectionMonotonicDiag(["1"]), 1);             // too few → 1
});

test("falseSeparationRate flags over-long 'captions'", () => {
  assert.equal(falseSeparationRate(["תיקון סעיף 1"]), 0);
  assert.equal(falseSeparationRate(["a very long caption that is really body text spanning well beyond forty characters"]), 1);
});

test("scorePage: no text layer ⇒ loss null + failure; clean ⇒ loss computed", () => {
  const scanned = scorePage({ id: "b1", engine: "x", stratum: "image_partial", reference: { text: "", has_text_layer: false }, output: { text: "משהו" } });
  assert.equal(scanned.has_text_layer, false);
  assert.equal(scanned.text_loss_rate, null);
  assert.equal(scanned.failure, true);

  const clean = scorePage({ id: "b2", engine: "x", stratum: "front_or_index", reference: { text: "שלום עולם שלום", has_text_layer: true }, output: { text: "שלום עולם שלום" } });
  assert.equal(clean.reference_reliable, true);
  assert.equal(clean.text_loss_rate, 0);
  assert.equal(clean.failure, false);
});

test("scorePage: garbled reference is marked unreliable (loss not scored against it)", () => {
  const m = scorePage({ id: "b3", engine: "x", stratum: "old_font", reference: { text: "Ïåíi qzx wpäö", has_text_layer: true }, output: { text: "שלום עולם" } });
  assert.equal(m.reference_reliable, false);
  assert.equal(m.text_loss_rate, null);
  assert.ok(m.notes.some((n) => /garbled/.test(n)));
});

test("aggregate: averages only over pages with a reliable reference for loss/dup", () => {
  const rows = [
    scorePage({ id: "a", engine: "x", stratum: "s", reference: { text: "שלוםשלום", has_text_layer: true }, output: { text: "שלוםשלום" } }),
    scorePage({ id: "b", engine: "x", stratum: "s", reference: { text: "", has_text_layer: false }, output: { text: "" } }),
  ];
  const a = aggregate(rows);
  assert.equal(a.pages, 2);
  assert.equal(a.pages_no_text_layer, 1);
  assert.equal(a.pages_with_reliable_reference, 1);
  assert.equal(a.mean_text_loss_pct, 0);
});

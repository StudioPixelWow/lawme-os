/**
 * Real-PDF regression test: reconstruction of actual ספר החוקים page geometry
 * captured from Object Storage (pub 2161820). Locks the deterministic output so
 * future changes to layout-reconstruct.ts can't silently regress on real data.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { reconstructPage, type LayoutItem } from "../layout-reconstruct.ts";

interface Fixture {
  label: string; pub: string; page: number; items: LayoutItem[];
  expect: { columnType: "single" | "two_column"; lossless: boolean; marginalSide: "left" | "right" | null; captionCount: number };
}
const fixtures: Fixture[] = JSON.parse(
  readFileSync(fileURLToPath(new URL("../__fixtures__/layout-real-pages.json", import.meta.url)), "utf8"),
);

test("real pages: reconstruction is lossless (no glyph dropped)", () => {
  for (const f of fixtures) {
    const r = reconstructPage(f.items);
    assert.equal(r.lossless, true, `${f.label} page must be lossless`);
  }
});

test("real pages: column classification is stable", () => {
  for (const f of fixtures) {
    const r = reconstructPage(f.items);
    assert.equal(r.columnType, f.expect.columnType, `${f.label}: columnType`);
    assert.equal(r.marginalSide, f.expect.marginalSide, `${f.label}: marginalSide`);
    assert.equal(r.marginalCaptions.length, f.expect.captionCount, `${f.label}: caption count`);
  }
});

test("real pages: body is non-empty Hebrew legal text", () => {
  for (const f of fixtures) {
    const r = reconstructPage(f.items);
    assert.ok(r.bodyText.length > 50, `${f.label}: body has content`);
    assert.match(r.bodyText, /[֐-׿]/, `${f.label}: body contains Hebrew`);
  }
});

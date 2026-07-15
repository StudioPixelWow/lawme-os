/**
 * Work surface URL grammar (Capability 1, Slice A).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseMatterUrl, surfaceToSearch, normalizeLens, WORK_LENSES } from "../panel-state.ts";

test("parses ?panel=work&lens=documents into a work panel with lens param", () => {
  const s = parseMatterUrl("?panel=work&lens=documents");
  assert.equal(s.panel?.kind, "work");
  assert.equal(s.panel?.param, "documents");
  assert.equal(s.workflow, null);
});

test("round-trips work+lens through surfaceToSearch", () => {
  const q = surfaceToSearch({ panel: { kind: "work", param: "evidence" }, workflow: null });
  assert.equal(q, "?panel=work&lens=evidence");
});

test("normalizeLens defaults unknown/empty to documents and accepts every valid lens", () => {
  assert.equal(normalizeLens(null), "documents");
  assert.equal(normalizeLens("bogus"), "documents");
  for (const l of WORK_LENSES) assert.equal(normalizeLens(l), l);
});

test("work panel without a lens param falls back to documents via normalizeLens", () => {
  const s = parseMatterUrl("?panel=work");
  assert.equal(s.panel?.kind, "work");
  assert.equal(normalizeLens(s.panel?.param), "documents");
});

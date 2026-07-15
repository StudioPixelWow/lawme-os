/**
 * /matters list invariants (Capability 2, Slice 1 hotfix).
 * The frozen demo must be present exactly once in EVERY rendering state, and a
 * DB/config failure must never collapse into an empty list — it surfaces as a
 * banner error code while the demo still shows.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { demoSummary, composeMatterList, type DurableMattersResult } from "../matter-loader.ts";
import type { MatterSummary } from "../../persistence/matter-repository.ts";

const demo = demoSummary();
function durableMatter(slug: string, title: string): MatterSummary {
  return { id: slug, slug, titleHe: title, procedureType: "severance_claim", currentStageId: "intake", status: "open", fileNoHe: null, forumHe: null, openedAt: "2026-07-10" };
}
const demoCount = (ms: MatterSummary[]) => ms.filter((m) => m.slug === "demo").length;

test("demo present exactly once — success with zero durable matters", () => {
  const r = composeMatterList(demo, { status: "success", matters: [] });
  assert.equal(r.matters.length, 1);
  assert.equal(demoCount(r.matters), 1);
  assert.equal(r.errorCode, null);
});

test("demo first, then durable matters — success with matters", () => {
  const result: DurableMattersResult = { status: "success", matters: [durableMatter("m-1", "א"), durableMatter("m-2", "ב")] };
  const r = composeMatterList(demo, result);
  assert.equal(r.matters.length, 3);
  assert.equal(r.matters[0].slug, "demo");
  assert.equal(demoCount(r.matters), 1);
});

test("database_error → demo still present + error code (no empty state)", () => {
  const r = composeMatterList(demo, { status: "database_error", code: "internal [cid:x]" });
  assert.equal(demoCount(r.matters), 1);
  assert.equal(r.matters.length, 1);
  assert.match(r.errorCode ?? "", /internal/);
});

test("configuration_error → demo still present + error code (no empty state)", () => {
  const r = composeMatterList(demo, { status: "configuration_error", code: "missing key [cid:x]" });
  assert.equal(demoCount(r.matters), 1);
  assert.ok(r.errorCode);
});

test("demo is never duplicated even if the durable set accidentally contains it", () => {
  const r = composeMatterList(demo, { status: "success", matters: [durableMatter("demo", "dup"), durableMatter("m-9", "ט")] });
  assert.equal(demoCount(r.matters), 1);
  assert.equal(r.matters.some((m) => m.slug === "m-9"), true);
});

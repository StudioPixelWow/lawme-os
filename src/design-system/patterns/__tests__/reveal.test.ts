/**
 * Reveal opt-out regression (Capability 2 Slice 1 cleanup).
 * Guards that a section/header rendered with reveal={false} does NOT carry the
 * opacity-zero entrance class — i.e. the Matter list is visible on first paint,
 * not initially hidden — while the default keeps the entrance animation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { riseClass, startsHidden } from "../reveal.ts";

test("reveal=false → no animate-rise class → not hidden on first paint", () => {
  assert.equal(riseClass(false), "");
  assert.equal(riseClass(false).includes("animate-rise"), false);
  assert.equal(startsHidden(false), false);
});

test("reveal=true (default) → keeps the entrance animation for other routes", () => {
  assert.equal(riseClass(true), "animate-rise");
  assert.equal(startsHidden(true), true);
});

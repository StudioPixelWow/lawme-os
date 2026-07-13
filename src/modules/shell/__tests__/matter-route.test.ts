import { test } from "node:test";
import assert from "node:assert/strict";
import { suppressesUtilityRail } from "../matter-route.ts";

test("suppresses the utility rail on a single matter route", () => {
  assert.equal(suppressesUtilityRail("/matters/demo"), true);
  assert.equal(suppressesUtilityRail("/matters/MAT-123"), true);
  assert.equal(suppressesUtilityRail("/matters/demo/"), true);
});

test("keeps the utility rail on the matters list and other OS routes", () => {
  assert.equal(suppressesUtilityRail("/matters"), false);
  assert.equal(suppressesUtilityRail("/today"), false);
  assert.equal(suppressesUtilityRail("/clients"), false);
  assert.equal(suppressesUtilityRail("/calendar"), false);
  assert.equal(suppressesUtilityRail("/documents"), false);
  assert.equal(suppressesUtilityRail("/"), false);
});

test("does not suppress on a deeper matter subroute", () => {
  assert.equal(suppressesUtilityRail("/matters/demo/documents"), false);
});

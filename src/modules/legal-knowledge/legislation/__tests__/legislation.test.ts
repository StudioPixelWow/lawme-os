import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeStatuteName, normalizeStatuteId, hebrewNumeralToInt,
  parseSectionRef, parseSectionRange, sameSectionKey,
} from "../normalize.ts";
import {
  resolveVersionAsOf, resolveCurrentVersion, isSuperseded, effectiveDateValid, compareVersions,
} from "../versioning.ts";
import type { StatuteVersion } from "../versioning.ts";

test("statute name normalization collapses year suffix + definite article", () => {
  const a = normalizeStatuteName("חוק פיצויי הפיטורים, התשכ\"ג-1963");
  const b = normalizeStatuteName("חוק פיצויי פיטורים");
  assert.equal(a, b);
});

test("statute id slug normalization", () => {
  assert.equal(normalizeStatuteId("Severance Pay Law"), "severance-pay-law");
});

test("hebrew numeral to int", () => {
  assert.equal(hebrewNumeralToInt("יד"), 14);
  assert.equal(hebrewNumeralToInt("כב"), 22);
  assert.equal(hebrewNumeralToInt("11"), null); // not gematria
});

test("section ref parsing: plain, letter-suffix, subsections", () => {
  assert.equal(parseSectionRef("14")?.normalized, "14");
  assert.equal(parseSectionRef("סעיף 11א")?.normalized, "11א");
  assert.equal(parseSectionRef("24(ב)(1)")?.normalized, "24(ב)(1)");
  assert.equal(parseSectionRef("סעיף 11(א) לחוק עבודת נשים")?.normalized, "11(א)");
});

test("section range parsing", () => {
  assert.deepEqual(parseSectionRange("13-16"), [13, 14, 15, 16]);
  assert.deepEqual(parseSectionRange("סעיפים 5 עד 7"), [5, 6, 7]);
  assert.deepEqual(parseSectionRange("14"), [14]);
});

test("same section key across citation forms", () => {
  assert.ok(sameSectionKey("סעיף 14", "14"));
  assert.ok(!sameSectionKey("14", "11א"));
});

function v(over: Partial<StatuteVersion>): StatuteVersion {
  return {
    statuteId: "severance-pay-law", canonicalId: "x", currentTitleHe: "חוק פיצויי פיטורים",
    historicalTitleHe: null, enactedDate: "1963-04-01", publicationDate: "1963-04-15",
    effectiveDate: "1964-01-01", amendmentDate: null, repealDate: null,
    versionStart: "1964-01-01", versionEnd: null, state: "current",
    transitionalProvisionsHe: null, sourcePublication: "ספר החוקים", supersedesVersionId: null,
    supersededByVersionId: null, verificationDate: "2026-07-12", verificationStatus: "verified", ...over,
  };
}

test("resolveVersionAsOf: single verified open version is certain-ish", () => {
  const r = resolveVersionAsOf([v({ canonicalId: "a" })], "2020-01-01");
  assert.equal(r.certainty, "certain");
  assert.equal(r.resolved?.canonicalId, "a");
});

test("resolveVersionAsOf: unverified window is uncertain, never asserts currency", () => {
  const r = resolveVersionAsOf([v({ canonicalId: "a", verificationStatus: "unverified" })], "2020-01-01");
  assert.equal(r.certainty, "uncertain");
});

test("resolveVersionAsOf: overlapping versions require human decision", () => {
  const r = resolveVersionAsOf([
    v({ canonicalId: "a", versionStart: "2000-01-01", versionEnd: null }),
    v({ canonicalId: "b", versionStart: "2010-01-01", versionEnd: null }),
  ], "2020-01-01");
  assert.equal(r.certainty, "uncertain");
  assert.equal(r.resolved, null);
});

test("historical version: superseded detection", () => {
  const old = v({ canonicalId: "old", versionStart: "1964-01-01", versionEnd: "2010-01-01", state: "historical" });
  const cur = v({ canonicalId: "cur", versionStart: "2010-01-01", versionEnd: null });
  assert.ok(isSuperseded(old, [old, cur]));
  assert.ok(!isSuperseded(cur, [old, cur]));
});

test("current version resolves to the open verified one", () => {
  const old = v({ canonicalId: "old", versionStart: "1964-01-01", versionEnd: "2010-01-01", state: "historical", supersededByVersionId: "cur" });
  const cur = v({ canonicalId: "cur", versionStart: "2010-01-01", versionEnd: null });
  const r = resolveCurrentVersion([old, cur], "2026-07-12");
  assert.equal(r.resolved?.canonicalId, "cur");
});

test("effective date before publication is invalid", () => {
  assert.equal(effectiveDateValid(v({ effectiveDate: "1960-01-01" })).ok, false);
  assert.equal(effectiveDateValid(v({ effectiveDate: "1964-01-01" })).ok, true);
});

test("compareVersions orders chronologically", () => {
  const a = v({ versionStart: "2000-01-01" }), b = v({ versionStart: "2010-01-01" });
  assert.equal(compareVersions(a, b), -1);
  assert.equal(compareVersions(b, a), 1);
});

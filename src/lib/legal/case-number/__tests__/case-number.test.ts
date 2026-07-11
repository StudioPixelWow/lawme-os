/**
 * Case-number normalizer tests — runs with `node --test` (native TS).
 * Fixture-driven golden set + behavioral tests.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeCaseNumber, sameProceeding, validateCaseNumber } from "../index.ts";

interface FixtureExpected {
  ok: boolean;
  searchKey?: string | null;
  searchKeyPrefix?: string;
  display?: string;
  code?: string;
  year?: number;
  month?: number | null;
  format?: string;
  courtHint?: string;
  hasWarnings?: boolean;
  maxConfidence?: number;
  minConfidenceBelow?: number;
}
interface Fixture { name: string; input: string; expected: FixtureExpected }

const fixturesPath = path.join(import.meta.dirname, "fixtures.json");
const { fixtures } = JSON.parse(readFileSync(fixturesPath, "utf8")) as { fixtures: Fixture[] };

test("fixture set is large enough (>= 50)", () => {
  assert.ok(fixtures.length >= 50, `only ${fixtures.length} fixtures`);
});

for (const f of fixtures) {
  test(`fixture: ${f.name}`, () => {
    const r = normalizeCaseNumber(f.input);
    assert.equal(r.ok, f.expected.ok, `ok mismatch (warnings: ${r.warnings.join("; ")})`);
    if (f.expected.searchKey !== undefined) assert.equal(r.searchKey, f.expected.searchKey);
    if (f.expected.searchKeyPrefix) assert.ok(r.searchKey?.startsWith(f.expected.searchKeyPrefix), `key ${r.searchKey}`);
    if (f.expected.display) assert.equal(r.display, f.expected.display);
    if (f.expected.code) assert.equal(r.procedureCode, f.expected.code);
    if (f.expected.year !== undefined) assert.equal(r.year, f.expected.year);
    if (f.expected.month !== undefined) assert.equal(r.month, f.expected.month);
    if (f.expected.format) assert.equal(r.format, f.expected.format);
    if (f.expected.courtHint) assert.equal(r.courtHint, f.expected.courtHint);
    if (f.expected.hasWarnings) assert.ok(r.warnings.length > 0, "expected warnings");
    if (f.expected.maxConfidence !== undefined) assert.ok(r.confidence <= f.expected.maxConfidence, `confidence ${r.confidence}`);
    if (f.expected.minConfidenceBelow !== undefined) assert.ok(r.confidence < 1, `confidence ${r.confidence}`);
    // Universal invariants
    assert.equal(r.original, f.input, "original must be preserved verbatim");
    if (r.ok) {
      assert.ok(r.searchKey, "ok parse must produce a searchKey");
      assert.ok(r.display, "ok parse must produce a display value");
      assert.ok(r.confidence > 0);
    } else {
      assert.equal(r.searchKey, null);
      assert.equal(r.confidence, 0);
    }
  });
}

test("idempotence: normalizing the display value yields the same key", () => {
  for (const f of fixtures) {
    if (!f.expected.ok) continue;
    const first = normalizeCaseNumber(f.input);
    if (!first.display || !first.searchKey) continue;
    const second = normalizeCaseNumber(first.display);
    assert.equal(second.searchKey, first.searchKey, `not idempotent for "${f.input}"`);
  }
});

test("sameProceeding matches across quote/hyphen/space variants", () => {
  assert.ok(sameProceeding('סע"ש 12345-01-20', "סע׳ש  12345 – 01 – 20"));
  assert.ok(sameProceeding('ע"א 7803/06', "עא 7803/2006"));
  assert.ok(!sameProceeding('ע"א 7803/06', 'ע"א 7804/06'));
  assert.ok(!sameProceeding('ע"א 7803/06', 'רע"א 7803/06'));
  assert.ok(!sameProceeding("", 'ע"א 7803/06'));
});

test("validateCaseNumber: errors on garbage, warnings on low confidence", () => {
  const bad = validateCaseNumber("שלום עולם");
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.length > 0);

  const unknownCode = validateCaseNumber('צ"ח 123-01-20');
  assert.equal(unknownCode.valid, true);
  assert.ok(unknownCode.warnings.length > 0);
});

test("no invented metadata: unknown code has no courtHint", () => {
  const r = normalizeCaseNumber('צ"ח 123-01-20');
  assert.equal(r.courtHint, null);
  assert.equal(r.procedure, null);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { amendmentFingerprint } from "../amendment-fingerprint.ts";

const base = {
  targetLawId: "knesset:2000042",
  targetSection: "7",
  operationType: "replace_words",
  oldText: "אלף",
  newText: "בית",
  evidence: "במקום \"אלף\" יבוא \"בית\"",
  spanStart: 10,
  spanEnd: 40,
};

test("deterministic: same input -> same fingerprint", () => {
  assert.equal(amendmentFingerprint(base), amendmentFingerprint({ ...base }));
});

test("distinguishes ops sharing (span_start, operation_type) but differing in text/target", () => {
  // The exact failure mode of the old coarse key: same span + type, different content.
  const a = amendmentFingerprint(base);
  const b = amendmentFingerprint({ ...base, targetSection: "9", oldText: "גימל", newText: "דלת" });
  assert.notEqual(a, b, "distinct ops at the same clause offset must not collide");
});

test("whitespace/case normalization is stable", () => {
  const a = amendmentFingerprint({ ...base, evidence: "  במקום   \"אלף\"  יבוא \"בית\"  " });
  const b = amendmentFingerprint({ ...base, evidence: "במקום \"אלף\" יבוא \"בית\"" });
  assert.equal(a, b, "collapsed whitespace must produce identical fingerprints");
});

test("null oldText falls back to evidence (legacy-row parity)", () => {
  const withOld = amendmentFingerprint({ ...base, oldText: "במקום \"אלף\" יבוא \"בית\"", newText: null, evidence: null });
  const withEvidence = amendmentFingerprint({ ...base, oldText: null, newText: null, evidence: "במקום \"אלף\" יבוא \"בית\"" });
  assert.equal(withOld, withEvidence, "oldText and evidence must occupy the same fingerprint slot");
});

test("is a 64-char sha256 hex string", () => {
  assert.match(amendmentFingerprint(base), /^[0-9a-f]{64}$/);
});

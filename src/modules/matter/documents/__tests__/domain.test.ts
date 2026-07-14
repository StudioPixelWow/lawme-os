/**
 * Document domain — validation + evidentiary gate tests.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  validateUpload,
  sanitizeFilename,
  sniffKind,
  MAX_SIZE_BYTES,
} from "../validation.ts";
import { mayConfirmFact, deriveVerification, whyNotConfirmedHe } from "../evidence-decision.ts";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

test("sniffKind reads magic bytes", () => {
  assert.equal(sniffKind(PDF), "pdf");
  assert.equal(sniffKind(PNG), "png");
  assert.equal(sniffKind(JPG), "jpg");
  assert.equal(sniffKind(ZIP), "zip");
  assert.equal(sniffKind(new Uint8Array([0, 1, 2])), "unknown");
});

test("valid PNG upload passes", () => {
  const r = validateUpload({ filename: "whatsapp.png", declaredMime: "image/png", size: 5000, head: PNG });
  assert.equal(r.ok, true);
  assert.equal(r.canonicalMime, "image/png");
});

test("rejects disallowed type", () => {
  const r = validateUpload({ filename: "notes.txt", declaredMime: "text/plain", size: 10, head: new Uint8Array([1, 2]) });
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.code === "type_not_allowed"));
});

test("rejects MIME/content mismatch (png ext, pdf bytes)", () => {
  const r = validateUpload({ filename: "fake.png", declaredMime: "image/png", size: 500, head: PDF });
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.code === "mime_mismatch"));
});

test("rejects oversize", () => {
  const r = validateUpload({ filename: "big.pdf", declaredMime: "application/pdf", size: MAX_SIZE_BYTES + 1, head: PDF });
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.code === "too_large"));
});

test("sanitizeFilename blocks traversal, paths and unsafe chars", () => {
  assert.equal(sanitizeFilename("../../etc/passwd"), "passwd");
  assert.equal(sanitizeFilename("a/b/c/report.PDF"), "report.pdf");
  assert.match(sanitizeFilename("in<voi>ce:*.png"), /^in_voi_ce__\.png$/);
  assert.equal(sanitizeFilename(".hidden"), "hidden");
});

test("gate: supports + clean scan + provenance + no conflict → confirmable", () => {
  assert.equal(
    mayConfirmFact({ decision: "supports", scanStatus: "scan_clean_demo", hasConflictingEvidence: false, hasProvenance: true }),
    true,
  );
});

test("gate: an allegation never auto-confirms (every non-supporting decision blocks)", () => {
  for (const decision of ["contradicts", "inconclusive", "authenticity_uncertain", "incomplete", null] as const) {
    assert.equal(
      mayConfirmFact({ decision, scanStatus: "scan_clean_demo", hasConflictingEvidence: false, hasProvenance: true }),
      false,
      `decision ${decision} must not confirm`,
    );
    assert.ok(whyNotConfirmedHe({ decision, scanStatus: "scan_clean_demo", hasConflictingEvidence: false, hasProvenance: true }));
  }
});

test("gate: unclean scan / conflict / missing provenance all block confirmation", () => {
  const base = { decision: "supports" as const, scanStatus: "scan_clean_demo" as const, hasConflictingEvidence: false, hasProvenance: true };
  assert.equal(mayConfirmFact({ ...base, scanStatus: "scan_pending" }), false);
  assert.equal(mayConfirmFact({ ...base, hasConflictingEvidence: true }), false);
  assert.equal(mayConfirmFact({ ...base, hasProvenance: false }), false);
});

test("deriveVerification: supports+clean→verified, contradicts→provisional, uncertain→unverified", () => {
  assert.equal(deriveVerification({ decision: "supports", scanStatus: "scan_clean_demo", hasConflictingEvidence: false, hasProvenance: true }), "verified");
  assert.equal(deriveVerification({ decision: "contradicts", scanStatus: "scan_clean_demo", hasConflictingEvidence: false, hasProvenance: true }), "provisional");
  assert.equal(deriveVerification({ decision: "authenticity_uncertain", scanStatus: "scan_clean_demo", hasConflictingEvidence: false, hasProvenance: true }), "unverified");
  assert.equal(deriveVerification({ decision: "supports", scanStatus: "scan_pending", hasConflictingEvidence: false, hasProvenance: true }), "unverified");
});

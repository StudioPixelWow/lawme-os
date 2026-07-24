/**
 * Capability 1 · Slice 1.0.1 — Bootstrap Validation Engine: exhaustive matrix.
 *
 * Pure tests (no DB, no JSX, no clock). Cover: success, every blocking code,
 * warnings, infos, normalization, deterministic ordering + hashing, version
 * compatibility, robustness (malformed/large), immutability, and the core
 * invariant `valid=false ⇒ normalizedDraft=undefined`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { validateBootstrapDraft } from "../validate.ts";
import { sha256Hex, canonicalize, contentHash } from "../hash.ts";
import { BOOTSTRAP_ISSUE_CODES } from "../issues.ts";
import type { BootstrapIssueCode } from "../issues.ts";
import type { RawBootstrapDraft, ResolvedBootstrapReferenceFacts, BootstrapValidationContext } from "../contracts.ts";
import { rawDraft, referenceFacts, context, clone, ORG, OTHER_ORG } from "./fixtures.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */

function run(
  d: RawBootstrapDraft = rawDraft(),
  r: ResolvedBootstrapReferenceFacts = referenceFacts(),
  c: BootstrapValidationContext = context(),
) {
  return validateBootstrapDraft(d, r, c);
}

function codes(res: ReturnType<typeof run>): BootstrapIssueCode[] {
  return res.blockingIssues.map((i) => i.stableCode);
}

/* ── SHA-256 + canonical serialization ────────────────────────────────────── */

test("sha256 matches FIPS 180-4 known vectors", () => {
  assert.equal(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("canonicalize is key-order independent", () => {
  assert.equal(canonicalize({ b: 1, a: [3, 2] }), canonicalize({ a: [3, 2], b: 1 }));
  assert.notEqual(canonicalize({ a: [3, 2] }), canonicalize({ a: [2, 3] }));
  assert.equal(contentHash({ x: 1, y: 2 }), contentHash({ y: 2, x: 1 }));
});

/* ── Success ──────────────────────────────────────────────────────────────── */

test("valid draft → valid=true + normalized draft with sorted sections", () => {
  const res = run();
  assert.equal(res.valid, true, JSON.stringify(codes(res)));
  assert.equal(res.blockingIssues.length, 0);
  const nd = res.normalizedDraft!;
  assert.ok(nd);
  assert.equal(nd.normalizedParticipants.length, 1);
  assert.equal(nd.normalizedFacts.length, 2);
  assert.equal(nd.normalizedDeadlines.length, 1);
  assert.equal(nd.normalizedEvidence.length, 1);
  assert.equal(nd.normalizedMatter.legalDomain, "labor");
  assert.match(nd.sourceInputHash, /^[0-9a-f]{64}$/);
  // facts sorted by factKey (code-unit): dismissal_date < employment_duration
  assert.deepEqual(nd.normalizedFacts.map((f) => f.factKey), ["dismissal_date", "employment_duration"]);
});

test("statistics report considered/accepted/dropped", () => {
  const res = run();
  assert.equal(res.statistics.facts.considered, 2);
  assert.equal(res.statistics.facts.accepted, 2);
  assert.equal(res.statistics.participants.considered, 1);
  assert.equal(res.statistics.issues, 0);
});

/* ── Draft state ──────────────────────────────────────────────────────────── */

test("DRAFT_NOT_READY when status is not ready_for_review", () => {
  const d = rawDraft();
  d.status = "needs_clarification";
  const res = run(d);
  assert.equal(res.valid, false);
  assert.ok(codes(res).includes("DRAFT_NOT_READY"));
});

test("DRAFT_REJECTED", () => {
  const d = rawDraft();
  d.status = "rejected";
  assert.ok(codes(run(d)).includes("DRAFT_REJECTED"));
});

test("DRAFT_EXPIRED by status and by expiry time", () => {
  const d1 = rawDraft();
  d1.status = "expired";
  assert.ok(codes(run(d1)).includes("DRAFT_EXPIRED"));
  const d2 = rawDraft();
  d2.expiresAt = "2020-01-01T00:00:00.000Z"; // before validatedAt
  assert.ok(codes(run(d2)).includes("DRAFT_EXPIRED"));
});

test("DRAFT_ALREADY_CONFIRMED via status, confirmedMatterId, or existingConfirmation", () => {
  const d1 = rawDraft();
  d1.status = "confirmed";
  assert.ok(codes(run(d1)).includes("DRAFT_ALREADY_CONFIRMED"));
  const d2 = rawDraft();
  d2.confirmedMatterId = "matter-x";
  assert.ok(codes(run(d2)).includes("DRAFT_ALREADY_CONFIRMED"));
  const r = referenceFacts();
  (r as any).existingConfirmation = { matterId: "matter-y" };
  assert.ok(codes(run(rawDraft(), r)).includes("DRAFT_ALREADY_CONFIRMED"));
});

test("DRAFT_VERSION_CONFLICT when expected version differs", () => {
  const c = context();
  c.expectedDraftVersion = "v-stale";
  assert.ok(codes(run(rawDraft(), referenceFacts(), c)).includes("DRAFT_VERSION_CONFLICT"));
});

/* ── Organization + owner ─────────────────────────────────────────────────── */

test("INVALID_ORGANIZATION when draft org ≠ active org", () => {
  const d = rawDraft();
  d.organizationId = OTHER_ORG;
  assert.ok(codes(run(d)).includes("INVALID_ORGANIZATION"));
});

test("INVALID_ORGANIZATION when organization inactive", () => {
  const r = referenceFacts();
  (r as any).organization = { id: ORG, active: false };
  assert.ok(codes(run(rawDraft(), r)).includes("INVALID_ORGANIZATION"));
});

test("INVALID_OWNER when owner missing or inactive", () => {
  const r1 = referenceFacts();
  (r1 as any).owner = null;
  assert.ok(codes(run(rawDraft(), r1)).includes("INVALID_OWNER"));
  const r2 = referenceFacts();
  (r2 as any).owner = { profileId: "u1", organizationId: ORG, activeMember: false };
  assert.ok(codes(run(rawDraft(), r2)).includes("INVALID_OWNER"));
});

test("CROSS_TENANT_REFERENCE when owner belongs to another org", () => {
  const r = referenceFacts();
  (r as any).owner = { profileId: "u1", organizationId: OTHER_ORG, activeMember: true };
  assert.ok(codes(run(rawDraft(), r)).includes("CROSS_TENANT_REFERENCE"));
});

/* ── Matter header ────────────────────────────────────────────────────────── */

test("MISSING_MATTER_TYPE when procedureType is null", () => {
  const c = context();
  (c.approvals as any).matter.procedureType = null;
  assert.ok(codes(run(rawDraft(), referenceFacts(), c)).includes("MISSING_MATTER_TYPE"));
});

test("UNKNOWN_ENUM when procedure/confidentiality/aiPolicy out of vocabulary", () => {
  const c1 = context();
  (c1.approvals as any).matter.procedureType = "not_a_procedure";
  assert.ok(codes(run(rawDraft(), referenceFacts(), c1)).includes("UNKNOWN_ENUM"));
  const c2 = context();
  (c2.approvals as any).matter.confidentiality = "top_secret";
  assert.ok(codes(run(rawDraft(), referenceFacts(), c2)).includes("UNKNOWN_ENUM"));
  const c3 = context();
  (c3.approvals as any).matter.aiPolicy = "whatever";
  assert.ok(codes(run(rawDraft(), referenceFacts(), c3)).includes("UNKNOWN_ENUM"));
});

test("blank title only warns (planner default), does not block", () => {
  const c = context();
  (c.approvals as any).matter.titleHe = "   ";
  const res = run(rawDraft(), referenceFacts(), c);
  assert.equal(res.valid, true);
  assert.ok(res.warnings.some((w) => w.code === "PLANNER_DEFAULT_APPLIED"));
});

/* ── Participants + contacts ──────────────────────────────────────────────── */

test("MISSING_CLIENT when no participant has role client", () => {
  const c = context();
  (c.approvals as any).participants = [{ itemId: "c2", role: "opposing_party" }];
  assert.ok(codes(run(rawDraft(), referenceFacts(), c)).includes("MISSING_CLIENT"));
});

test("MISSING_CLIENT when no participants approved at all", () => {
  const c = context();
  (c.approvals as any).participants = [];
  const res = run(rawDraft(), referenceFacts(), c);
  assert.ok(codes(res).includes("MISSING_CLIENT"));
  assert.ok(res.infos.some((i) => i.code === "EMPTY_SECTION" && i.field === "participants"));
});

test("INVALID_PARTICIPANT when itemId not in draft", () => {
  const c = context();
  (c.approvals as any).participants = [{ itemId: "ghost", role: "client" }];
  assert.ok(codes(run(rawDraft(), referenceFacts(), c)).includes("INVALID_PARTICIPANT"));
});

test("UNKNOWN_ENUM when participant role invalid", () => {
  const c = context();
  (c.approvals as any).participants = [{ itemId: "c1", role: "grandmaster" }];
  assert.ok(codes(run(rawDraft(), referenceFacts(), c)).includes("UNKNOWN_ENUM"));
});

test("DUPLICATE_PARTICIPANT when same contact+role appears twice", () => {
  const c = context();
  (c.approvals as any).participants = [
    { itemId: "c1", role: "client" },
    { itemId: "c1", role: "client" },
  ];
  assert.ok(codes(run(rawDraft(), referenceFacts(), c)).includes("DUPLICATE_PARTICIPANT"));
});

test("UNKNOWN_CONTACT when linkToContactId does not resolve", () => {
  const c = context();
  (c.approvals as any).participants = [{ itemId: "c1", role: "client", linkToContactId: "nope" }];
  assert.ok(codes(run(rawDraft(), referenceFacts(), c)).includes("UNKNOWN_CONTACT"));
});

test("CROSS_TENANT_REFERENCE when linked contact is in another org", () => {
  const c = context();
  (c.approvals as any).participants = [{ itemId: "c1", role: "client", linkToContactId: "foreign" }];
  const r = referenceFacts();
  (r as any).resolvedContacts = [{ contactId: "foreign", organizationId: OTHER_ORG, kind: "person" }];
  assert.ok(codes(run(rawDraft(), r, c)).includes("CROSS_TENANT_REFERENCE"));
});

test("AMBIGUOUS_CONTACT when duplicate-possible contact is not explicitly linked", () => {
  const d = rawDraft();
  (d.structuredDraft as any).contacts[0].value.duplicatePossibility = true;
  assert.ok(codes(run(d)).includes("AMBIGUOUS_CONTACT"));
  // Resolving it by linking an existing contact clears the block.
  const c = context();
  (c.approvals as any).participants = [{ itemId: "c1", role: "client", linkToContactId: "existing-contact-1" }];
  const res = run(d, referenceFacts(), c);
  assert.equal(res.valid, true, JSON.stringify(codes(res)));
});

test("linking an existing contact resolves and validates", () => {
  const c = context();
  (c.approvals as any).participants = [{ itemId: "c1", role: "client", linkToContactId: "existing-contact-1" }];
  const res = run(rawDraft(), referenceFacts(), c);
  assert.equal(res.valid, true);
  assert.equal(res.normalizedDraft!.normalizedParticipants[0].linkToContactId, "existing-contact-1");
});

/* ── Facts + epistemic ────────────────────────────────────────────────────── */

test("INVALID_FACT for missing item / empty statement / oversized statement", () => {
  const c1 = context();
  (c1.approvals as any).facts = [{ itemId: "ghost" }];
  assert.ok(codes(run(rawDraft(), referenceFacts(), c1)).includes("INVALID_FACT"));

  const d = rawDraft();
  (d.structuredDraft as any).facts[0].value.statementHe = "   ";
  const c2 = context();
  (c2.approvals as any).facts = [{ itemId: "f1" }];
  assert.ok(codes(run(d, referenceFacts(), c2)).includes("INVALID_FACT"));

  const c3 = context();
  (c3.approvals as any).facts = [{ itemId: "f1", statementHe: "x".repeat(5000) }];
  assert.ok(codes(run(rawDraft(), referenceFacts(), c3)).includes("INVALID_FACT"));
});

test("INVALID_EPISTEMIC_STATE when a fact carries an established status", () => {
  const c = context();
  (c.approvals as any).facts = [{ itemId: "f1", status: "confirmed" }];
  assert.ok(codes(run(rawDraft(), referenceFacts(), c)).includes("INVALID_EPISTEMIC_STATE"));
  const c2 = context();
  (c2.approvals as any).facts = [{ itemId: "f1", status: "document_derived" }];
  assert.ok(codes(run(rawDraft(), referenceFacts(), c2)).includes("INVALID_EPISTEMIC_STATE"));
});

test("duplicate facts by factKey are dropped with a DUPLICATE_DROPPED info", () => {
  const d = rawDraft();
  (d.structuredDraft as any).facts[1].value.factKey = "employment_duration"; // same as f1
  const c = context();
  (c.approvals as any).facts = [{ itemId: "f1" }, { itemId: "f2" }];
  const res = run(d, referenceFacts(), c);
  assert.equal(res.valid, true);
  assert.equal(res.normalizedDraft!.normalizedFacts.length, 1);
  assert.ok(res.infos.some((i) => i.code === "DUPLICATE_DROPPED" && i.field === "facts"));
  assert.equal(res.statistics.facts.dropped, 1);
});

/* ── Deadlines ────────────────────────────────────────────────────────────── */

test("INVALID_DEADLINE when known confidence lacks a date", () => {
  const d = rawDraft();
  (d.structuredDraft as any).deadlines[0].value.dueAt = null;
  assert.ok(codes(run(d)).includes("INVALID_DEADLINE"));
});

test("INVALID_DEADLINE when unknown confidence carries a date", () => {
  const d = rawDraft();
  (d.structuredDraft as any).deadlines[0].value.deadlineConfidence = "unknown";
  assert.ok(codes(run(d)).includes("INVALID_DEADLINE"));
});

test("INVALID_DEADLINE for bad source/confidence enum", () => {
  const d = rawDraft();
  (d.structuredDraft as any).deadlines[0].value.sourceType = "vibes";
  assert.ok(codes(run(d)).includes("INVALID_DEADLINE"));
});

test("estimated deadline warns APPROXIMATE_DATE + LOW_CONFIDENCE_DEADLINE", () => {
  const d = rawDraft();
  (d.structuredDraft as any).deadlines[0].value.deadlineConfidence = "estimated";
  const res = run(d);
  assert.equal(res.valid, true);
  const wc = res.warnings.map((w) => w.code);
  assert.ok(wc.includes("APPROXIMATE_DATE"));
  assert.ok(wc.includes("LOW_CONFIDENCE_DEADLINE"));
});

test("unknown-confidence null-date deadline warns UNKNOWN_DATE and stays valid", () => {
  const d = rawDraft();
  (d.structuredDraft as any).deadlines[0].value.deadlineConfidence = "unknown";
  (d.structuredDraft as any).deadlines[0].value.dueAt = null;
  const res = run(d);
  assert.equal(res.valid, true);
  assert.ok(res.warnings.some((w) => w.code === "UNKNOWN_DATE"));
  assert.equal(res.normalizedDraft!.normalizedDeadlines[0].dueAt, null);
});

test("blank timezone defaults to Asia/Jerusalem with UNKNOWN_TIMEZONE warning", () => {
  const d = rawDraft();
  (d.structuredDraft as any).deadlines[0].value.timezone = "";
  const res = run(d);
  assert.equal(res.valid, true);
  assert.ok(res.warnings.some((w) => w.code === "UNKNOWN_TIMEZONE"));
  assert.equal(res.normalizedDraft!.normalizedDeadlines[0].timezone, "Asia/Jerusalem");
});

/* ── Evidence ─────────────────────────────────────────────────────────────── */

test("WEAK_EVIDENCE warning for non-mandatory evidence", () => {
  const d = rawDraft();
  (d.structuredDraft as any).evidenceRequirements[0].value.mandatory = false;
  const res = run(d);
  assert.equal(res.valid, true);
  assert.ok(res.warnings.some((w) => w.code === "WEAK_EVIDENCE"));
});

test("UNSUPPORTED_EVIDENCE for missing item or empty label", () => {
  const c = context();
  (c.approvals as any).evidenceRequirements = [{ itemId: "ghost" }];
  assert.ok(codes(run(rawDraft(), referenceFacts(), c)).includes("UNSUPPORTED_EVIDENCE"));
  const d = rawDraft();
  (d.structuredDraft as any).evidenceRequirements[0].value.labelHe = "";
  assert.ok(codes(run(d)).includes("UNSUPPORTED_EVIDENCE"));
});

/* ── Warnings: sparse facts + unlinked participant ────────────────────────── */

test("SPARSE_FACTS + UNKNOWN_CONTACT_WILL_BE_CREATED + UNLINKED_PARTICIPANT", () => {
  const c = context();
  (c.approvals as any).facts = []; // zero accepted facts ⇒ sparse
  (c.approvals as any).participants = [{ itemId: "c1", role: "client" }]; // no link ⇒ create
  const res = run(rawDraft(), referenceFacts(), c);
  assert.equal(res.valid, true);
  const wc = res.warnings.map((w) => w.code);
  assert.ok(wc.includes("SPARSE_FACTS"));
  assert.ok(wc.includes("UNKNOWN_CONTACT_WILL_BE_CREATED"));
  assert.ok(wc.includes("UNLINKED_PARTICIPANT"));
});

/* ── Version compatibility ────────────────────────────────────────────────── */

test("UNSUPPORTED_VERSION for env/context/engine version mismatch", () => {
  const r1 = referenceFacts();
  (r1 as any).supportedValidationVersion = "bootstrap-validation-v0";
  assert.ok(codes(run(rawDraft(), r1)).includes("UNSUPPORTED_VERSION"));

  const c = context();
  c.validationVersion = "bootstrap-validation-v2";
  assert.ok(codes(run(rawDraft(), referenceFacts(), c)).includes("UNSUPPORTED_VERSION"));

  const d = rawDraft();
  d.engineVersion = "intake-99";
  assert.ok(codes(run(d)).includes("UNSUPPORTED_VERSION"));
});

test("SCHEMA_MISMATCH for unsupported schema version", () => {
  const d = rawDraft();
  d.schemaVersion = "matter-intake-contract-9.9.9";
  assert.ok(codes(run(d)).includes("SCHEMA_MISMATCH"));
});

/* ── Malformed / robustness ───────────────────────────────────────────────── */

test("MALFORMED_DRAFT when structuredDraft is not an object", () => {
  const d = rawDraft();
  (d as any).structuredDraft = "not-an-object";
  assert.ok(codes(run(d)).includes("MALFORMED_DRAFT"));
  const d2 = rawDraft();
  (d2 as any).structuredDraft = null;
  assert.ok(codes(run(d2)).includes("MALFORMED_DRAFT"));
});

test("SCHEMA_MISMATCH when structuredDraft fields fail schema", () => {
  const d = rawDraft();
  (d.structuredDraft as any).facts = [{ id: "f1", value: { factKey: 123 } }]; // factKey wrong type, no provenance
  assert.ok(codes(run(d)).includes("SCHEMA_MISMATCH"));
});

test("MALFORMED_DRAFT when approvals is not an object or missing required header", () => {
  const c1 = context();
  (c1 as any).approvals = [];
  assert.ok(codes(run(rawDraft(), referenceFacts(), c1)).includes("MALFORMED_DRAFT"));
  const c2 = context();
  (c2 as any).approvals = { matter: { titleHe: "x" } }; // missing confidentiality/aiPolicy
  assert.ok(codes(run(rawDraft(), referenceFacts(), c2)).includes("MALFORMED_DRAFT"));
});

test("large draft is bounded and validates deterministically", () => {
  const d = rawDraft();
  const facts: unknown[] = [];
  const approvedFacts: unknown[] = [];
  for (let i = 0; i < 500; i++) {
    facts.push({ id: `bf${i}`, value: { factKey: `key_${i}`, statementHe: `עובדה ${i}`, suggestedStatus: "client_alleged" }, span: null, provenance: { ruleId: "bulk" } });
    approvedFacts.push({ itemId: `bf${i}` });
  }
  (d.structuredDraft as any).facts = facts;
  const c = context();
  (c.approvals as any).facts = approvedFacts;
  const res = run(d, referenceFacts(), c);
  assert.equal(res.valid, true);
  assert.equal(res.normalizedDraft!.normalizedFacts.length, 500);
});

/* ── Determinism, hashing, immutability ───────────────────────────────────── */

test("hash is identical for the same semantic draft regardless of approval order", () => {
  const c1 = context();
  const c2 = context();
  (c2.approvals as any).facts = [{ itemId: "f2" }, { itemId: "f1" }]; // reversed order
  const h1 = run(rawDraft(), referenceFacts(), c1).normalizedDraft!.sourceInputHash;
  const h2 = run(rawDraft(), referenceFacts(), c2).normalizedDraft!.sourceInputHash;
  assert.equal(h1, h2);
});

test("hash excludes validatedAt, correlationId, and actor id", () => {
  const c1 = context();
  const c2 = context();
  c2.validatedAt = "2030-01-01T00:00:00.000Z";
  c2.correlationId = "different";
  c2.actorProfileId = "someone-else";
  const h1 = run(rawDraft(), referenceFacts(), c1).normalizedDraft!.sourceInputHash;
  const h2 = run(rawDraft(), referenceFacts(), c2).normalizedDraft!.sourceInputHash;
  assert.equal(h1, h2);
});

test("different content produces a different hash", () => {
  const c2 = context();
  (c2.approvals as any).matter.titleHe = "כותרת אחרת לגמרי";
  const h1 = run().normalizedDraft!.sourceInputHash;
  const h2 = run(rawDraft(), referenceFacts(), c2).normalizedDraft!.sourceInputHash;
  assert.notEqual(h1, h2);
});

test("unicode normalization: composed vs decomposed Hebrew hash equal", () => {
  const c1 = context();
  const c2 = context();
  // Add a combining mark sequence that NFC should fold.
  (c1.approvals as any).matter.titleHe = "שָלום"; // decomposed-ish
  (c2.approvals as any).matter.titleHe = "שָלום".normalize("NFC");
  const h1 = run(rawDraft(), referenceFacts(), c1).normalizedDraft!.sourceInputHash;
  const h2 = run(rawDraft(), referenceFacts(), c2).normalizedDraft!.sourceInputHash;
  assert.equal(h1, h2);
});

test("whitespace is normalized in output text", () => {
  const c = context();
  (c.approvals as any).matter.titleHe = "  רונית   לוי  ";
  const nd = run(rawDraft(), referenceFacts(), c).normalizedDraft!;
  assert.equal(nd.normalizedMatter.titleHe, "רונית לוי");
});

test("output is deeply frozen (immutable)", () => {
  const nd = run().normalizedDraft!;
  assert.ok(Object.isFrozen(nd));
  assert.ok(Object.isFrozen(nd.normalizedParticipants));
  assert.ok(Object.isFrozen(nd.normalizedParticipants[0]));
  assert.ok(Object.isFrozen(nd.normalizedMatter));
  assert.ok(Object.isFrozen(nd.normalizedMetadata));
});

test("engine never mutates its inputs", () => {
  const d = rawDraft();
  const r = referenceFacts();
  const c = context();
  const snapshot = JSON.stringify([d, r, c]);
  run(clone(d), clone(r), clone(c));
  run(d, r, c);
  assert.equal(JSON.stringify([d, r, c]), snapshot);
});

test("re-running on identical input yields byte-identical normalized draft", () => {
  const a = run().normalizedDraft!;
  const b = run().normalizedDraft!;
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

/* ── Core invariant: valid=false ⇒ no normalizedDraft (always) ────────────── */

test("every failure mode leaves normalizedDraft undefined", () => {
  const failing: Array<() => ReturnType<typeof run>> = [
    () => { const d = rawDraft(); d.status = "rejected"; return run(d); },
    () => { const c = context(); (c.approvals as any).participants = []; return run(rawDraft(), referenceFacts(), c); },
    () => { const d = rawDraft(); (d as any).structuredDraft = 5; return run(d); },
    () => { const d = rawDraft(); d.schemaVersion = "x"; return run(d); },
  ];
  for (const f of failing) {
    const res = f();
    assert.equal(res.valid, false);
    assert.equal(res.normalizedDraft, undefined);
  }
});

test("issue-code taxonomy is frozen and unique", () => {
  assert.equal(new Set(BOOTSTRAP_ISSUE_CODES).size, BOOTSTRAP_ISSUE_CODES.length);
  assert.ok(BOOTSTRAP_ISSUE_CODES.includes("INVALID_EPISTEMIC_STATE"));
});

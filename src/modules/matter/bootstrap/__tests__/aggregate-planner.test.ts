/**
 * Capability 1 · Slice 1.0.2 — Matter Aggregate Planner: comprehensive matrix.
 *
 * Pure tests (no DB, no clock). The input is always a REAL ValidatedBootstrapDraft
 * produced by the 1.0.1 engine, so "malformed validated draft" is impossible by
 * construction. Covers: minimal/large aggregate, ordering, classification, dedup,
 * plan-local ids, metadata, plan hash + full determinism, deep freeze, no
 * mutation, epistemic preservation, the no-operations rule, and version refusal.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { validateBootstrapDraft } from "../validate.ts";
import { planMatterAggregate } from "../plan-matter-aggregate.ts";
import {
  AggregatePlanningError,
  MATTER_AGGREGATE_PLANNER_VERSION,
  MATTER_AGGREGATE_VERSION,
} from "../aggregate-contracts.ts";
import type { ValidatedBootstrapDraft } from "../contracts.ts";
import type { MatterAggregatePlan } from "../aggregate-contracts.ts";
import { rawDraft, referenceFacts, context, clone, type DeepWritable } from "./fixtures.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Draft = DeepWritable<ReturnType<typeof rawDraft>>;
type Ref = DeepWritable<ReturnType<typeof referenceFacts>>;
type Ctx = DeepWritable<ReturnType<typeof context>>;

/** Produce a guaranteed-valid ValidatedBootstrapDraft (optionally mutated). */
function validated(mut?: (d: Draft, r: Ref, c: Ctx) => void): ValidatedBootstrapDraft {
  const d = rawDraft();
  const r = referenceFacts();
  const c = context();
  if (mut) mut(d as any, r as any, c as any);
  const res = validateBootstrapDraft(d, r, c);
  assert.equal(res.valid, true, JSON.stringify(res.blockingIssues));
  return res.normalizedDraft!;
}

function allKeys(plan: MatterAggregatePlan): string[] {
  return [
    ...plan.members.map((m) => m.memberKey),
    ...plan.participants.map((p) => p.participantKey),
    ...plan.contacts.map((c) => c.contactKey),
    ...plan.facts.map((f) => f.factPlanKey),
    ...plan.deadlines.map((d) => d.deadlineKey),
    ...plan.evidence.map((e) => e.evidenceKey),
    plan.audit.auditKey,
  ];
}

/* ── Minimal aggregate ────────────────────────────────────────────────────── */

test("minimal validated draft → one declarative aggregate", () => {
  const plan = planMatterAggregate(validated());
  assert.equal(plan.matter.legalDomain, "labor");
  assert.equal(plan.matter.statusIntent, "open");
  assert.equal(plan.members.length, 1);
  assert.equal(plan.participants.length, 1);
  assert.equal(plan.contacts.length, 1);
  assert.equal(plan.facts.length, 2);
  assert.equal(plan.deadlines.length, 1);
  assert.equal(plan.evidence.length, 1);
  assert.equal(plan.evidence[0].status, "required");
});

test("aggregate contains NO executable operation surfaces", () => {
  const plan = planMatterAggregate(validated()) as any;
  for (const k of ["operations", "commands", "tasks", "execute", "ops"]) {
    assert.equal(k in plan, false, `plan must not expose ${k}`);
  }
});

/* ── Members: symbolic owner, no authorization, no profile id ──────────────── */

test("member is a symbolic owner slot bound to the confirming actor", () => {
  const m = planMatterAggregate(validated()).members[0];
  assert.equal(m.slot, "owner");
  assert.equal(m.matterRole, null);
  assert.equal(m.bindProfileTo, "confirming_actor");
  assert.equal(m.canApprove, true);
  // No profile/db id leaked anywhere on the member.
  assert.equal(JSON.stringify(m).includes("11111111"), false);
});

/* ── Contacts: classification + ordering + dedup ──────────────────────────── */

test("unlinked contact is classified create_new; linked is link_existing", () => {
  const createPlan = planMatterAggregate(validated());
  assert.equal(createPlan.contacts[0].classification, "create_new");
  assert.equal(createPlan.contacts[0].contactId, null);

  const linkPlan = planMatterAggregate(
    validated((_d, _r, c) => {
      (c.approvals as any).participants = [{ itemId: "c1", role: "client", linkToContactId: "existing-contact-1" }];
    }),
  );
  assert.equal(linkPlan.contacts[0].classification, "link_existing");
  assert.equal(linkPlan.contacts[0].contactId, "existing-contact-1");
});

test("two participants linking the same contact dedupe to one contact", () => {
  const plan = planMatterAggregate(
    validated((_d, _r, c) => {
      (c.approvals as any).participants = [
        { itemId: "c1", role: "client", linkToContactId: "existing-contact-1" },
        { itemId: "c2", role: "opposing_party", linkToContactId: "existing-contact-1" },
      ];
    }),
  );
  assert.equal(plan.participants.length, 2);
  assert.equal(plan.contacts.length, 1);
  assert.deepEqual([...plan.contacts[0].sourceItemIds].sort(), ["c1", "c2"]);
});

/* ── Participants: client-first ordering, contact linkage ─────────────────── */

test("participants are ordered client-first and reference a contactKey", () => {
  const plan = planMatterAggregate(
    validated((_d, _r, c) => {
      (c.approvals as any).participants = [
        { itemId: "c2", role: "opposing_party" },
        { itemId: "c1", role: "client" },
      ];
    }),
  );
  assert.equal(plan.participants[0].role, "client");
  const contactKeys = new Set(plan.contacts.map((c) => c.contactKey));
  for (const p of plan.participants) assert.ok(contactKeys.has(p.contactKey));
});

/* ── Facts: epistemic state preserved exactly + ordering ──────────────────── */

test("fact epistemic status is preserved exactly (never upgraded)", () => {
  const vd = validated();
  const plan = planMatterAggregate(vd);
  for (const f of plan.facts) {
    assert.ok(["client_alleged", "opposing_alleged", "disputed", "unknown"].includes(f.status));
  }
  // ordered by factKey (dismissal_date < employment_duration)
  assert.deepEqual(plan.facts.map((f) => f.factKey), ["dismissal_date", "employment_duration"]);
});

/* ── Deadlines: verbatim, ordered ─────────────────────────────────────────── */

test("deadlines are mapped verbatim with no statutory calculation", () => {
  const plan = planMatterAggregate(validated());
  assert.equal(plan.deadlines[0].labelHe, "הגשת כתב תביעה");
  assert.equal(plan.deadlines[0].source, "statute");
  assert.equal(plan.deadlines[0].confidence, "known");
  assert.match(plan.deadlines[0].dueAt!, /^2026-08-01/);
});

/* ── Plan-local ids ───────────────────────────────────────────────────────── */

test("plan-local ids are deterministic, prefixed, and unique within the aggregate", () => {
  const plan = planMatterAggregate(validated());
  const keys = allKeys(plan);
  assert.equal(new Set(keys).size, keys.length, "no key collisions");
  assert.ok(plan.members[0].memberKey.startsWith("member_"));
  assert.ok(plan.participants[0].participantKey.startsWith("participant_"));
  assert.ok(plan.contacts[0].contactKey.startsWith("contact_"));
  assert.ok(plan.facts[0].factPlanKey.startsWith("fact_"));
  assert.ok(plan.deadlines[0].deadlineKey.startsWith("deadline_"));
  assert.ok(plan.evidence[0].evidenceKey.startsWith("evidence_"));
  assert.ok(plan.audit.auditKey.startsWith("audit_"));
  // No timestamp/uuid material: keys are hex-suffixed content hashes.
  for (const k of keys) assert.match(k, /^[a-z]+_[0-9a-f]{16}$/);
});

/* ── Metadata ─────────────────────────────────────────────────────────────── */

test("metadata carries all required version + hash + stats fields", () => {
  const vd = validated();
  const plan = planMatterAggregate(vd);
  const m = plan.metadata;
  assert.equal(m.aggregateVersion, MATTER_AGGREGATE_VERSION);
  assert.equal(m.plannerVersion, MATTER_AGGREGATE_PLANNER_VERSION);
  assert.equal(m.validationVersion, vd.validationVersion);
  assert.equal(m.sourceDraftVersion, vd.sourceDraftVersionToken);
  assert.equal(m.sourceInputHash, vd.sourceInputHash);
  assert.match(m.planHash, /^[0-9a-f]{64}$/);
  assert.equal(m.planningDurationMs, null);
  assert.deepEqual(m.statistics, {
    members: 1,
    participants: 1,
    contacts: 1,
    facts: 2,
    deadlines: 1,
    evidence: 1,
  });
});

/* ── Determinism + hashing ────────────────────────────────────────────────── */

test("same validated draft → byte-identical aggregate", () => {
  const vd = validated();
  const a = planMatterAggregate(vd);
  const b = planMatterAggregate(vd);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(a.metadata.planHash, b.metadata.planHash);
});

test("two independently validated identical drafts → identical planHash", () => {
  const a = planMatterAggregate(validated());
  const b = planMatterAggregate(validated());
  assert.equal(a.metadata.planHash, b.metadata.planHash);
});

test("different content → different planHash", () => {
  const a = planMatterAggregate(validated());
  const b = planMatterAggregate(
    validated((_d, _r, c) => {
      (c.approvals as any).matter.titleHe = "כותרת אחרת";
    }),
  );
  assert.notEqual(a.metadata.planHash, b.metadata.planHash);
});

test("planHash is stable regardless of approval input order", () => {
  const a = planMatterAggregate(
    validated((_d, _r, c) => {
      (c.approvals as any).facts = [{ itemId: "f1" }, { itemId: "f2" }];
    }),
  );
  const b = planMatterAggregate(
    validated((_d, _r, c) => {
      (c.approvals as any).facts = [{ itemId: "f2" }, { itemId: "f1" }];
    }),
  );
  assert.equal(a.metadata.planHash, b.metadata.planHash);
});

/* ── Immutability + no mutation ───────────────────────────────────────────── */

test("aggregate is deeply frozen", () => {
  const plan = planMatterAggregate(validated());
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.matter));
  assert.ok(Object.isFrozen(plan.members));
  assert.ok(Object.isFrozen(plan.members[0]));
  assert.ok(Object.isFrozen(plan.participants));
  assert.ok(Object.isFrozen(plan.participants[0]));
  assert.ok(Object.isFrozen(plan.participants[0].provenance));
  assert.ok(Object.isFrozen(plan.contacts[0]));
  assert.ok(Object.isFrozen(plan.facts[0]));
  assert.ok(Object.isFrozen(plan.deadlines[0]));
  assert.ok(Object.isFrozen(plan.evidence[0]));
  assert.ok(Object.isFrozen(plan.audit));
  assert.ok(Object.isFrozen(plan.metadata));
  assert.ok(Object.isFrozen(plan.metadata.statistics));
});

test("planner never mutates its input", () => {
  const vd = validated();
  const snapshot = JSON.stringify(vd);
  planMatterAggregate(clone(vd));
  planMatterAggregate(vd);
  assert.equal(JSON.stringify(vd), snapshot);
});

/* ── Large aggregate ──────────────────────────────────────────────────────── */

test("large validated draft plans deterministically", () => {
  const vd = validated((d, _r, c) => {
    const facts: unknown[] = [];
    const approvedFacts: unknown[] = [];
    for (let i = 0; i < 400; i++) {
      facts.push({ id: `bf${i}`, value: { factKey: `key_${String(i).padStart(4, "0")}`, statementHe: `עובדה ${i}`, suggestedStatus: "client_alleged" }, span: null, provenance: { ruleId: "bulk" } });
      approvedFacts.push({ itemId: `bf${i}` });
    }
    (d.structuredDraft as any).facts = facts;
    (c.approvals as any).facts = approvedFacts;
  });
  const a = planMatterAggregate(vd);
  const b = planMatterAggregate(vd);
  assert.equal(a.facts.length, 400);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  // ordering preserved (sorted by factKey)
  assert.equal(a.facts[0].factKey, "key_0000");
  assert.equal(a.facts[399].factKey, "key_0399");
});

/* ── Version compatibility (fail closed) ──────────────────────────────────── */

test("planner refuses an incompatible validation version", () => {
  const vd = validated();
  const tampered = { ...vd, validationVersion: "bootstrap-validation-v2" } as ValidatedBootstrapDraft;
  assert.throws(() => planMatterAggregate(tampered), AggregatePlanningError);
});

test("planner accepts the supported validation version", () => {
  const vd = validated();
  assert.equal(vd.validationVersion, "bootstrap-validation-v1");
  assert.doesNotThrow(() => planMatterAggregate(vd));
});

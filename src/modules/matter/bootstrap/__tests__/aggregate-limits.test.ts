import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBootstrapDraft } from "../validate.ts";
import { BOOTSTRAP_AGGREGATE_LIMITS } from "../aggregate-limits.ts";
import { rawDraft, referenceFacts, context, clone } from "./fixtures.ts";

const L = BOOTSTRAP_AGGREGATE_LIMITS;

function run(mutate: (d: ReturnType<typeof rawDraft>, c: ReturnType<typeof context>) => void) {
  const d = rawDraft();
  const c = context();
  mutate(d, c);
  return validateBootstrapDraft(d, referenceFacts(), c);
}

function codes(r: ReturnType<typeof validateBootstrapDraft>): string[] {
  return r.blockingIssues.map((i) => i.stableCode);
}

function fill<T>(template: T, n: number, withId: (t: T, i: number) => T): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i += 1) out.push(withId(clone(template), i));
  return out;
}

/* ---- contacts ---- */
test("10 contacts limit+1 blocks with TOO_MANY_CONTACTS; no plan", () => {
  const sd = rawDraft().structuredDraft as { contacts: unknown[] };
  const r = run((d) => {
    (d.structuredDraft as { contacts: unknown[] }).contacts = fill(sd.contacts[0], L.contacts + 1, (t, i) => ({ ...(t as object), id: `cc${i}` }) as unknown);
  });
  assert.ok(codes(r).includes("TOO_MANY_CONTACTS"));
  assert.equal(r.valid, false);
  assert.equal(r.normalizedDraft, undefined);
});
test("9 contacts at limit does not fire TOO_MANY_CONTACTS", () => {
  const sd = rawDraft().structuredDraft as { contacts: unknown[] };
  const r = run((d) => {
    (d.structuredDraft as { contacts: unknown[] }).contacts = fill(sd.contacts[0], L.contacts, (t, i) => ({ ...(t as object), id: `cc${i}` }) as unknown);
  });
  assert.equal(codes(r).includes("TOO_MANY_CONTACTS"), false);
});

/* ---- participants ---- */
test("12 participants limit+1 blocks with TOO_MANY_PARTICIPANTS", () => {
  const r = run((_d, c) => {
    (c.approvals as { participants: unknown[] }).participants = fill({ itemId: "c1", role: "client" }, L.participants + 1, (t) => ({ ...t }));
  });
  assert.ok(codes(r).includes("TOO_MANY_PARTICIPANTS"));
  assert.equal(r.valid, false);
});
test("11 participants at limit does not fire TOO_MANY_PARTICIPANTS", () => {
  const r = run((_d, c) => {
    (c.approvals as { participants: unknown[] }).participants = fill({ itemId: "c1", role: "client" }, L.participants, (t) => ({ ...t }));
  });
  assert.equal(codes(r).includes("TOO_MANY_PARTICIPANTS"), false);
});

/* ---- facts ---- */
test("14 facts limit+1 blocks with TOO_MANY_FACTS", () => {
  const sd = rawDraft().structuredDraft as { facts: unknown[] };
  const r = run((d) => {
    (d.structuredDraft as { facts: unknown[] }).facts = fill(sd.facts[0], L.facts + 1, (t, i) => ({ ...(t as object), id: `ff${i}` }) as unknown);
  });
  assert.ok(codes(r).includes("TOO_MANY_FACTS"));
});
test("13 facts at limit does not fire TOO_MANY_FACTS", () => {
  const sd = rawDraft().structuredDraft as { facts: unknown[] };
  const r = run((d) => {
    (d.structuredDraft as { facts: unknown[] }).facts = fill(sd.facts[0], L.facts, (t, i) => ({ ...(t as object), id: `ff${i}` }) as unknown);
  });
  assert.equal(codes(r).includes("TOO_MANY_FACTS"), false);
});

/* ---- deadlines ---- */
test("16 deadlines limit+1 blocks with TOO_MANY_DEADLINES", () => {
  const sd = rawDraft().structuredDraft as { deadlines: unknown[] };
  const r = run((d) => {
    (d.structuredDraft as { deadlines: unknown[] }).deadlines = fill(sd.deadlines[0], L.deadlines + 1, (t, i) => ({ ...(t as object), id: `dd${i}` }) as unknown);
  });
  assert.ok(codes(r).includes("TOO_MANY_DEADLINES"));
});

/* ---- evidence ---- */
test("18 evidence limit+1 blocks with TOO_MANY_EVIDENCE_ITEMS", () => {
  const sd = rawDraft().structuredDraft as { evidenceRequirements: unknown[] };
  const r = run((d) => {
    (d.structuredDraft as { evidenceRequirements: unknown[] }).evidenceRequirements = fill(sd.evidenceRequirements[0], L.evidence + 1, (t, i) => ({ ...(t as object), id: `ee${i}` }) as unknown);
  });
  assert.ok(codes(r).includes("TOO_MANY_EVIDENCE_ITEMS"));
});

/* ---- combined / determinism / purity ---- */
test("20 multiple breaches return deterministic ordered issues (contacts before facts)", () => {
  const sd = rawDraft().structuredDraft as { contacts: unknown[]; facts: unknown[] };
  const build = (d: ReturnType<typeof rawDraft>) => {
    (d.structuredDraft as { contacts: unknown[] }).contacts = fill(sd.contacts[0], L.contacts + 1, (t, i) => ({ ...(t as object), id: `cc${i}` }) as unknown);
    (d.structuredDraft as { facts: unknown[] }).facts = fill(sd.facts[0], L.facts + 1, (t, i) => ({ ...(t as object), id: `ff${i}` }) as unknown);
  };
  const r1 = run(build);
  const c1 = codes(r1);
  assert.ok(c1.indexOf("TOO_MANY_CONTACTS") >= 0 && c1.indexOf("TOO_MANY_FACTS") >= 0);
  assert.ok(c1.indexOf("TOO_MANY_CONTACTS") < c1.indexOf("TOO_MANY_FACTS"));
  // 24 deterministic: identical run yields identical blocking-issue codes
  const r2 = run(build);
  assert.deepEqual(codes(r1), codes(r2));
});

test("21/22/23 over-limit → normalizedDraft absent; input not mutated; no truncation", () => {
  const sd = rawDraft().structuredDraft as { facts: unknown[] };
  const d = rawDraft();
  (d.structuredDraft as { facts: unknown[] }).facts = fill(sd.facts[0], L.facts + 5, (t, i) => ({ ...(t as object), id: `ff${i}` }) as unknown);
  const snapshot = clone(d);
  const r = validateBootstrapDraft(d, referenceFacts(), context());
  assert.equal(r.normalizedDraft, undefined);
  assert.deepEqual(d, snapshot); // input not mutated, not truncated
  assert.equal((d.structuredDraft as { facts: unknown[] }).facts.length, L.facts + 5);
});

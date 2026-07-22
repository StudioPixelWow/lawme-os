/** Slice 0.8.4 — authorized Matter list + room (tests 21–34). */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AuthDb } from "../../../identity/infrastructure/supabase-auth-client.ts";
import type { ActorContext } from "../../../identity";
import type { Capability } from "../../../identity/capabilities.ts";
import { createTestActorContext } from "../../../identity/test-support.ts";
import { loadReadableDurableMatters, loadAuthorizedMatterRoom } from "../authorized-matter-loader.ts";

const ORG = "00000000-0000-4000-8000-0000000000c1";
const ACTOR = "00000000-0000-4000-8000-0000000000a1";
const MATTER = "11111111-1111-4111-8111-111111111111";
const SLUG = "m-abc123";

type Resp = { data: unknown[] | null; error: unknown };
interface Flags { inCalled: boolean; tables: string[] }

/** Fake AuthDb with a per-table RESPONSE QUEUE (matters is queried repeatedly). */
function fakeDb(queues: Record<string, Resp[]>, flags: Flags): AuthDb {
  return {
    from(table: string) {
      flags.tables.push(table);
      const q = queues[table] ?? [];
      const response = q.shift() ?? { data: [], error: null };
      const b = {
        select() { return b; }, eq() { return b; }, is() { return b; }, limit() { return b; }, order() { return b; },
        in() { flags.inCalled = true; return b; },
        then(onF: (v: Resp) => unknown, onR?: (e: unknown) => unknown) { return Promise.resolve(response).then(onF, onR); },
      };
      return b;
    },
  } as unknown as AuthDb;
}

function actor(caps: Capability[] = ["matters.read"]): ActorContext {
  return createTestActorContext({ profileId: ACTOR, organizationId: ORG, capabilities: new Set(caps) });
}

const summaryRow = { id: MATTER, slug: SLUG, title_he: "תיק", procedure_type: "severance_claim", current_stage_id: "s1", status: "open", file_no_he: null, forum_he: null, opened_at: "2026-01-01" };
const fullMatterRow = { ...summaryRow, organization_id: ORG, assigned_owner_id: ACTOR, confidentiality: "internal", topic: "t", as_of: null };

test("21: owner sees the owned matter in the list", async () => {
  const flags: Flags = { inCalled: false, tables: [] };
  const db = fakeDb({ matters: [{ data: [{ id: MATTER }], error: null }, { data: [summaryRow], error: null }], matter_members: [{ data: [], error: null }] }, flags);
  const r = await loadReadableDurableMatters(db, actor());
  assert.equal(r.status, "success");
  assert.equal(r.status === "success" && r.matters.length, 1);
});

test("22: matter member sees the assigned matter in the list", async () => {
  const flags: Flags = { inCalled: false, tables: [] };
  const db = fakeDb({ matters: [{ data: [], error: null }, { data: [summaryRow], error: null }], matter_members: [{ data: [{ matter_id: MATTER }], error: null }] }, flags);
  const r = await loadReadableDurableMatters(db, actor());
  assert.ok(r.status === "success" && r.matters.some((m) => m.id === MATTER));
});

test("23/24/25: non-member / admin-without-access / cross-tenant see nothing (empty, no full-payload scan)", async () => {
  const flags: Flags = { inCalled: false, tables: [] };
  // no owned, no membership → ids empty → the summaries (.in) query never runs
  const db = fakeDb({ matters: [{ data: [], error: null }], matter_members: [{ data: [], error: null }] }, flags);
  const r = await loadReadableDurableMatters(db, actor(["matters.read", "administration.manage"]));
  assert.ok(r.status === "success" && r.matters.length === 0);
  assert.equal(flags.inCalled, false); // 26: never loads every org matter to filter in memory
});

test("26: the list is a bounded id set (.in), never a full org scan", async () => {
  const flags: Flags = { inCalled: false, tables: [] };
  const db = fakeDb({ matters: [{ data: [{ id: MATTER }], error: null }, { data: [summaryRow], error: null }], matter_members: [{ data: [], error: null }] }, flags);
  await loadReadableDurableMatters(db, actor());
  assert.equal(flags.inCalled, true); // summaries loaded via .in(id, candidateIds)
});

test("29: authorized owner loads the matter room (hydrated after authorization)", async () => {
  const flags: Flags = { inCalled: false, tables: [] };
  const db = fakeDb(
    { matters: [{ data: [fullMatterRow], error: null }, { data: [fullMatterRow], error: null }], matter_members: [{ data: [], error: null }], matter_evidence: [{ data: [], error: null }], matter_documents: [{ data: [], error: null }] },
    flags,
  );
  const r = await loadAuthorizedMatterRoom(db, actor(), MATTER, new Date(0).toISOString());
  assert.equal(r.ok, true);
  assert.ok(flags.tables.includes("matter_evidence")); // hydration happened (post-auth)
});

test("31: same-org non-member is denied the room (no hydration)", async () => {
  const flags: Flags = { inCalled: false, tables: [] };
  const noOwner = { ...fullMatterRow, assigned_owner_id: "someone-else" };
  const db = fakeDb({ matters: [{ data: [noOwner], error: null }], matter_members: [{ data: [], error: null }] }, flags);
  const r = await loadAuthorizedMatterRoom(db, actor(), MATTER, new Date(0).toISOString());
  assert.equal(r.ok, false);
  assert.ok(!flags.tables.includes("matter_evidence")); // 34: hydration only after authorization
});

test("32: privileged matter denied without explicit access", async () => {
  const flags: Flags = { inCalled: false, tables: [] };
  const priv = { ...fullMatterRow, assigned_owner_id: "someone-else", confidentiality: "privileged" };
  const db = fakeDb({ matters: [{ data: [priv], error: null }], matter_members: [{ data: [], error: null }] }, flags);
  const r = await loadAuthorizedMatterRoom(db, actor(), MATTER, new Date(0).toISOString());
  assert.equal(r.ok, false);
});

test("33: tenant mismatch / absent matter externally looks unavailable", async () => {
  const flags: Flags = { inCalled: false, tables: [] };
  const db = fakeDb({ matters: [{ data: [], error: null }] }, flags); // org-scoped query finds nothing
  const r = await loadAuthorizedMatterRoom(db, actor(), MATTER, new Date(0).toISOString());
  assert.equal(r.ok, false);
  assert.ok(!flags.tables.includes("matter_evidence"));
});

test("demo room fixture is available to any authenticated actor without a DB read", async () => {
  const flags: Flags = { inCalled: false, tables: [] };
  const db = fakeDb({}, flags);
  const r = await loadAuthorizedMatterRoom(db, actor(), "demo", new Date(0).toISOString());
  assert.equal(r.ok, true);
  assert.equal(flags.tables.length, 0); // fixture, no query
});

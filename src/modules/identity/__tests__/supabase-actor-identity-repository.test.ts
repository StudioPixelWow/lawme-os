/** Slice 0.8.2 — production repository adapter (tests 1–6). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSupabaseActorIdentityRepository } from "../infrastructure/supabase-actor-identity-repository.ts";
import type { AuthDb } from "../infrastructure/supabase-auth-client.ts";

/** Minimal fake of the authenticated Supabase client's query surface. */
function fakeDb(seed: { profiles?: Record<string, unknown>[]; memberships?: Record<string, unknown>[] }): AuthDb {
  const builder = (rows: Record<string, unknown>[]) => {
    let filtered = [...rows];
    const api: Record<string, unknown> = {
      select: () => api,
      eq: (col: string, val: unknown) => { filtered = filtered.filter((r) => r[col] === val); return api; },
      maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
      then: (resolve: (r: { data: unknown; error: null }) => void) => resolve({ data: filtered, error: null }),
    };
    return api;
  };
  return { from: (t: string) => builder(t === "profiles" ? (seed.profiles ?? []) : (seed.memberships ?? [])) } as unknown as AuthDb;
}

const P = "00000000-0000-4000-8000-0000000000a1";
const O = "00000000-0000-4000-8000-0000000000c1";
const mem = (over: Record<string, unknown> = {}) => ({ id: "m1", organization_id: O, profile_id: P, role: "lawyer", status: "active", created_at: "2026-01-01", ...over });

test("Repo1: profile lookup maps to the identity contract", async () => {
  const repo = createSupabaseActorIdentityRepository(fakeDb({ profiles: [{ id: P, display_name: "x" }] }));
  assert.deepEqual(await repo.findProfileByAuthUserId(P), { profileId: P, authUserId: P });
});

test("Repo2: missing profile returns null", async () => {
  const repo = createSupabaseActorIdentityRepository(fakeDb({ profiles: [] }));
  assert.equal(await repo.findProfileByAuthUserId(P), null);
});

test("Repo3: membership rows map correctly", async () => {
  const repo = createSupabaseActorIdentityRepository(fakeDb({ memberships: [mem()] }));
  const list = await repo.listActiveMemberships(P);
  assert.equal(list.length, 1);
  assert.deepEqual(list[0], { membershipId: "m1", organizationId: O, profileId: P, role: "lawyer", status: "active" });
});

test("Repo4: suspended/invited memberships are not returned as active", async () => {
  const repo = createSupabaseActorIdentityRepository(fakeDb({ memberships: [mem({ status: "suspended" }), mem({ id: "m2", status: "invited" })] }));
  assert.equal((await repo.listActiveMemberships(P)).length, 0);
  assert.equal(await repo.findActiveMembership(P, O), null);
  // findMembership returns the row regardless of status (for inactive detection)
  const any = await repo.findMembership(P, O);
  assert.equal(any?.status, "suspended");
});

test("Repo5: malformed rows fail closed (dropped)", async () => {
  const repo = createSupabaseActorIdentityRepository(fakeDb({ memberships: [mem({ role: 123 }), mem({ id: "m2", organization_id: null })] }));
  assert.equal((await repo.listActiveMemberships(P)).length, 0);
});

test("Repo6: raw DB rows do not leak through the interface", async () => {
  const repo = createSupabaseActorIdentityRepository(fakeDb({ memberships: [mem({ created_at: "leak", secret: "x" })] }));
  const m = (await repo.listActiveMemberships(P))[0];
  assert.deepEqual(Object.keys(m).sort(), ["membershipId", "organizationId", "profileId", "role", "status"]);
  assert.ok(!("created_at" in m) && !("secret" in m));
});

/** Slice 0.8.2 — active-organization cookie primitives (tests 23, 46). */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_ORG_COOKIE, readActiveOrganizationId, writeActiveOrganizationId, clearActiveOrganization,
  isPlausibleOrganizationId, activeOrganizationCookieOptions, type ActiveOrgCookieStore,
} from "../infrastructure/active-organization-cookie.ts";

function memoryStore(initial?: { name: string; value: string }): { store: ActiveOrgCookieStore; calls: unknown[] } {
  const jar = new Map<string, string>();
  if (initial) jar.set(initial.name, initial.value);
  const calls: unknown[] = [];
  const store: ActiveOrgCookieStore = {
    get: (name) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
    set: (name, value, options) => { jar.set(name, value); calls.push({ name, value, options }); },
    delete: (name) => { jar.delete(name); calls.push({ deleted: name }); },
  };
  return { store, calls };
}

const ORG = "00000000-0000-4000-8000-0000000000c1";

test("Cookie: read returns a valid org id, undefined for missing/invalid", () => {
  assert.equal(readActiveOrganizationId(memoryStore({ name: ACTIVE_ORG_COOKIE, value: ORG }).store), ORG);
  assert.equal(readActiveOrganizationId(memoryStore().store), undefined);
  assert.equal(readActiveOrganizationId(memoryStore({ name: ACTIVE_ORG_COOKIE, value: "bad value; drop" }).store), undefined);
});

test("Cookie: isPlausibleOrganizationId rejects junk", () => {
  assert.equal(isPlausibleOrganizationId(ORG), true);
  assert.equal(isPlausibleOrganizationId("has space"), false);
  assert.equal(isPlausibleOrganizationId("a;b"), false);
  assert.equal(isPlausibleOrganizationId(""), false);
  assert.equal(isPlausibleOrganizationId(123), false);
});

test("Cookie 23: write uses safe attributes and stores ONLY the org id (no actor/role/caps)", () => {
  const { store, calls } = memoryStore();
  writeActiveOrganizationId(store, ORG);
  const call = calls[0] as { name: string; value: string; options: Record<string, unknown> };
  assert.equal(call.name, ACTIVE_ORG_COOKIE);
  assert.equal(call.value, ORG); // value is exactly the org id — nothing else encoded
  assert.equal(call.options.httpOnly, true);
  assert.equal(call.options.sameSite, "lax");
  assert.equal(call.options.path, "/");
  assert.ok(typeof call.options.maxAge === "number" && (call.options.maxAge as number) > 0);
  // no capability/role/actor data anywhere in the serialized cookie
  const serialized = JSON.stringify(call).toLowerCase();
  for (const bad of ["role", "capab", "profile", "member", "token"]) assert.ok(!serialized.includes(bad), `leaked ${bad}`);
});

test("Cookie 46: options.secure follows environment", () => {
  const opts = activeOrganizationCookieOptions();
  assert.equal(opts.secure, process.env.NODE_ENV !== "development");
});

test("Cookie: clear removes the selection", () => {
  const { store, calls } = memoryStore({ name: ACTIVE_ORG_COOKIE, value: ORG });
  clearActiveOrganization(store);
  assert.equal(readActiveOrganizationId(store), undefined);
  assert.deepEqual(calls[0], { deleted: ACTIVE_ORG_COOKIE });
});

test("Cookie: write rejects an implausible org id", () => {
  assert.throws(() => writeActiveOrganizationId(memoryStore().store, "bad; value"));
});

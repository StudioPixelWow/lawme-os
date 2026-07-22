/**
 * Slice 0.8.2 — protected route integration invariants (tests 37–44).
 *
 * These are STATIC guards on the migrated runtime paths. They enforce the
 * founder invariant "no demo organization fallback is allowed in protected
 * runtime paths" and "service-role possession is not authorization": the intake
 * analyze route and the matter list path must derive the tenant from the
 * server-resolved ActorContext, never from DEMO_SEED, and must not use the
 * service client to infer identity. Source-level assertions (no live Supabase).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dirname, "../../../");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const INTAKE_ROUTE = "app/api/matters/intake/analyze/route.ts";
const MATTERS_PAGE = "app/(os)/matters/page.tsx";
const MATTER_LOADER = "modules/matter/view/matter-loader.ts";
const AUTHZ_LOADER = "modules/matter/view/authorized-matter-loader.ts";
const MATTER_ROOM_PAGE = "app/(os)/matters/[id]/page.tsx";

test("37: intake analyze route resolves the ActorContext server-side", () => {
  const src = read(INTAKE_ROUTE);
  assert.ok(src.includes("getServerActorContext"), "must resolve the server ActorContext");
  assert.ok(src.includes("actor.organization.id"), "must use the real active-org id");
});

test("38: intake analyze route no longer references the demo tenant", () => {
  const src = read(INTAKE_ROUTE);
  assert.ok(!src.includes("DEMO_SEED"), "must not reference DEMO_SEED");
  assert.ok(!/demo-seed/.test(src), "must not import demo-seed");
});

test("39: intake analyze route does not use the service client to infer identity", () => {
  const src = read(INTAKE_ROUTE);
  assert.ok(!src.includes("serviceClient"), "must not use serviceClient for identity");
  assert.ok(!src.includes("service_role"), "must not reference service_role");
});

test("40: intake analyze route fails closed via the safe API envelope", () => {
  const src = read(INTAKE_ROUTE);
  assert.ok(src.includes("toSafeApiError"), "auth failure must map to the safe envelope");
});

test("41: matters page reads via the authenticated client + authorized loader, not the demo org", () => {
  const src = read(MATTERS_PAGE);
  assert.ok(src.includes("tryGetServerActorContext"), "must resolve the server ActorContext");
  assert.ok(src.includes("getServerAuthClient"), "must obtain the authenticated (RLS) client");
  assert.ok(src.includes("loadReadableDurableMatters"), "must load only owner/member-readable matters");
  assert.ok(!src.includes("DEMO_SEED"), "must not reference DEMO_SEED");
});

test("42: matters page fails closed instead of falling back to a demo tenant", () => {
  const src = read(MATTERS_PAGE);
  assert.ok(src.includes("protectedBoundaryRedirect") || src.includes("redirect("),
    "must redirect on identity failure");
});

/** Strip block + line comments so doc prose that mentions a banned token
 *  (e.g. "never serviceClient()") does not trip a source scan. */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//"))
    .join("\n");
}

test("43: the authorized matter loader uses the authenticated client + policy, never serviceClient/DEMO_SEED", () => {
  const src = read(AUTHZ_LOADER);
  assert.ok(src.includes("createReadableMatterIndex"), "list must use the owner/member readable index");
  assert.ok(src.includes("createResourceAuthorizationService"), "room must authorize via the policy service");
  const code = codeOnly(src);
  assert.ok(!/serviceClient/.test(code), "must not use the service-role client");
  assert.ok(!/DEMO_SEED/.test(code), "must not reference DEMO_SEED");
  // the pure list helper module must also be free of serviceClient/DEMO_SEED now
  const loader = codeOnly(read(MATTER_LOADER));
  assert.ok(!/serviceClient/.test(loader) && !/DEMO_SEED/.test(loader), "matter-loader must be pure");
});

test("43b: matter room page hydrates only via the authorized loader (no service client)", () => {
  const src = read(MATTER_ROOM_PAGE);
  assert.ok(src.includes("loadAuthorizedMatterRoom"), "room must load through the authorized loader");
  assert.ok(!src.includes("loadMatterForRoom"), "the old service-role room loader is gone");
});

test("44: the migrated files carry no plaintext secrets or service-role env reads", () => {
  for (const rel of [INTAKE_ROUTE, MATTERS_PAGE, AUTHZ_LOADER, MATTER_ROOM_PAGE]) {
    const src = read(rel);
    assert.ok(!/SUPABASE_SERVICE_ROLE/.test(src), `${rel} reads a service-role secret`);
    assert.ok(!/eyJ[A-Za-z0-9._-]{10,}/.test(src), `${rel} contains a hardcoded JWT-like token`);
  }
});

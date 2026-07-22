/** Slice 0.8.4 — orchestration service (tests 15–20, 55, 59). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AuthDb } from "../../infrastructure/supabase-auth-client.ts";
import type { ActorContext } from "../../actor-context.ts";
import type { Capability } from "../../capabilities.ts";
import { createTestActorContext } from "../../test-support.ts";
import { createResourceAuthorizationService } from "../authorize-resource-request.ts";

const ORG = "00000000-0000-4000-8000-0000000000c1";
const ACTOR = "00000000-0000-4000-8000-0000000000a1";
const MATTER = "11111111-1111-4111-8111-111111111111";

type TableResponse = { data: unknown[] | null; error: unknown };
function fakeDb(byTable: Record<string, TableResponse>, tablesSeen: string[]): AuthDb {
  function builder(table: string): PromiseLike<TableResponse> & Record<string, unknown> {
    const response = byTable[table] ?? { data: [], error: null };
    const b = {
      select() { return b; },
      eq() { return b; },
      is() { return b; },
      limit() { return b; },
      order() { return b; },
      then(onF: (v: TableResponse) => unknown, onR?: (e: unknown) => unknown) { return Promise.resolve(response).then(onF, onR); },
    };
    return b as PromiseLike<TableResponse> & Record<string, unknown>;
  }
  return { from(table: string) { tablesSeen.push(table); return builder(table); } } as unknown as AuthDb;
}

function actor(caps: Capability[]): ActorContext {
  return createTestActorContext({ profileId: ACTOR, organizationId: ORG, capabilities: new Set(caps), correlationId: "00000000-0000-4000-8000-0000000000f0" });
}

const ownedMatter = { matters: { data: [{ id: MATTER, organization_id: ORG, assigned_owner_id: ACTOR, confidentiality: "internal", status: "open" }], error: null }, matter_members: { data: [], error: null } };

test("15: the correct loader/table is selected for each resource type", async () => {
  const cases: Array<[string, () => Promise<unknown>, string]> = [];
  const mk = (byTable: Record<string, TableResponse>) => { const seen: string[] = []; return { svc: createResourceAuthorizationService(fakeDb(byTable, seen)), seen }; };

  let t = mk(ownedMatter);
  await t.svc.authorizeResourceRequest(actor(["matters.read"]), { resourceType: "matter", action: "matter.read", matterIdOrSlug: MATTER });
  assert.ok(t.seen.includes("matters"));

  t = mk({ matter_intake_drafts: { data: [{ id: "d1", organization_id: ORG, created_by: ACTOR, reviewer_ids: [], status: "active" }], error: null } });
  await t.svc.authorizeResourceRequest(actor(["intake.read"]), { resourceType: "intake_draft", action: "intake.read", draftId: "d1" });
  assert.ok(t.seen.includes("matter_intake_drafts"));

  t = mk({ contacts: { data: [{ id: "c1", organization_id: ORG }], error: null } });
  await t.svc.authorizeResourceRequest(actor(["contacts.read"]), { resourceType: "contact", action: "contact.read", contactId: "c1" });
  assert.ok(t.seen.includes("contacts"));

  void cases;
});

test("16: loaded facts invoke the canonical policy (owner+capability → authorized)", async () => {
  const seen: string[] = [];
  const svc = createResourceAuthorizationService(fakeDb(ownedMatter, seen));
  const d = await svc.authorizeResourceRequest(actor(["matters.read"]), { resourceType: "matter", action: "matter.read", matterIdOrSlug: MATTER });
  assert.equal(d.allowed, true);
  assert.equal(d.code, "RESOURCE_AUTHORIZED");
});

test("17/55: null facts produce a uniform safe denial (absent == cross-tenant)", async () => {
  const seen: string[] = [];
  const svc = createResourceAuthorizationService(fakeDb({ matters: { data: [], error: null } }, seen));
  const d = await svc.authorizeResourceRequest(actor(["matters.read"]), { resourceType: "matter", action: "matter.read", matterIdOrSlug: MATTER });
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_TENANT_MISMATCH"); // → rendered as not-available
});

test("18: the decision correlation id matches the ActorContext", async () => {
  const seen: string[] = [];
  const svc = createResourceAuthorizationService(fakeDb(ownedMatter, seen));
  const a = actor(["matters.read"]);
  const d = await svc.authorizeResourceRequest(a, { resourceType: "matter", action: "matter.read", matterIdOrSlug: MATTER });
  assert.equal(d.correlationId, a.request.correlationId);
});

test("19: the orchestrator contains NO policy branches (no role/owner/confidentiality logic)", () => {
  const src = readFileSync(join(import.meta.dirname, "..", "authorize-resource-request.ts"), "utf8");
  // strip comments so documentation prose doesn't trip the scan
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//")).join("\n");
  for (const forbidden of [/\brole\s*===/, /\.canApprove\b/, /\.canReview\b/, /confidentiality\s*===/, /=== *"owner"/, /isOwner\b/, /is_org_admin/]) {
    assert.ok(!forbidden.test(code), `orchestrator has a policy branch: ${forbidden}`);
  }
});

test("20: decisions are exactly what the pure policy returns (system/service denial inherited)", async () => {
  // A member without the capability → the policy's RESOURCE_CAPABILITY_DENIED flows through unchanged.
  const seen: string[] = [];
  const svc = createResourceAuthorizationService(fakeDb(ownedMatter, seen));
  const d = await svc.authorizeResourceRequest(actor([]), { resourceType: "matter", action: "matter.read", matterIdOrSlug: MATTER });
  assert.equal(d.code, "RESOURCE_CAPABILITY_DENIED");
});

test("59: org scoping comes from the trusted ActorContext, not the request", async () => {
  // The fake records eq() filters; assert organization_id filter equals the actor's org.
  const eqs: Array<[string, unknown]> = [];
  const db = {
    from() {
      const b = {
        select() { return b; }, is() { return b; }, limit() { return b; }, order() { return b; },
        eq(c: string, v: unknown) { eqs.push([c, v]); return b; },
        then(onF: (v: TableResponse) => unknown) { return Promise.resolve({ data: [], error: null }).then(onF); },
      };
      return b;
    },
  } as unknown as AuthDb;
  const svc = createResourceAuthorizationService(db);
  await svc.authorizeResourceRequest(actor(["matters.read"]), { resourceType: "matter", action: "matter.read", matterIdOrSlug: MATTER });
  assert.ok(eqs.some(([c, v]) => c === "organization_id" && v === ORG));
});

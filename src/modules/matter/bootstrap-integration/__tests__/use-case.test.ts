import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmIntakeDraftAndBootstrapMatter, type ConfirmIntakeDraftDependencies } from "../use-case.ts";
import { AggregatePlanningError } from "../../bootstrap/index.ts";
import {
  ACTOR_ID,
  CORRELATION_ID,
  DRAFT_ID,
  MATTER_ID,
  makeActor,
  makeAuthzService,
  makeDraftLoader,
  makeInvalidResult,
  makePlan,
  makeRawDraft,
  makeReferenceLoader,
  makeRpcGateway,
  makeValidResult,
  type AuthzCall,
} from "./fixtures.ts";
import type { BootstrapRpcOutcome } from "../rpc-gateway.ts";

const command = {
  intakeDraftId: DRAFT_ID,
  expectedDraftVersionToken: "v1",
  confirmationIdempotencyKey: "key-1",
} as const;

interface Harness {
  deps: ConfirmIntakeDraftDependencies;
  authzCalls: AuthzCall[];
  rpcCalls: number;
  planCalls: number;
  validateCalls: number;
}

function harness(opts: {
  allow?: (c: AuthzCall) => boolean;
  draft?: ReturnType<typeof makeRawDraft> | null;
  valid?: boolean;
  invalidCodes?: readonly string[];
  outcome?: BootstrapRpcOutcome;
  planThrows?: boolean;
  loaderThrows?: boolean;
} = {}): Harness {
  const allow = opts.allow ?? (() => true);
  const { service, calls: authzCalls } = makeAuthzService(allow);
  const rawDraft = opts.draft === undefined ? makeRawDraft() : opts.draft;
  const draftLoader = opts.loaderThrows
    ? { async load() { throw new Error("boom"); } }
    : makeDraftLoader(rawDraft).loader;
  const outcome: BootstrapRpcOutcome = opts.outcome ?? { code: "BOOTSTRAP_CREATED", matterId: MATTER_ID, idempotent: false };
  const { gateway, calls: rpcCalls } = makeRpcGateway(outcome);
  const counters = { plan: 0, validate: 0 };
  const deps: ConfirmIntakeDraftDependencies = {
    actor: makeActor(),
    authorization: service,
    draftLoader,
    referenceLoader: makeReferenceLoader(),
    rpcGateway: gateway,
    clock: () => "2026-07-24T10:00:00.000Z",
    engine: {
      validate: () => {
        counters.validate += 1;
        return opts.valid === false ? makeInvalidResult(opts.invalidCodes ?? ["INVALID_FACT"]) : makeValidResult();
      },
      plan: () => {
        counters.plan += 1;
        if (opts.planThrows) throw new AggregatePlanningError("UNSUPPORTED_VALIDATION_VERSION", "x");
        return makePlan();
      },
    },
  };
  return {
    deps,
    authzCalls,
    get rpcCalls() { return rpcCalls.length; },
    get planCalls() { return counters.plan; },
    get validateCalls() { return counters.validate; },
  } as Harness;
}

test("13 authorization failure → RESOURCE_NOT_AVAILABLE; no planner, no RPC", async () => {
  const h = harness({ allow: (c) => c.action !== "intake.confirm" });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "RESOURCE_NOT_AVAILABLE");
  assert.equal(h.planCalls, 0);
  assert.equal(h.validateCalls, 0);
  assert.equal(h.rpcCalls, 0);
});

test("6 missing draft → RESOURCE_NOT_AVAILABLE; no RPC", async () => {
  const h = harness({ draft: null });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "RESOURCE_NOT_AVAILABLE");
  assert.equal(h.rpcCalls, 0);
});

test("9/12 validation invalid → VALIDATION_BLOCKED with safe issues; no RPC", async () => {
  const h = harness({ valid: false, invalidCodes: ["INVALID_FACT", "MISSING_CLIENT"] });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "VALIDATION_BLOCKED");
  if (r.kind === "VALIDATION_BLOCKED") {
    assert.deepEqual(r.issues.map((i) => i.code).sort(), ["INVALID_FACT", "MISSING_CLIENT"]);
  }
  assert.equal(h.rpcCalls, 0);
  assert.equal(h.planCalls, 0);
});

test("8 version conflict → DRAFT_STALE", async () => {
  const h = harness({ valid: false, invalidCodes: ["DRAFT_VERSION_CONFLICT"] });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "DRAFT_STALE");
  assert.equal(h.rpcCalls, 0);
});

test("already-confirmed draft → MATTER_ALREADY_CREATED (idempotent reconcile)", async () => {
  const h = harness({ draft: makeRawDraft({ confirmedMatterId: MATTER_ID }), valid: false, invalidCodes: ["DRAFT_ALREADY_CONFIRMED"] });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "MATTER_ALREADY_CREATED");
  if (r.kind === "MATTER_ALREADY_CREATED") assert.equal(r.matterId, MATTER_ID);
});

test("10/11/46/52 happy path → MATTER_CREATED; planner once, RPC once, matter id + href", async () => {
  const h = harness();
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "MATTER_CREATED");
  if (r.kind === "MATTER_CREATED") {
    assert.equal(r.matterId, MATTER_ID);
    assert.equal(r.matterHref, `/matters/${MATTER_ID}`);
    assert.equal(r.idempotent, false);
  }
  assert.equal(h.planCalls, 1);
  assert.equal(h.rpcCalls, 1);
});

test("52/58 created but not read-authorized → success without a matter id", async () => {
  // deny only matter.read, allow intake.confirm
  const h = harness({ allow: (c) => c.resourceType !== "matter" });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "MATTER_ALREADY_CREATED");
  if (r.kind === "MATTER_ALREADY_CREATED") assert.equal(r.matterId, null);
});

test("47 RPC ALREADY_COMMITTED → MATTER_ALREADY_CREATED", async () => {
  const h = harness({ outcome: { code: "BOOTSTRAP_ALREADY_COMMITTED", matterId: MATTER_ID, idempotent: true } });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "MATTER_ALREADY_CREATED");
  if (r.kind === "MATTER_ALREADY_CREATED") assert.equal(r.idempotent, true);
});

test("48 RPC STALE_DRAFT → DRAFT_STALE", async () => {
  const h = harness({ outcome: { code: "BOOTSTRAP_STALE_DRAFT" } });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "DRAFT_STALE");
});

test("49 RPC IDEMPOTENCY_CONFLICT → IDEMPOTENCY_CONFLICT", async () => {
  const h = harness({ outcome: { code: "BOOTSTRAP_IDEMPOTENCY_CONFLICT" } });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "IDEMPOTENCY_CONFLICT");
});

test("50 RPC NOT_AVAILABLE stays opaque → RESOURCE_NOT_AVAILABLE", async () => {
  const h = harness({ outcome: { code: "BOOTSTRAP_NOT_AVAILABLE" } });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "RESOURCE_NOT_AVAILABLE");
});

test("63 RPC aggregate-limit backstop → BOOTSTRAP_LIMIT_EXCEEDED (safe)", async () => {
  const h = harness({ outcome: { code: "BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED" } });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "BOOTSTRAP_LIMIT_EXCEEDED");
  assert.equal(JSON.stringify(r).includes("SQL"), false);
});

test("RPC slug conflict → BOOTSTRAP_INTERNAL_FAILURE (opaque)", async () => {
  const h = harness({ outcome: { code: "BOOTSTRAP_SLUG_CONFLICT" } });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "BOOTSTRAP_INTERNAL_FAILURE");
});

test("51 RPC adapter error → BOOTSTRAP_INTERNAL_FAILURE", async () => {
  const h = harness({ outcome: { code: "BOOTSTRAP_RPC_ERROR", internalCode: "db_error" } });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "BOOTSTRAP_INTERNAL_FAILURE");
});

test("planner error → BOOTSTRAP_INTERNAL_FAILURE; no RPC", async () => {
  const h = harness({ planThrows: true });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "BOOTSTRAP_INTERNAL_FAILURE");
  assert.equal(h.rpcCalls, 0);
});

test("unexpected loader error is caught → BOOTSTRAP_INTERNAL_FAILURE (no raw leak)", async () => {
  const h = harness({ loaderThrows: true });
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.kind, "BOOTSTRAP_INTERNAL_FAILURE");
});

test("15 correlation id is preserved on every result", async () => {
  const h = harness();
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  assert.equal(r.correlationId, CORRELATION_ID);
});

test("14 result never carries confidential draft/plan internals", async () => {
  const h = harness();
  const r = await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  const serialized = JSON.stringify(r);
  for (const forbidden of ["structuredDraft", "structured_draft", "confidential", "planHash", "sourceInputHash", "aggregate", "statementHe"]) {
    assert.equal(serialized.includes(forbidden), false, `result leaked ${forbidden}`);
  }
});

test("1 authorized owner drives the confirm action for the exact draft", async () => {
  const h = harness();
  await confirmIntakeDraftAndBootstrapMatter(command, h.deps);
  const confirm = h.authzCalls.find((c) => c.action === "intake.confirm");
  assert.ok(confirm);
  assert.equal(confirm?.id, DRAFT_ID);
  assert.equal(ACTOR_ID.length > 0, true);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBootstrapPayload,
  createBootstrapMatterRpcGateway,
  parseBootstrapRpcResult,
  type BootstrapRpcInvoker,
  type BootstrapRpcRequest,
} from "../rpc-gateway.ts";
import { DRAFT_ID, MATTER_ID, PLAN_HASH, SCHEMA_VERSION, VERSION_TOKEN, makePlan } from "./fixtures.ts";

function req(): BootstrapRpcRequest {
  return {
    plan: makePlan(),
    draft: { id: DRAFT_ID, versionToken: VERSION_TOKEN, schemaVersion: SCHEMA_VERSION },
    idempotencyKey: "idem-key-1",
    correlationId: "corr-1",
  };
}

test("37/39/40/41 payload maps versions, draft, idempotency, planHash, and aggregate", () => {
  const p = buildBootstrapPayload(req()) as Record<string, unknown>;
  assert.equal(p.rpcVersion, "bootstrap-rpc-v1");
  assert.equal(p.bootstrapVersion, "matter-bootstrap-v1");
  assert.equal(p.correlationId, "corr-1");
  assert.deepEqual(p.draft, { id: DRAFT_ID, versionToken: VERSION_TOKEN, schemaVersion: SCHEMA_VERSION });
  assert.deepEqual(p.idempotency, { key: "idem-key-1", planHash: PLAN_HASH });
  const agg = p.aggregate as Record<string, unknown>;
  assert.equal(agg.aggregateVersion, 1);
  assert.equal(agg.sourceInputHash, "e".repeat(64));
  assert.deepEqual(agg.metadata, {
    plannerVersion: "matter-aggregate-planner-v1",
    validationVersion: "bootstrap-validation-v1",
    planHash: PLAN_HASH,
  });
  for (const key of ["matter", "members", "contacts", "participants", "facts", "deadlines", "evidence", "audit"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(agg, key), `aggregate missing ${key}`);
  }
});

test("38 payload carries no client/server-identity override fields", () => {
  const p = buildBootstrapPayload(req()) as Record<string, unknown>;
  for (const forbidden of ["actorId", "organizationId", "ownerId", "assignedOwnerId", "profileId", "role"]) {
    assert.equal(Object.prototype.hasOwnProperty.call(p, forbidden), false, `payload leaked ${forbidden}`);
  }
  const agg = p.aggregate as Record<string, unknown>;
  const matter = agg.matter as Record<string, unknown>;
  // owner identity is bound server-side via the member slot, not carried as an id.
  assert.equal(Object.prototype.hasOwnProperty.call(matter, "assignedOwnerId"), false);
  const members = agg.members as Array<Record<string, unknown>>;
  assert.equal(members[0]?.bindProfileTo, "confirming_actor");
});

test("42 result union parses each stable code", () => {
  assert.deepEqual(parseBootstrapRpcResult({ ok: true, code: "BOOTSTRAP_CREATED", matterId: MATTER_ID }), {
    code: "BOOTSTRAP_CREATED",
    matterId: MATTER_ID,
    idempotent: false,
  });
  assert.equal(parseBootstrapRpcResult({ ok: true, code: "BOOTSTRAP_ALREADY_COMMITTED", matterId: MATTER_ID }).code, "BOOTSTRAP_ALREADY_COMMITTED");
  assert.equal(parseBootstrapRpcResult({ ok: false, code: "BOOTSTRAP_STALE_DRAFT" }).code, "BOOTSTRAP_STALE_DRAFT");
  assert.equal(parseBootstrapRpcResult({ ok: false, code: "BOOTSTRAP_IDEMPOTENCY_CONFLICT" }).code, "BOOTSTRAP_IDEMPOTENCY_CONFLICT");
  assert.equal(parseBootstrapRpcResult({ ok: false, code: "BOOTSTRAP_NOT_AVAILABLE" }).code, "BOOTSTRAP_NOT_AVAILABLE");
});

test("43 malformed result and unexpected codes fail closed to RPC_ERROR", () => {
  assert.equal(parseBootstrapRpcResult(null).code, "BOOTSTRAP_RPC_ERROR");
  assert.equal(parseBootstrapRpcResult({ ok: true }).code, "BOOTSTRAP_RPC_ERROR");
  assert.equal(parseBootstrapRpcResult({ ok: true, code: "BOOTSTRAP_CREATED" }).code, "BOOTSTRAP_RPC_ERROR"); // missing matterId
  assert.equal(parseBootstrapRpcResult({ ok: false, code: "BOOTSTRAP_CROSS_TENANT" }).code, "BOOTSTRAP_RPC_ERROR");
});

test("44 database error is sanitized (no raw message leak)", async () => {
  const invoker: BootstrapRpcInvoker = {
    async rpc() {
      return { data: null, error: { code: "42501", message: "permission denied for schema app — secret detail" } };
    },
  };
  const outcome = await createBootstrapMatterRpcGateway(invoker).bootstrap(req());
  assert.equal(outcome.code, "BOOTSTRAP_RPC_ERROR");
  if (outcome.code === "BOOTSTRAP_RPC_ERROR") {
    assert.equal(outcome.internalCode, "42501");
    assert.equal(JSON.stringify(outcome).includes("secret detail"), false);
  }
});

test("45 transport/timeout error maps safely", async () => {
  const invoker: BootstrapRpcInvoker = {
    async rpc() {
      throw new Error("ETIMEDOUT connreset");
    },
  };
  const outcome = await createBootstrapMatterRpcGateway(invoker).bootstrap(req());
  assert.equal(outcome.code, "BOOTSTRAP_RPC_ERROR");
  if (outcome.code === "BOOTSTRAP_RPC_ERROR") assert.equal(outcome.internalCode, "transport_error");
});

test("gateway invokes exactly the public gateway function name", async () => {
  const seen: string[] = [];
  const invoker: BootstrapRpcInvoker = {
    async rpc(fn) {
      seen.push(fn);
      return { data: { ok: true, code: "BOOTSTRAP_CREATED", matterId: MATTER_ID }, error: null };
    },
  };
  await createBootstrapMatterRpcGateway(invoker).bootstrap(req());
  assert.deepEqual(seen, ["bootstrap_matter_v1"]);
});

/**
 * Capability 1 · Slice 1.0.F — permanent cross-layer alignment invariants.
 *
 * These tests inspect the AUTHORITATIVE SQL contracts (the migration files) and
 * assert they stay identical to the TypeScript surfaces. They fail CI on drift in
 * EITHER direction, without a live database. The two authority models are NOT
 * merged — this only detects divergence.
 *
 *   bootstrap-confirm-authority-alignment : capability map ⇔ can_confirm roles
 *   bootstrap-procedure-alignment         : TS procedures ⇔ initial_stage_for
 *   bootstrap-limit-alignment             : TS limits    ⇔ RPC backstop numbers
 *   bootstrap-gateway-forwards-only       : public gateway body is a pure forward
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ROLE_CAPABILITIES, type OrganizationRole } from "../../../identity/role-capabilities.ts";
import { BOOTSTRAP_AGGREGATE_LIMITS } from "../../bootstrap/index.ts";
import { SUPPORTED_MATTER_PROCEDURE_TYPES } from "../reference-facts-loader.ts";

const MIG = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`../../../../../supabase/migrations/${name}`, import.meta.url)), "utf8");

const RPC_MIG = "20260724130000_capability1_bootstrap_matter_rpc.sql";
const GATEWAY_MIG = "20260724150000_capability1_bootstrap_public_gateway.sql";
const HARDENING_MIG = "20260724160000_capability1_bootstrap_production_hardening.sql";

const ALL_ROLES: readonly OrganizationRole[] = ["owner", "partner", "admin", "lawyer", "paralegal"];

function quotedList(fragment: string): string[] {
  return [...fragment.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

/* ---- F1: bootstrap-confirm-authority-alignment ---- */
test("bootstrap-confirm-authority-alignment: capability map == can_confirm roles (all roles)", () => {
  const sql = MIG(RPC_MIG);
  const m = sql.match(/m\.role\s+in\s*\(([^)]*)\)/i);
  assert.ok(m, "could not locate can_confirm role set in the RPC migration");
  const sqlRoles = new Set(quotedList(m![1]!));

  const tsConfirmRoles = new Set(
    ALL_ROLES.filter((r) => (ROLE_CAPABILITIES[r] as readonly string[]).includes("intake.confirm")),
  );

  // exact set equality across the FULL membership vocabulary
  assert.deepEqual([...sqlRoles].sort(), [...tsConfirmRoles].sort(), "TS intake.confirm roles != SQL can_confirm roles");
  // explicit per-role coverage (drift in either direction fails here)
  for (const role of ALL_ROLES) {
    const tsHas = (ROLE_CAPABILITIES[role] as readonly string[]).includes("intake.confirm");
    const sqlHas = sqlRoles.has(role);
    assert.equal(tsHas, sqlHas, `authority drift for role "${role}": TS=${tsHas} SQL=${sqlHas}`);
  }
  // sanity: owner & partner in; the rest out
  assert.deepEqual([...tsConfirmRoles].sort(), ["owner", "partner"]);
});

/* ---- F3: bootstrap-procedure-alignment ---- */
test("bootstrap-procedure-alignment: TS procedures == initial_stage_for accepted set", () => {
  const sql = MIG(RPC_MIG);
  const m = sql.match(/p_procedure_type in \(([\s\S]*?)\)\s*then 'intake'/i);
  assert.ok(m, "could not locate initial_stage_for procedure set");
  const sqlProcs = quotedList(m![1]!);
  const tsProcs = [...SUPPORTED_MATTER_PROCEDURE_TYPES];

  assert.equal(new Set(sqlProcs).size, sqlProcs.length, "duplicate procedure in SQL");
  assert.equal(new Set(tsProcs).size, tsProcs.length, "duplicate procedure in TS");
  assert.deepEqual([...sqlProcs].sort(), [...tsProcs].sort(), "TS procedure set != SQL initial_stage_for set");
  assert.equal(tsProcs.length, 12);
});

/* ---- bootstrap-limit-alignment ---- */
test("bootstrap-limit-alignment: TS AggregateLimitPolicy == RPC backstop numbers", () => {
  const sql = MIG(HARDENING_MIG);
  const num = (col: string, op: string): number => {
    const re = new RegExp(`->'${col}'[\\s\\S]*?\\)\\s*,0\\)\\s*${op}\\s*(\\d+)`, "i");
    const m = sql.match(re);
    assert.ok(m, `could not find ${col} ${op} N in the hardening backstop`);
    return Number(m![1]);
  };
  assert.equal(num("contacts", ">"), BOOTSTRAP_AGGREGATE_LIMITS.contacts);
  assert.equal(num("participants", ">"), BOOTSTRAP_AGGREGATE_LIMITS.participants);
  assert.equal(num("facts", ">"), BOOTSTRAP_AGGREGATE_LIMITS.facts);
  assert.equal(num("deadlines", ">"), BOOTSTRAP_AGGREGATE_LIMITS.deadlines);
  assert.equal(num("evidence", ">"), BOOTSTRAP_AGGREGATE_LIMITS.evidence);
  assert.equal(num("members", "<>"), BOOTSTRAP_AGGREGATE_LIMITS.members);
});

/* ---- F4: bootstrap-gateway-forwards-only (static permanent gate) ---- */
test("bootstrap-gateway-forwards-only: public gateway body is a pure forward", () => {
  const sql = MIG(GATEWAY_MIG);
  const m = sql.match(/\$gateway\$([\s\S]*?)\$gateway\$/);
  assert.ok(m, "could not locate the gateway function body");
  const body = m![1]!.trim();
  assert.equal(body, "select app.bootstrap_matter_v1(p_payload)", `gateway body is not a pure forward: <<${body}>>`);
  // no table access, no dynamic SQL, no alternate internal calls in the body.
  for (const forbidden of [/\binsert\b/i, /\bupdate\b/i, /\bdelete\b/i, /\bexecute\b/i, /format\s*\(/i, /app\.(?!bootstrap_matter_v1)/i]) {
    assert.equal(forbidden.test(body), false, `gateway body contains forbidden construct ${forbidden}`);
  }
});

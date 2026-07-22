/** Slice 0.8.4 — authorize-then-read Intake Draft (tests 36–42). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AuthDb } from "../../../identity/infrastructure/supabase-auth-client.ts";
import type { ActorContext } from "../../../identity";
import type { Capability } from "../../../identity/capabilities.ts";
import { createTestActorContext } from "../../../identity/test-support.ts";
import { loadAuthorizedDraftForReview } from "../authorized-draft.ts";

const ORG = "00000000-0000-4000-8000-0000000000c1";
const ACTOR = "00000000-0000-4000-8000-0000000000a1";
const OTHER = "00000000-0000-4000-8000-0000000000a2";
const DRAFT = "00000000-0000-4000-8000-0000000000e1";

type Resp = { data: unknown[] | null; error: unknown };
interface Rec { selects: string[] }

function fakeDb(queue: Resp[], rec: Rec): AuthDb {
  return {
    from() {
      const response = queue.shift() ?? { data: [], error: null };
      const b = {
        select(cols: string) { rec.selects.push(cols); return b; },
        eq() { return b; }, is() { return b; }, limit() { return b; },
        then(onF: (v: Resp) => unknown, onR?: (e: unknown) => unknown) { return Promise.resolve(response).then(onF, onR); },
      };
      return b;
    },
  } as unknown as AuthDb;
}

function actor(caps: Capability[], profileId = ACTOR): ActorContext {
  return createTestActorContext({ profileId, organizationId: ORG, capabilities: new Set(caps) });
}

const draftRow = (over: Record<string, unknown> = {}) => ({ id: DRAFT, organization_id: ORG, created_by: ACTOR, reviewer_ids: [], status: "ready_for_review", ...over });
const reviewableRow = { id: DRAFT, organization_id: ORG, status: "ready_for_review", structured_draft: { ok: 1 }, review_state: null };

test("36: creator may load the draft (authorize → reviewable payload)", async () => {
  const rec: Rec = { selects: [] };
  const db = fakeDb([{ data: [draftRow()], error: null }, { data: [reviewableRow], error: null }], rec);
  const r = await loadAuthorizedDraftForReview(db, actor(["intake.read"]), DRAFT);
  assert.equal(r.ok, true);
});

test("37: assigned reviewer may load the draft", async () => {
  const rec: Rec = { selects: [] };
  const db = fakeDb([{ data: [draftRow({ created_by: OTHER, reviewer_ids: [ACTOR] })], error: null }, { data: [reviewableRow], error: null }], rec);
  const r = await loadAuthorizedDraftForReview(db, actor(["intake.read"]), DRAFT);
  assert.equal(r.ok, true);
});

test("38/40: same-org non-reviewer denied — reviewable payload never fetched", async () => {
  const rec: Rec = { selects: [] };
  const db = fakeDb([{ data: [draftRow({ created_by: OTHER, reviewer_ids: [] })], error: null }], rec);
  const r = await loadAuthorizedDraftForReview(db, actor(["intake.read"], ACTOR), DRAFT);
  assert.equal(r.ok, false);
  // only the auth-facts query ran; structured_draft was never selected
  assert.equal(rec.selects.length, 1);
  assert.ok(rec.selects.every((s) => !/structured_draft|confidential_input/.test(s)));
});

test("39: cross-tenant / absent draft denied", async () => {
  const rec: Rec = { selects: [] };
  const db = fakeDb([{ data: [], error: null }], rec); // org-scoped query finds nothing
  const r = await loadAuthorizedDraftForReview(db, actor(["intake.read"]), DRAFT);
  assert.equal(r.ok, false);
});

test("40b: confidential_input is never selected on any path", async () => {
  const rec: Rec = { selects: [] };
  const db = fakeDb([{ data: [draftRow()], error: null }, { data: [reviewableRow], error: null }], rec);
  await loadAuthorizedDraftForReview(db, actor(["intake.read"]), DRAFT);
  assert.ok(rec.selects.every((s) => !/confidential_input/.test(s)), "confidential_input must never be selected");
});

test("41: read is not status-gated — a creator may read a rejected draft (matches policy)", async () => {
  const rec: Rec = { selects: [] };
  const db = fakeDb([{ data: [draftRow({ status: "rejected" })], error: null }, { data: [{ ...reviewableRow, status: "rejected" }], error: null }], rec);
  const r = await loadAuthorizedDraftForReview(db, actor(["intake.read"]), DRAFT);
  assert.equal(r.ok, true);
});

test("42: no confirmation path exists here — the loader only authorizes intake.read", () => {
  const src = readFileSync(join(import.meta.dirname, "..", "authorized-draft.ts"), "utf8");
  assert.ok(src.includes('"intake.read"'));
  assert.ok(!src.includes("intake.confirm"), "the resume loader must never authorize confirmation");
});

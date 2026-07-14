/**
 * LawME Workflow Engine — generality + full-lifecycle tests.
 * Drives the engine with a SYNTHETIC definition (no evidence coupling) to prove
 * any workflow plugs in, then exercises every transition, the audit trail, the
 * notifications, and the recompute/revert effects.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { getDemoMatter } from "../../fixtures/demo.ts";
import {
  createInstance,
  applyEvent,
  can,
  type WorkflowDefinition,
  type WorkflowEvent,
  type WorkflowInstance,
} from "../engine.ts";
import type { Matter } from "../../types.ts";

const MARK = " ✓";

const synthetic: WorkflowDefinition = {
  id: "synthetic",
  titleHe: "משימת בדיקה",
  subtitleHe: "בדיקת מנוע",
  kindHe: "test",
  detect: (m) => !m.titleHe.includes(MARK),
  seedTask: () => ({
    id: "t-syn",
    titleHe: "משימת בדיקה",
    detailHe: "פירוט",
    ownerId: null,
    ownerNameHe: null,
    dueDateISO: null,
    fields: { note: "" },
  }),
  ownerOptions: (m) => m.team.map((t) => ({ id: t.id, nameHe: t.nameHe, roleHe: t.role })),
  fields: [{ key: "note", labelHe: "הערה", kind: "text", required: true }],
  dueMaxISO: () => null,
  requiresApproval: true,
  approverFor: () => "מאשר",
  canSubmit: (t) => (t.fields.note ?? "").trim().length > 0,
  resolve: (m, t) => ({ ...m, titleHe: m.titleHe + MARK, topic: t.fields.note || m.topic }),
  revert: (m) => ({ ...m, titleHe: m.titleHe.replace(MARK, "") }),
};

function drive(def: WorkflowDefinition, matter: Matter, events: WorkflowEvent[]) {
  let instance: WorkflowInstance = createInstance(def, matter);
  let m = matter;
  const effects: string[] = [];
  for (const ev of events) {
    const r = applyEvent(def, instance, m, ev);
    instance = r.instance;
    m = r.matter;
    effects.push(r.effect);
  }
  return { instance, matter: m, effects };
}

test("engine is definition-agnostic: full lifecycle with a synthetic workflow", () => {
  const matter = getDemoMatter("demo");
  const { instance, matter: after, effects } = drive(synthetic, matter, [
    { type: "update-fields", patch: { ownerId: "tm-lawyer", ownerNameHe: "עו״ד ברוך", dueDateISO: "2026-07-15", fields: { note: "נבדק" } } },
    { type: "execute" },
    { type: "pause" },
    { type: "resume" },
    { type: "wait", reasonHe: "ממתין ללקוח" },
    { type: "resume" },
    { type: "submit" },
    { type: "reject", reasonHe: "חסר פירוט" },
    { type: "resume" },
    { type: "submit" },
    { type: "approve" },
  ]);

  assert.equal(instance.status, "completed");
  assert.equal(after.titleHe.includes(MARK), true); // resolve ran on approve
  assert.equal(effects.filter((e) => e === "recompute").length, 1);

  const kinds: string[] = instance.audit.map((a) => a.kind);
  for (const k of ["detected", "created", "assigned", "due_set", "executed", "paused", "resumed", "waiting", "submitted", "rejected", "approved", "completed", "recomputed"]) {
    assert.ok(kinds.includes(k), `missing audit kind: ${k}`);
  }
  // notifications fired for assign, submit(x2), reject, complete
  assert.ok(instance.notifications.length >= 4);
  assert.ok(instance.notifications.some((n) => n.tone === "success"));
});

test("reopen reverts the matter mutation", () => {
  const matter = getDemoMatter("demo");
  const completed = drive(synthetic, matter, [
    { type: "update-fields", patch: { ownerId: "tm-lawyer", ownerNameHe: "עו״ד ברוך", dueDateISO: "2026-07-15", fields: { note: "נבדק" } } },
    { type: "execute" },
    { type: "submit" },
    { type: "approve" },
  ]);
  assert.equal(completed.instance.status, "completed");
  assert.equal(completed.matter.titleHe.includes(MARK), true);

  const r = applyEvent(synthetic, completed.instance, completed.matter, { type: "reopen" });
  assert.equal(r.instance.status, "in_progress");
  assert.equal(r.effect, "revert");
  assert.equal(r.matter.titleHe.includes(MARK), false);
});

test("guards reject illegal transitions (no-ops, matter untouched)", () => {
  const matter = getDemoMatter("demo");
  const instance = createInstance(synthetic, matter);
  assert.equal(instance.status, "draft");
  assert.equal(can(instance, "approve"), false);

  // approve from draft is a no-op
  const r = applyEvent(synthetic, instance, matter, { type: "approve" });
  assert.equal(r.instance.status, "draft");
  assert.equal(r.effect, "none");
  assert.equal(r.matter, matter);

  // execute without owner/due is a no-op
  const r2 = applyEvent(synthetic, instance, matter, { type: "execute" });
  assert.equal(r2.instance.status, "draft");
});

test("submit is blocked until required fields are filled", () => {
  const matter = getDemoMatter("demo");
  const { instance } = drive(synthetic, matter, [
    { type: "update-fields", patch: { ownerId: "tm-lawyer", ownerNameHe: "עו״ד ברוך", dueDateISO: "2026-07-15" } },
    { type: "execute" },
  ]);
  assert.equal(instance.status, "in_progress");
  const blocked = applyEvent(synthetic, instance, matter, { type: "submit" });
  assert.equal(blocked.instance.status, "in_progress"); // note empty → cannot submit

  const withNote = applyEvent(synthetic, instance, matter, { type: "update-fields", patch: { fields: { note: "מוכן" } } });
  const ok = applyEvent(synthetic, withNote.instance, matter, { type: "submit" });
  assert.equal(ok.instance.status, "in_review");
});

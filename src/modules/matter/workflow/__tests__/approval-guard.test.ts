/**
 * Approval guard + review (Sprint 3.2 final correction) — pure tests.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { getDemoMatter } from "../../fixtures/demo.ts";
import { createInstance, applyEvent, type WorkflowInstance } from "../engine.ts";
import { documentEvidenceReview } from "../document-evidence.ts";
import { approvalPreconditions, approvalVersion, isStale, buildApprovalReview } from "../approval-guard.ts";
import type { Matter } from "../../types.ts";

const UP = {
  storageRef: "org/org-demo/matter/demo/uuid-wa.png", hash: "a".repeat(64), filename: "wa.png",
  mime: "image/png", size: "5000", scanStatus: "scan_clean_demo",
  title: "תכתובת וואטסאפ", sourceType: "opposing_party", docType: "correspondence", evidenceType: "communication",
};

function reachReview(decision = "supports"): { inst: WorkflowInstance; matter: Matter } {
  const matter = getDemoMatter("demo");
  let inst = createInstance(documentEvidenceReview, matter);
  const run = (ev: Parameters<typeof applyEvent>[3]) => { inst = applyEvent(documentEvidenceReview, inst, matter, ev).instance; };
  run({ type: "update-fields", patch: { ownerId: "tm-partner", ownerNameHe: "עו״ד מאיה", dueDateISO: "2026-07-15", fields: { ...UP } } });
  run({ type: "execute" });
  run({ type: "submit" });
  run({ type: "update-fields", patch: { fields: { decision } } });
  return { inst, matter };
}

test("preconditions pass when in_review + document + decision + provenance + approver", () => {
  const { inst, matter } = reachReview();
  assert.equal(approvalPreconditions(inst, matter).ok, true);
});

test("unauthorized: no partner/senior on the team blocks approval", () => {
  const { inst, matter } = reachReview();
  const juniorOnly: Matter = { ...matter, team: matter.team.filter((m) => m.role === "lawyer") };
  const r = approvalPreconditions(inst, juniorOnly);
  assert.equal(r.ok, false);
  assert.match(r.reasonHe ?? "", /מאשר/);
});

test("missing decision / not-in-review blocks approval", () => {
  const { inst, matter } = reachReview("");
  assert.equal(approvalPreconditions(inst, matter).ok, false); // no decision
  const notReview = { ...inst, status: "in_progress" as const };
  assert.equal(approvalPreconditions(notReview, matter).ok, false);
});

test("stale-state: version changes when the decision changes → isStale true", () => {
  const { inst, matter } = reachReview("supports");
  const opened = approvalVersion(inst);
  const changed = applyEvent(documentEvidenceReview, inst, matter, { type: "update-fields", patch: { fields: { decision: "inconclusive" } } }).instance;
  assert.equal(isStale(opened, approvalVersion(changed)), true);
  assert.equal(isStale(opened, approvalVersion(inst)), false); // unchanged
});

test("changed document (hash) also invalidates the opened version", () => {
  const { inst, matter } = reachReview();
  const opened = approvalVersion(inst);
  const rehashed = applyEvent(documentEvidenceReview, inst, matter, { type: "update-fields", patch: { fields: { hash: "b".repeat(64) } } }).instance;
  assert.equal(isStale(opened, approvalVersion(rehashed)), true);
});

test("review shows supports→confirm effects; inconclusive→no matter change", () => {
  const s = buildApprovalReview(reachReview("supports").inst, getDemoMatter("demo"));
  assert.equal(s.willConfirmFact, true);
  assert.match(JSON.stringify(s.rows), /טרם אומת/);       // current epistemic state
  assert.match(JSON.stringify(s.rows), /אומת · נגזר ממסמך/); // proposed epistemic state
  assert.match(JSON.stringify(s.effectsHe), /כיסוי משפטי/);

  const inc = buildApprovalReview(reachReview("inconclusive").inst, getDemoMatter("demo"));
  assert.equal(inc.willConfirmFact, false);
  assert.match(JSON.stringify(inc.effectsHe), /לא ישתנה/);
});

test("idempotence: after approval the workflow leaves in_review, so a second approve is refused", () => {
  const { inst, matter } = reachReview("supports");
  const after = applyEvent(documentEvidenceReview, inst, matter, { type: "approve" }).instance;
  assert.equal(after.status, "completed");
  assert.equal(approvalPreconditions(after, matter).ok, false); // no second apply possible
});

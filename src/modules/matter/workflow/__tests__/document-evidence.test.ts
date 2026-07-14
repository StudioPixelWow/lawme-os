/**
 * document_evidence_review — approval / rejection / inconclusive branches.
 * Runs the document workflow THROUGH the shared engine and asserts the Matter
 * only improves when the reviewer's decision legally supports the fact.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildMatterProfile } from "../../profile.ts";
import { toRoomViewModel } from "../../view/adapter.ts";
import { getDemoMatter } from "../../fixtures/demo.ts";
import { createInstance, applyEvent, type WorkflowInstance } from "../engine.ts";
import { documentEvidenceReview, buildEvidenceDocument } from "../document-evidence.ts";
import type { Matter } from "../../types.ts";

function uploadedFields(extra: Record<string, string> = {}) {
  return {
    storageRef: "org/org-demo/matter/demo/uuid-whatsapp.png",
    hash: "a".repeat(64),
    filename: "whatsapp-hr.png",
    mime: "image/png",
    size: "50000",
    scanStatus: "scan_clean_demo",
    title: "תכתובת וואטסאפ עם מנהלת משאבי אנוש",
    sourceType: "opposing_party",
    docType: "correspondence",
    evidenceType: "communication",
    ...extra,
  };
}

function run(events: Parameters<typeof applyEvent>[3][], startFields: Record<string, string>) {
  let inst: WorkflowInstance = createInstance(documentEvidenceReview, getDemoMatter("demo"));
  let matter: Matter = getDemoMatter("demo");
  // attach + assign reviewer + due
  const r0 = applyEvent(documentEvidenceReview, inst, matter, {
    type: "update-fields",
    patch: { ownerId: "tm-partner", ownerNameHe: "עו״ד מאיה", dueDateISO: "2026-07-15", fields: startFields },
  });
  inst = r0.instance;
  matter = r0.matter;
  let effect = "none";
  for (const ev of events) {
    const r = applyEvent(documentEvidenceReview, inst, matter, ev);
    inst = r.instance;
    matter = r.matter;
    effect = r.effect;
  }
  return { inst, matter, effect };
}

test("document workflow is the primary blocker workflow and needs an upload to submit", () => {
  const inst = createInstance(documentEvidenceReview, getDemoMatter("demo"));
  assert.equal(documentEvidenceReview.uiKind, "document");
  assert.equal(documentEvidenceReview.canSubmit(inst.task), false); // nothing uploaded
  assert.equal(documentEvidenceReview.canSubmit({ ...inst.task, fields: uploadedFields() }), true);
});

test("reviewer options are approvers only (partner / senior), not the junior lawyer", () => {
  const opts = documentEvidenceReview.ownerOptions(getDemoMatter("demo")).map((o) => o.nameHe);
  assert.deepEqual(opts, ["עו״ד מאיה", "עו״ד לאה שרון"]);
  assert.ok(!opts.includes("עו״ד ברוך"));
});

test("APPROVAL branch: decision supports → fact confirmed, blocker resolves, Matter improves", () => {
  const { inst, matter, effect } = run(
    [
      { type: "execute" },
      { type: "submit" },
      { type: "update-fields", patch: { fields: { decision: "supports" } } },
      { type: "approve" },
    ],
    uploadedFields(),
  );
  assert.equal(inst.status, "completed");
  assert.equal(effect, "recompute");

  const vm = toRoomViewModel(buildMatterProfile(matter), matter);
  assert.equal(vm.blocker, null);
  assert.equal(vm.spine.blocked, false);
  assert.equal(vm.scoreRail.rows.find((r) => r.labelHe === "משפטי")!.tone, "completed");
  assert.equal(matter.facts.find((f) => f.field === "employer_knowledge")!.status, "confirmed");
});

test("REJECTION branch: authenticity_uncertain → blocker remains, Matter does not improve", () => {
  const before = getDemoMatter("demo");
  const beforeVm = toRoomViewModel(buildMatterProfile(before), before);
  const { inst, matter } = run(
    [
      { type: "execute" },
      { type: "submit" },
      { type: "update-fields", patch: { fields: { decision: "authenticity_uncertain" } } },
      { type: "reject", reasonHe: "צילום המסך אינו מאמת את זהות הצדדים" },
    ],
    uploadedFields(),
  );
  assert.equal(inst.status, "rejected");
  assert.ok(inst.rejectionReasonHe);

  const vm = toRoomViewModel(buildMatterProfile(matter), matter);
  assert.equal(vm.blocker !== null, true); // blocker persists
  assert.equal(vm.spine.blocked, true);
  assert.equal(matter.facts.find((f) => f.field === "employer_knowledge")!.status, "unknown");
  // no false improvement — identical to baseline
  assert.equal(vm.scoreRail.rows.find((r) => r.labelHe === "משפטי")!.tone, beforeVm.scoreRail.rows.find((r) => r.labelHe === "משפטי")!.tone);
});

test("INCONCLUSIVE approved: document filed but fact NOT confirmed (fails closed)", () => {
  const { inst, matter, effect } = run(
    [
      { type: "execute" },
      { type: "submit" },
      { type: "update-fields", patch: { fields: { decision: "inconclusive" } } },
      { type: "approve" },
    ],
    uploadedFields(),
  );
  assert.equal(inst.status, "completed");
  assert.equal(effect, "recompute"); // engine recomputed...
  // ...but the gate blocked the fact change, so the Matter is unchanged
  const vm = toRoomViewModel(buildMatterProfile(matter), matter);
  assert.equal(vm.blocker !== null, true);
  assert.equal(matter.facts.find((f) => f.field === "employer_knowledge")!.status, "unknown");
});

test("an allegation is never promoted by upload alone (no decision → no confirmation)", () => {
  const { matter } = run(
    [{ type: "execute" }, { type: "submit" }, { type: "approve" }],
    uploadedFields(), // decision left empty
  );
  assert.equal(matter.facts.find((f) => f.field === "employer_knowledge")!.status, "unknown");
});

test("reopen after supported approval reverts the Matter (blocker returns)", () => {
  const { inst, matter } = run(
    [
      { type: "execute" },
      { type: "submit" },
      { type: "update-fields", patch: { fields: { decision: "supports" } } },
      { type: "approve" },
      { type: "reopen" },
    ],
    uploadedFields(),
  );
  assert.equal(inst.status, "in_progress");
  const vm = toRoomViewModel(buildMatterProfile(matter), matter);
  assert.equal(vm.blocker !== null, true);
  assert.equal(matter.facts.find((f) => f.field === "employer_knowledge")!.status, "unknown");
});

test("buildEvidenceDocument yields a typed record with linkage + provenance", () => {
  const matter = getDemoMatter("demo");
  const inst = createInstance(documentEvidenceReview, matter);
  const task = { ...inst.task, ownerNameHe: "עו״ד מאיה", fields: { ...inst.task.fields, ...uploadedFields({ decision: "supports" }) } };
  const doc = buildEvidenceDocument(matter, task, documentEvidenceReview.id);
  assert.equal(doc.matterId, "demo");
  assert.equal(doc.evidenceRequirementId, "preg-e2");
  assert.equal(doc.procedureStageId, "preg-2");
  assert.equal(doc.verificationState, "verified");
  assert.equal(doc.hash.length, 64);
  assert.ok(doc.provenance.capturedByHe);
});

/**
 * Missing-Evidence workflow (as the first engine plugin) — closed-loop tests.
 * Verifies the evidence definition and that running it THROUGH the generic
 * engine drives the real intelligence engine to a visibly healthier matter, and
 * that reopening restores the gap. No engine mocks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildMatterProfile } from "../../profile.ts";
import { toRoomViewModel } from "../../view/adapter.ts";
import { getDemoMatter } from "../../fixtures/demo.ts";
import { createInstance, applyEvent, type WorkflowInstance } from "../engine.ts";
import {
  evidenceWorkflow,
  hasEvidenceGap,
  detectEvidenceGap,
  applyEvidenceResolution,
  revertEvidenceResolution,
  ownerOptions,
  TARGET_FACT,
  TARGET_EVIDENCE,
} from "../evidence-task.ts";
import type { Matter } from "../../types.ts";

const RESOLUTION = {
  statementHe: "המעסיק ידע על ההיריון במועד הפיטורים",
  sourceHe: "תכתובת דוא\"ל מיום 12.4.2026",
};

test("definition detects the gap and lists the real team as owners", () => {
  const matter = getDemoMatter("demo");
  assert.equal(evidenceWorkflow.detect(matter), true);
  assert.equal(hasEvidenceGap(matter), true);
  const gap = detectEvidenceGap(matter)!;
  assert.equal(gap.factField, TARGET_FACT);
  assert.equal(gap.evidenceId, TARGET_EVIDENCE);
  assert.deepEqual(ownerOptions(matter).map((o) => o.nameHe), ["עו״ד מאיה", "עו״ד לאה שרון", "עו״ד ברוך"]);
  assert.equal(evidenceWorkflow.approverFor(matter), "עו״ד מאיה");
});

test("full engine run resolves the gap → visibly healthier matter", () => {
  const before = getDemoMatter("demo");
  let inst: WorkflowInstance = createInstance(evidenceWorkflow, before);
  let matter: Matter = before;
  const run = (ev: Parameters<typeof applyEvent>[3]) => {
    const r = applyEvent(evidenceWorkflow, inst, matter, ev);
    inst = r.instance;
    matter = r.matter;
    return r.effect;
  };

  run({ type: "update-fields", patch: { ownerId: "tm-lawyer", ownerNameHe: "עו״ד ברוך", dueDateISO: "2026-07-15", fields: { statement: RESOLUTION.statementHe, source: RESOLUTION.sourceHe } } });
  run({ type: "execute" });
  run({ type: "submit" });
  assert.equal(inst.status, "in_review");
  const effect = run({ type: "approve" });
  assert.equal(inst.status, "completed");
  assert.equal(effect, "recompute");

  const profile = buildMatterProfile(matter);
  const vm = toRoomViewModel(profile, matter);
  assert.equal(profile.state.stage.canAdvance, true);
  assert.equal(vm.blocker, null);
  assert.equal(vm.spine.blocked, false);
  assert.equal(vm.scoreRail.rows.find((r) => r.labelHe === "משפטי")!.tone, "completed");
  assert.equal(vm.scoreRail.rows.find((r) => r.labelHe === "ראיות")!.tone, "completed");
});

test("reopen restores the evidentiary gap through the engine", () => {
  const before = getDemoMatter("demo");
  const resolved = applyEvidenceResolution(before, RESOLUTION);
  assert.equal(hasEvidenceGap(resolved), false);
  const reverted = revertEvidenceResolution(resolved);
  assert.equal(hasEvidenceGap(reverted), true);
  assert.equal(reverted.facts.find((f) => f.field === TARGET_FACT)!.status, "unknown");
  assert.equal(reverted.evidence.find((e) => e.id === TARGET_EVIDENCE)!.collected, false);
});

test("resolution + revert are pure (source matter untouched)", () => {
  const before = getDemoMatter("demo");
  const snap = JSON.stringify(before);
  applyEvidenceResolution(before, RESOLUTION);
  revertEvidenceResolution(before);
  assert.equal(JSON.stringify(before), snap);
});

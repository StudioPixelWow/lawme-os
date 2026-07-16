/**
 * Confirmation-plan tests — the safety-critical mapping from a reviewed draft to
 * canonical rows. Proves an established fact can NEVER be persisted via intake,
 * hearing/event dates never become binding deadlines, dueAt honesty is kept,
 * and nothing is written unless explicitly approved. No DB, no JSX.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { runIntakePipeline } from "../pipeline.ts";
import { buildConfirmationPlan, type IntakeApprovals } from "../confirm-plan.ts";
import type { IntakeFactStatus } from "../contracts.ts";

const NOW = "2026-07-16T09:00:00+03:00";
const ORG = "00000000-0000-4000-8000-0000000000aa";

const STORY =
  'הלקוחה גב\' רונית לוי עבדה 3 שנים. היא הודיעה למעסיקה חברת טק-לייף בע"מ על ההיריון. ב-01/06/2026 היא פוטרה. יש להגיש תוך 30 יום.';

function baseMatter(): IntakeApprovals["matter"] {
  return {
    titleHe: "רונית לוי נ׳ טק-לייף",
    procedureType: "pregnancy_dismissal",
    forumHe: "בית הדין האזורי לעבודה",
    confidentiality: "client_confidential",
    aiPolicy: "allowed_with_review",
  };
}

test("approving nothing writes nothing but the matter header + audit", async () => {
  const d = await runIntakePipeline({ organizationId: ORG, createdBy: "u1", storyHe: STORY }, { nowISO: NOW });
  const plan = buildConfirmationPlan(d, {
    matter: baseMatter(),
    participants: [],
    facts: [],
    deadlines: [],
    evidenceRequirements: [],
  });
  assert.equal(plan.contacts.length, 0);
  assert.equal(plan.facts.length, 0);
  assert.equal(plan.deadlines.length, 0);
  assert.equal(plan.audit.confirmedBy, "u1");
});

test("an established status is REFUSED and dropped, never written", async () => {
  const d = await runIntakePipeline({ organizationId: ORG, createdBy: null, storyHe: STORY }, { nowISO: NOW });
  const aFact = d.facts[0];
  // A malicious/buggy caller tries to smuggle a confirmed fact past the UI by
  // casting an illegal status through the intake type — the plan must refuse it.
  const smuggled = "confirmed" as unknown as IntakeFactStatus;
  const plan = buildConfirmationPlan(d, {
    matter: baseMatter(),
    participants: [],
    facts: [{ itemId: aFact.id, status: smuggled }],
    deadlines: [],
    evidenceRequirements: [],
  });
  assert.equal(plan.facts.length, 0);
  assert.ok(plan.audit.droppedForSafety.some((r) => r.includes("confirmed")));
});

test("approved intake-status facts are written with intake statuses only", async () => {
  const d = await runIntakePipeline({ organizationId: ORG, createdBy: null, storyHe: STORY }, { nowISO: NOW });
  const plan = buildConfirmationPlan(d, {
    matter: baseMatter(),
    participants: [],
    facts: d.facts.map((f) => ({ itemId: f.id })),
    deadlines: [],
    evidenceRequirements: [],
  });
  assert.ok(plan.facts.length >= 1);
  for (const f of plan.facts) {
    assert.ok(["client_alleged", "opposing_alleged", "disputed", "unknown"].includes(f.status));
  }
});

test("a relative deadline persists with dueAt null (never invented)", async () => {
  const d = await runIntakePipeline({ organizationId: ORG, createdBy: null, storyHe: STORY }, { nowISO: NOW });
  const rel = d.deadlines.find((x) => x.value.kind === "unknown_ambiguous");
  assert.ok(rel);
  const plan = buildConfirmationPlan(d, {
    matter: baseMatter(),
    participants: [],
    facts: [],
    deadlines: [{ itemId: rel!.id }],
    evidenceRequirements: [],
  });
  assert.equal(plan.deadlines.length, 1);
  assert.equal(plan.deadlines[0].dueAt, null);
});

test("an approved event/hearing date is NOT persisted as a binding deadline", async () => {
  const d = await runIntakePipeline({ organizationId: ORG, createdBy: null, storyHe: STORY }, { nowISO: NOW });
  const evt = d.deadlines.find((x) => x.value.kind === "event_date");
  assert.ok(evt, "event date present");
  const plan = buildConfirmationPlan(d, {
    matter: baseMatter(),
    participants: [],
    facts: [],
    deadlines: [{ itemId: evt!.id }],
    evidenceRequirements: [],
  });
  assert.equal(plan.deadlines.length, 0);
  assert.ok(plan.warningsHe.some((w) => w.includes("אירוע")));
});

test("matter confidentiality + ai_policy come from the reviewer's explicit choice", async () => {
  const d = await runIntakePipeline({ organizationId: ORG, createdBy: null, storyHe: STORY }, { nowISO: NOW });
  const plan = buildConfirmationPlan(d, {
    matter: { ...baseMatter(), confidentiality: "privileged", aiPolicy: "prohibited" },
    participants: [],
    facts: [],
    deadlines: [],
    evidenceRequirements: [],
  });
  assert.equal(plan.matter.confidentiality, "privileged");
  assert.equal(plan.matter.aiPolicy, "prohibited");
});

test("demo isolation: intake never reads or emits the frozen demo Matter", async () => {
  const d = await runIntakePipeline({ organizationId: ORG, createdBy: null, storyHe: STORY }, { nowISO: NOW });
  const serialized = JSON.stringify(d);
  assert.equal(serialized.includes('"demo"'), false);
  assert.equal(serialized.includes("לקוח (טרם הוזן)"), false);
});

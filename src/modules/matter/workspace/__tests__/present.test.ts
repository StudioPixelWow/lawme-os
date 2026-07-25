/**
 * Matter Workspace presenter — pure, deterministic unit tests (Slice 2.0.0).
 * Every grouping/ordering/bucket/priority rule is asserted against the fixture,
 * with no database and a fixed reference "now" (FIXTURE_NOW_ISO = 2026-07-25).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWorkspaceView, dayDelta, jerusalemDayKey, DOCUMENTS_SHOWN } from "../present.ts";
import {
  workspaceFixtureInput, workspaceEmptyFixtureInput, FIXTURE_NOW_ISO,
} from "../fixtures.ts";
import type { DocumentInput } from "../types.ts";

test("dayDelta counts whole Jerusalem calendar days (signed)", () => {
  assert.equal(dayDelta("2026-07-25T09:00:00+03:00", "2026-07-30T12:00:00+03:00"), 5);
  assert.equal(dayDelta("2026-07-25T09:00:00+03:00", "2026-07-22T12:00:00+03:00"), -3);
  assert.equal(dayDelta("2026-07-25T09:00:00+03:00", "2026-07-25T23:59:00+03:00"), 0);
});

test("jerusalemDayKey yields a stable YYYY-MM-DD in Asia/Jerusalem", () => {
  assert.equal(jerusalemDayKey("2026-07-19T11:20:00+03:00"), "2026-07-19");
  // 00:30 local on the 19th is still the 19th, not the 18th
  assert.equal(jerusalemDayKey("2026-07-19T00:30:00+03:00"), "2026-07-19");
});

test("hero: identity + derived high priority from an imminent strict deadline", () => {
  const view = buildWorkspaceView(workspaceFixtureInput());
  const h = view.hero;
  assert.equal(h.clientNameHe, "דנה כהן");
  assert.equal(h.responsibleLawyerHe, "עו״ד ליאת שרון");
  assert.equal(h.procedureLabelHe, "פיטורי עובדת בהיריון");
  assert.equal(h.stageLabelHe, "הערכה");
  assert.equal(h.legalDomainHe, "דיני עבודה");
  assert.equal(h.statusLabelHe, "פעיל");
  assert.equal(h.statusTone, "progress");
  assert.equal(h.priority.level, "high");     // dl1 strict, 5 days out (≤7)
  assert.equal(h.priority.labelHe, "גבוה");
  assert.ok(h.confidentialityHe && h.confidentialityHe.startsWith("חיסיון"));
});

test("facts grouped by epistemic status — an allegation is never established", () => {
  const view = buildWorkspaceView(workspaceFixtureInput());
  assert.equal(view.facts.total, 5);
  assert.deepEqual(view.facts.groups.map((g) => g.key), ["established", "alleged", "disputed"]);
  assert.deepEqual(view.facts.groups[0].facts.map((f) => f.id), ["f1", "f2"]); // by fact_key
  assert.deepEqual(view.facts.groups[1].facts.map((f) => f.id), ["f4", "f3"]); // dismissal_reason < employer_knowledge
  assert.deepEqual(view.facts.groups[2].facts.map((f) => f.id), ["f5"]);
  for (const f of view.facts.groups[0].facts) assert.equal(f.epistemic, "established");
});

test("participants grouped by role in the fixed order", () => {
  const view = buildWorkspaceView(workspaceFixtureInput());
  assert.equal(view.participants.total, 4);
  assert.deepEqual(view.participants.groups.map((g) => g.role), [
    "client", "opposing_party", "witness", "counsel",
  ]);
  assert.equal(view.participants.groups[0].participants[0].nameHe, "דנה כהן");
});

test("documents ordered latest-first and capped at DOCUMENTS_SHOWN", () => {
  const view = buildWorkspaceView(workspaceFixtureInput());
  assert.deepEqual(view.documents.items.map((d) => d.id), ["d1", "d2", "d3"]);

  const many: DocumentInput[] = Array.from({ length: 9 }, (_v, i) => ({
    id: `x${i}`,
    titleHe: `מסמך ${i}`,
    documentType: "other",
    evidenceType: "document",
    approvalState: "approved",
    dateISO: null,
    createdAtISO: `2026-07-${String(10 + i).padStart(2, "0")}T10:00:00+03:00`,
  }));
  const capped = buildWorkspaceView({ ...workspaceFixtureInput(), documents: many });
  assert.equal(capped.documents.total, 9);
  assert.equal(capped.documents.shown, DOCUMENTS_SHOWN);
  assert.equal(capped.documents.items[0].id, "x8"); // newest created_at first
});

test("evidence split into mandatory/optional with a collected count", () => {
  const view = buildWorkspaceView(workspaceFixtureInput());
  assert.deepEqual(view.evidence.groups.map((g) => g.key), ["mandatory", "optional"]);
  const mandatory = view.evidence.groups[0];
  assert.equal(mandatory.total, 2);
  assert.equal(mandatory.collected, 1);       // e1 collected, e2 required
  assert.equal(view.evidence.groups[1].total, 1);
});

test("deadlines bucketed; nearest is the most-overdue actionable item", () => {
  const view = buildWorkspaceView(workspaceFixtureInput());
  assert.deepEqual(view.deadlines.buckets.map((b) => b.key), ["overdue", "upcoming", "unscheduled"]);
  assert.deepEqual(view.deadlines.buckets[0].items.map((d) => d.id), ["dl2"]);
  assert.deepEqual(view.deadlines.buckets[1].items.map((d) => d.id), ["dl1"]);
  assert.deepEqual(view.deadlines.buckets[2].items.map((d) => d.id), ["dl3"]);
  assert.equal(view.deadlines.nearest?.id, "dl2");
  const dl1 = view.deadlines.buckets[1].items[0];
  assert.equal(dl1.daysRemaining, 5);
  assert.equal(view.deadlines.buckets[0].items[0].daysRemaining, -3);
});

test("timeline grouped by Jerusalem day, newest first", () => {
  const view = buildWorkspaceView(workspaceFixtureInput());
  assert.equal(view.timeline.total, 4);
  assert.deepEqual(view.timeline.days.map((d) => d.dayISO), ["2026-07-19", "2026-07-18", "2026-07-16"]);
  assert.deepEqual(view.timeline.days[0].events.map((e) => e.id), ["a4", "a3"]); // newest within day first
  assert.equal(view.timeline.days[2].events[0].glyph, "created"); // bootstrap seed event
});

test("empty matter never looks broken — honest unknowns, no fabricated values", () => {
  const view = buildWorkspaceView(workspaceEmptyFixtureInput());
  assert.equal(view.hero.clientNameHe, "לא ידוע");
  assert.equal(view.hero.responsibleLawyerHe, "לא ידוע");
  assert.equal(view.hero.priority.level, "normal");
  assert.equal(view.facts.total, 0);
  assert.deepEqual(view.facts.groups, []);
  assert.equal(view.participants.total, 0);
  assert.equal(view.documents.total, 0);
  assert.equal(view.evidence.total, 0);
  assert.equal(view.deadlines.total, 0);
  assert.deepEqual(view.deadlines.buckets, []);
  assert.equal(view.deadlines.nearest, null);
  assert.equal(view.timeline.total, 1); // the bootstrap event still seeds the feed
});

test("the view is a deterministic pure function of its input", () => {
  const a = buildWorkspaceView(workspaceFixtureInput(FIXTURE_NOW_ISO));
  const b = buildWorkspaceView(workspaceFixtureInput(FIXTURE_NOW_ISO));
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

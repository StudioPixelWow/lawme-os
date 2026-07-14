/**
 * Interaction panels — URL model + content builders (Sprint 3.2). Pure tests.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseMatterUrl, surfaceToSearch } from "../panel-state.ts";
import {
  buildPanel, buildBlocker, buildAction, buildMilestone, buildScoreLens,
  buildDimension, buildPosture, buildDeadline, buildOwner, buildDino, buildIdentity,
} from "../panel-content.ts";
import { buildMatterProfile } from "../../../profile.ts";
import { getDemoMatter } from "../../../fixtures/demo.ts";
import { currentStage } from "../../../state-machine.ts";

const matter = getDemoMatter("demo");
const profile = buildMatterProfile(matter);

/* --- URL model --- */
test("URL parse/build round-trips and fails safe on garbage", () => {
  assert.deepEqual(parseMatterUrl("?panel=score&dimension=legal").panel, { kind: "score", param: "legal" });
  assert.deepEqual(parseMatterUrl("?panel=milestone&stage=preg-2").panel, { kind: "milestone", param: "preg-2" });
  assert.equal(parseMatterUrl("?workflow=document-evidence-review").workflow, "document-evidence-review");
  // invalid panel → no panel (fail safe)
  assert.equal(parseMatterUrl("?panel=notreal").panel, null);
  assert.equal(parseMatterUrl("").panel, null);
  assert.equal(surfaceToSearch({ panel: { kind: "score", param: "legal" }, workflow: null }), "?panel=score&dimension=legal");
  assert.equal(surfaceToSearch({ panel: null, workflow: null }), "");
  // confirm layers on the workflow; invalid confirm fails safe
  assert.equal(parseMatterUrl("?workflow=w&confirm=reject").confirm, "reject");
  assert.equal(parseMatterUrl("?workflow=w&confirm=bogus").confirm, null);
  assert.equal(surfaceToSearch({ panel: null, workflow: "w", confirm: "reopen" }), "?workflow=w&confirm=reopen");
});

/* --- builders --- */
test("blocker panel offers the Document→Evidence workflow (evidence-related)", () => {
  const v = buildBlocker(profile, matter);
  const wf = v.actions.find((a) => a.kind === "workflow");
  assert.ok(wf);
  assert.equal(wf.target, "document-evidence-review");
  assert.ok(v.sections.length > 0);
});

test("action panel (deadline top action) does NOT show the evidence workflow", () => {
  const v = buildAction(profile, matter);
  assert.equal(v.actions.some((a) => a.kind === "workflow"), false);
  assert.ok(v.actions.some((a) => a.kind === "task")); // safe create-task instead
});

test("milestone: current stage is נוכחי and offers a real action; future stage is non-activatable", () => {
  const cur = currentStage(matter)!;
  const now = buildMilestone(matter, profile, cur.id);
  assert.equal(now.subtitleHe, "נוכחי");
  assert.ok(now.actions.some((a) => !a.disabled)); // at least one permitted action

  const future = buildMilestone(matter, profile, "preg-3");
  assert.ok(future.actions.every((a) => a.kind !== "workflow"));
  assert.ok(future.actions.some((a) => a.disabled)); // cannot be manually activated
});

test("score lens lists dimensions as openable; dimension detail resolves", () => {
  const lens = buildScoreLens(profile);
  assert.ok(lens.actions.some((a) => a.kind === "panel" && a.param === "legal"));
  const legal = buildDimension(profile, "legal");
  assert.match(legal.titleHe, /משפטי/);
  assert.ok(legal.sections.length > 0);
  // invalid dimension fails safe
  const bad = buildDimension(profile, "nope");
  assert.ok(bad.emptyHe);
});

test("posture panel exposes weakest/strongest + review route", () => {
  const v = buildPosture(profile);
  const text = JSON.stringify(v);
  assert.match(text, /החלש ביותר/);
  assert.match(text, /מסלול בדיקה/);
});

test("deadline panel shows a strict deadline + real actions", () => {
  const v = buildDeadline(profile, matter);
  assert.match(JSON.stringify(v.sections), /מועד קשיח/);
  assert.ok(v.actions.some((a) => a.kind === "task"));
});

test("owner panel lists team; current owner's assign is disabled", () => {
  const v = buildOwner(matter);
  const assigns = v.actions.filter((a) => a.kind === "reassign");
  assert.ok(assigns.length >= 3);
  assert.ok(assigns.some((a) => a.disabled)); // current owner
  assert.ok(assigns.some((a) => !a.disabled)); // others assignable
});

test("dino panel present when review required; identity lists supported fields only", () => {
  const dino = buildDino(profile, matter);
  assert.match(JSON.stringify(dino.sections), /מבוסס על/);
  const id = buildIdentity(matter);
  assert.match(JSON.stringify(id.sections), /לקוח/);
  assert.match(JSON.stringify(id.sections), /שלב נוכחי/);
});

test("buildPanel dispatches every kind without throwing", () => {
  for (const kind of ["identity", "posture", "review", "situation", "deadline", "action", "blocker", "milestone", "score", "dino", "provenance", "owner", "approval"]) {
    const v = buildPanel(kind, null, profile, matter);
    assert.ok(v.titleHe.length > 0, `panel ${kind} has a title`);
  }
});

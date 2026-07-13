/**
 * Matter State Machine (Epic 4).
 * Every legal procedure maps into this state machine. A matter's current
 * stage, its allowed transitions, and what blocks progress are derived
 * deterministically from the procedure graph (Pillar C) + the matter's
 * facts/evidence/deadlines.
 */
import { EMPLOYMENT_PROCEDURES } from "../legal-knowledge/procedure/catalog.ts";
import { nextStages, orderedStages } from "../legal-knowledge/procedure/graph.ts";
import type { Procedure, ProcedureStage } from "../legal-knowledge/procedure/types.ts";
import type { Matter } from "./types.ts";

export const MATTER_STATE_MACHINE_VERSION = "matter-state-machine-1.0.0";

export function procedureFor(matter: Matter): Procedure | null {
  return EMPLOYMENT_PROCEDURES.find((p) => p.type === matter.procedureType) ?? null;
}

export function currentStage(matter: Matter): ProcedureStage | null {
  const p = procedureFor(matter);
  if (!p) return null;
  return p.stages.find((s) => s.id === matter.currentStageId) ?? p.stages.find((s) => s.id === p.rootStageId) ?? null;
}

export interface BlockingCondition {
  code: string;
  messageHe: string;
  kind: "missing_fact" | "missing_evidence" | "missing_document" | "deadline" | "policy";
}

/** What blocks the matter from advancing out of its current stage. */
export function blockingConditions(matter: Matter): BlockingCondition[] {
  const stage = currentStage(matter);
  const out: BlockingCondition[] = [];
  if (!stage) return out;

  const knownFacts = new Set(matter.facts.filter((f) => f.status !== "unknown").map((f) => f.field));
  for (const f of stage.requiredFacts) {
    if (!knownFacts.has(f)) out.push({ code: `fact:${f}`, messageHe: `עובדה חסרה לשלב: ${f}`, kind: "missing_fact" });
  }
  for (const e of stage.evidence.filter((e) => e.mandatory)) {
    const have = matter.evidence.find((me) => me.id === e.id || me.labelHe === e.labelHe);
    if (!have || !have.collected) out.push({ code: `evidence:${e.id}`, messageHe: `ראיה חסרה: ${e.labelHe}`, kind: "missing_evidence" });
  }
  if (matter.client.aiPolicy === "prohibited") {
    out.push({ code: "policy:ai_prohibited", messageHe: "מדיניות הלקוח אוסרת עיבוד AI", kind: "policy" });
  }
  return out;
}

export interface StateSnapshot {
  procedureType: string;
  currentStageTitleHe: string | null;
  currentStageKind: string | null;
  stageIndex: number;
  totalStages: number;
  canAdvance: boolean;
  blocking: BlockingCondition[];
  nextOptionsHe: { toTitleHe: string; kind: string; conditionHe: string }[];
}

export function stateSnapshot(matter: Matter): StateSnapshot {
  const p = procedureFor(matter);
  const stage = currentStage(matter);
  const ordered = p ? orderedStages(p) : [];
  const idx = stage ? ordered.findIndex((s) => s.id === stage.id) : -1;
  const blocking = blockingConditions(matter);
  const nexts = p && stage ? nextStages(p, stage.id) : [];
  return {
    procedureType: matter.procedureType,
    currentStageTitleHe: stage?.titleHe ?? null,
    currentStageKind: stage?.kind ?? null,
    stageIndex: idx,
    totalStages: ordered.length,
    canAdvance: blocking.length === 0 && nexts.length > 0,
    blocking,
    nextOptionsHe: nexts.map((n) => ({ toTitleHe: n.stage.titleHe, kind: n.kind, conditionHe: n.conditionHe })),
  };
}

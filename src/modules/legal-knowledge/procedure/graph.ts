/**
 * Procedure graph helpers (Epic 3B Triad, Pillar C).
 * Traversal + validation over the procedure graph. Deterministic.
 */
import type { Procedure, ProcedureGraph, ProcedureStage, SourceLink } from "./types.ts";

export const PROCEDURE_GRAPH_VERSION = "procedure-graph-1.0.0";

/** Ordered stages of a procedure following `next` transitions from root. */
export function orderedStages(p: Procedure): ProcedureStage[] {
  return [...p.stages].sort((a, b) => a.orderIndex - b.orderIndex);
}

/** Next possible stages (including alternatives) from a given stage. */
export function nextStages(p: Procedure, stageId: string): { stage: ProcedureStage; kind: string; conditionHe: string }[] {
  return p.transitions
    .filter((t) => t.from === stageId)
    .map((t) => ({ stage: p.stages.find((s) => s.id === t.to)!, kind: t.kind, conditionHe: t.conditionHe }))
    .filter((x) => x.stage);
}

/** All source links in a procedure (governing + per-stage), deduped by citation. */
export function allSources(p: Procedure): SourceLink[] {
  const acc: SourceLink[] = [...p.governingLegislation, ...p.shapingCaseLaw];
  for (const s of p.stages) {
    acc.push(...s.sources);
    for (const e of s.evidence) acc.push(...e.sources);
    for (const d of s.documents) acc.push(...d.sources);
    for (const dl of s.deadlines) acc.push(...dl.sources);
    for (const a of s.actions) acc.push(...a.sources);
  }
  const seen = new Set<string>();
  return acc.filter((s) => (seen.has(s.citationHe) ? false : (seen.add(s.citationHe), true)));
}

export interface ProcedureValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a procedure graph: connected stages, valid transitions, and the
 * INTEGRITY RULE — any stage/rule marked mandatory_law must cite a
 * legislation or court_rules or case_law source, never professional_practice.
 */
export function validateProcedure(p: Procedure): ProcedureValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set(p.stages.map((s) => s.id));

  if (!ids.has(p.rootStageId)) errors.push(`root stage ${p.rootStageId} missing`);
  for (const t of p.transitions) {
    if (!ids.has(t.from)) errors.push(`transition from unknown stage ${t.from}`);
    if (!ids.has(t.to)) errors.push(`transition to unknown stage ${t.to}`);
  }
  // reachability from root
  const reachable = new Set<string>([p.rootStageId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of p.transitions) {
      if (reachable.has(t.from) && !reachable.has(t.to)) { reachable.add(t.to); grew = true; }
    }
  }
  for (const s of p.stages) if (!reachable.has(s.id)) warnings.push(`stage ${s.id} unreachable from root`);

  // integrity: mandatory_law must be backed by an authoritative source kind
  const authoritative = new Set(["legislation", "court_rules", "case_law", "official_guidance"]);
  for (const s of p.stages) {
    for (const link of [...s.sources, ...s.deadlines.flatMap((d) => d.sources), ...s.evidence.flatMap((e) => e.sources)]) {
      if (link.authority === "mandatory_law" && !authoritative.has(link.kind)) {
        errors.push(`stage ${s.id}: rule marked mandatory_law but source kind is ${link.kind} (best practice cannot be law)`);
      }
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function findProcedure(graph: ProcedureGraph, type: string): Procedure | null {
  return graph.procedures.find((p) => p.type === type) ?? null;
}

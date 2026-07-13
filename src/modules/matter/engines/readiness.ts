/**
 * Readiness Engine (Epic 4) — core engine. Answers: is the matter ready to
 * advance out of its current stage? Readiness = all stage-required facts
 * confirmed, all mandatory evidence collected, all stage-required documents
 * present, and no policy block. Derived from the Matter State Machine so that
 * "ready to advance" is a single, auditable computation.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { blockingConditions, currentStage, stateSnapshot } from "../state-machine.ts";
import { action, assessment, finding, score01 } from "./framework.ts";

export const READINESS_ENGINE_VERSION = "matter-readiness-1.0.0";

const KIND_TO_SEVERITY = {
  missing_fact: "high",
  missing_evidence: "high",
  missing_document: "high",
  deadline: "critical",
  policy: "critical",
} as const;

const KIND_TO_DIMENSION = {
  missing_fact: "what_is_missing",
  missing_evidence: "what_is_missing",
  missing_document: "what_is_missing",
  deadline: "when",
  policy: "blocking",
} as const;

export const readinessEngine: MatterEngine = {
  name: "matter-readiness",
  version: READINESS_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const stage = currentStage(matter);
    const snapshot = stateSnapshot(matter);
    const blocking = blockingConditions(matter);
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    for (const b of blocking) {
      findings.push(finding(`readiness-block:${b.code}`, KIND_TO_SEVERITY[b.kind],
        b.messageHe, KIND_TO_DIMENSION[b.kind]));
    }

    // Denominator for the readiness score: stage requirements that can block.
    const reqFacts = stage ? stage.requiredFacts.length : 0;
    const reqEvidence = stage ? stage.evidence.filter((e) => e.mandatory).length : 0;
    const totalGates = reqFacts + reqEvidence;
    const openGates = blocking.filter((b) => b.kind === "missing_fact" || b.kind === "missing_evidence").length;
    const satisfied = Math.max(0, totalGates - openGates);
    const baseScore = totalGates === 0 ? 1 : satisfied / totalGates;
    // any policy/deadline block caps readiness low regardless of gate ratio
    const hardBlock = blocking.some((b) => b.kind === "policy" || b.kind === "deadline");
    const score = hardBlock ? Math.min(baseScore, 0.2) : score01(baseScore);

    const status = blocking.length === 0
      ? (snapshot.nextOptionsHe.length > 0 ? "healthy" : "attention")
      : (hardBlock ? "blocked" : "at_risk");

    if (blocking.length === 0 && snapshot.nextOptionsHe.length > 0) {
      actions.push(action("advance-stage",
        `מוכן להתקדם: ${snapshot.nextOptionsHe.map((n) => n.toTitleHe).join(" / ")}`,
        "senior_lawyer", "כל תנאי השלב הנוכחי מולאו; ניתן לקדם את התיק לשלב הבא", "medium"));
    }

    return assessment(this.name, this.version, {
      status,
      score,
      findings,
      actions,
      data: {
        currentStageTitleHe: snapshot.currentStageTitleHe,
        canAdvance: snapshot.canAdvance,
        totalGates,
        openGates,
        blockingCount: blocking.length,
        nextOptionsHe: snapshot.nextOptionsHe,
      },
      confidence: 0.85,
      requiresHumanReview: blocking.length > 0,
    });
  },
};

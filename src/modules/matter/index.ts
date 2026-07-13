/**
 * Matter Intelligence Engine (Epic 4) — public surface.
 * A Matter is a living object; this module computes what is happening, what is
 * missing, what to do next, who, when, why, and what is blocking — all as
 * structured output. No UI. No model calls. Deterministic given asOf.
 */
export type {
  Matter, MatterFact, MatterDocument, MatterEvidenceItem, MatterDeadline,
  MatterCommunication, MatterFinancials, MatterTeamMember, MatterClient,
  MatterStageKind, FactStatus, Severity, EngineStatus, Finding,
  RecommendedAction, EngineAssessment, MatterEngine,
} from "./types.ts";

export {
  MATTER_STATE_MACHINE_VERSION, procedureFor, currentStage,
  blockingConditions, stateSnapshot,
} from "./state-machine.ts";
export type { BlockingCondition, StateSnapshot } from "./state-machine.ts";

export {
  COMPONENT_ENGINES, MATTER_ENGINE_COUNT,
  deadlineEngine, missingInformationEngine, evidenceEngine, documentEngine,
  readinessEngine, riskEngine, nextActionEngine, healthEngine, timelineEngine,
  progressEngine, strategyEngine, clientEngine, teamEngine, financialEngine,
  communicationEngine, legalEngine, outcomeEngine,
  worst, statusFromSeverity, assessment, parseISO, daysBetween, score01,
  finding, action,
} from "./engines/index.ts";

export {
  MATTER_INTELLIGENCE_VERSION, assessMatter,
} from "./intelligence.ts";
export type { MatterState, MatterQuestions, WhenItem } from "./intelligence.ts";

/**
 * Matter Intelligence Orchestrator (Epic 4).
 *
 * Runs every engine over a living Matter and composes their structured
 * assessments into a single MatterState that answers the seven questions a
 * senior partner asks about any matter:
 *   1. What is happening?      (what_is_happening)
 *   2. What is missing?        (what_is_missing)
 *   3. What should happen next?(what_next)
 *   4. Who should do it?       (who)
 *   5. When?                   (when)
 *   6. Why?                    (why)
 *   7. What is blocking?       (blocking)
 *
 * The output is fully STRUCTURED — engines never emit free text alone, and the
 * orchestrator never invents content beyond what the engines produced. It is
 * deterministic: given the same Matter (including asOf) it yields the same
 * MatterState. No UI, no model calls, no chain-of-thought retained.
 */
import type {
  EngineAssessment, EngineStatus, Finding, Matter, MatterEngine, RecommendedAction, Severity,
} from "./types.ts";
import { blockingConditions, stateSnapshot, type BlockingCondition, type StateSnapshot } from "./state-machine.ts";
import { COMPONENT_ENGINES, MATTER_ENGINE_COUNT } from "./engines/index.ts";
import { healthEngine } from "./engines/health.ts";
import { nextActionEngine } from "./engines/next-action.ts";

export const MATTER_INTELLIGENCE_VERSION = "matter-intelligence-1.0.0";

/* ------------------------------------------------------------------ */
/* Failure isolation (Epic 4.1 Phase 12).                              */
/* A single engine failing must NEVER crash the assessment, and must   */
/* never let the matter appear healthy. A failed engine becomes a      */
/* structured, degraded assessment; the failure is surfaced on the     */
/* MatterState. No raw exception is exposed to the output.             */
/* ------------------------------------------------------------------ */

export type EngineFailureCategory = "threw" | "invalid_output";

export interface EngineFailure {
  engine: string;
  category: EngineFailureCategory;
  messageHe: string;
}

export interface MatterDegradation {
  hasFailures: boolean;
  /** false when any engine failed to produce a valid assessment */
  executionComplete: boolean;
  failedEngines: EngineFailure[];
}

function isValidAssessment(a: unknown): a is EngineAssessment {
  const x = a as EngineAssessment | null | undefined;
  return !!x && typeof x.status === "string" && Array.isArray(x.findings) &&
    Array.isArray(x.actions) && typeof x.engine === "string";
}

/** Run one engine, converting any failure into a degraded assessment. */
function safeAssess(
  engine: MatterEngine,
  matter: Matter,
  extra?: unknown,
): { assessment: EngineAssessment; failure: EngineFailure | null } {
  try {
    const a = (engine as MatterEngine<unknown>).assess(matter, extra);
    if (!isValidAssessment(a)) {
      return degraded(engine, "invalid_output");
    }
    return { assessment: a, failure: null };
  } catch {
    // deliberately swallow the raw error object — no stack/exception leaves here
    return degraded(engine, "threw");
  }
}

function degraded(
  engine: MatterEngine,
  category: EngineFailureCategory,
): { assessment: EngineAssessment; failure: EngineFailure } {
  const messageHe = category === "threw"
    ? `מנוע ${engine.name} נכשל ואינו זמין — ההערכה חלקית`
    : `מנוע ${engine.name} החזיר פלט לא תקין — ההערכה חלקית`;
  const assessment: EngineAssessment = {
    engine: engine.name,
    engineVersion: engine.version,
    status: "unknown",          // never "healthy"
    score: null,
    findings: [{
      code: "engine:unavailable",
      severity: "high",
      messageHe,
      dimension: "blocking",
    }],
    actions: [],
    data: { failed: true, failureCategory: category },
    confidence: 0,
    requiresHumanReview: true,
  };
  return { assessment, failure: { engine: engine.name, category, messageHe } };
}

const STATUS_RANK: Record<EngineStatus, number> = {
  healthy: 0, attention: 1, at_risk: 2, blocked: 3, unknown: 1,
};
const SEV_RANK: Record<Severity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

export interface WhenItem {
  labelHe: string;
  dueDate: string | null;
  daysRemaining: number | null;
  strict: boolean;
  state: string;
}

export interface MatterQuestions {
  whatIsHappening: string[];
  whatIsMissing: string[];
  whatNext: RecommendedAction[];
  who: { role: string; labelHe: string }[];
  when: WhenItem[];
  why: string[];
  blocking: BlockingCondition[];
}

export interface MatterState {
  matterId: string;
  titleHe: string;
  asOf: string;
  overallStatus: EngineStatus;
  overallScore: number | null;
  /** true when any engine failed OR any engine flagged human review */
  requiresHumanReview: boolean;
  /** engine-failure isolation report — never hidden */
  degraded: MatterDegradation;
  stage: StateSnapshot;
  questions: MatterQuestions;
  /** health roll-up + every component engine assessment (structured) */
  engines: EngineAssessment[];
  engineCount: number;
  version: string;
}

export interface AssessMatterOptions {
  /** override the component engine list — used by deterministic failure tests */
  engines?: MatterEngine[];
}

function dedupe(strings: string[]): string[] {
  return Array.from(new Set(strings));
}

/** Run every engine and compose the unified MatterState. */
export function assessMatter(matter: Matter, options?: AssessMatterOptions): MatterState {
  const componentEngines = options?.engines ?? COMPONENT_ENGINES;
  const failures: EngineFailure[] = [];

  // 1) run all component engines with per-engine failure isolation
  const componentAssessments = componentEngines.map((e) => {
    const { assessment, failure } = safeAssess(e, matter);
    if (failure) failures.push(failure);
    return assessment;
  });

  // 2) health rolls up the components (also isolated)
  const healthRun = safeAssess(healthEngine, matter, { assessments: componentAssessments });
  if (healthRun.failure) failures.push(healthRun.failure);
  const health = healthRun.assessment;
  const engines: EngineAssessment[] = [health, ...componentAssessments];

  // 3) overall status = worst across all engines; overall score from health roll-up
  let overallStatus = engines.reduce<EngineStatus>(
    (s, a) => (STATUS_RANK[a.status] > STATUS_RANK[s] ? a.status : s), "healthy",
  );
  // a degraded run must never present as healthy, even if all survivors are healthy
  if (failures.length > 0 && overallStatus === "healthy") overallStatus = "attention";
  const overallScore = health.score;

  // 4) compose the seven questions from structured engine output
  const allFindings: Finding[] = engines.flatMap((a) => a.findings);
  const byDim = (dim: Finding["dimension"]) =>
    allFindings.filter((f) => f.dimension === dim)
      .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity])
      .map((f) => f.messageHe);

  const snapshot = stateSnapshot(matter);
  const blocking = blockingConditions(matter);

  // what_next: canonical plan from the Next-Action engine (already ranked, isolated)
  const planRun = safeAssess(nextActionEngine, matter);
  if (planRun.failure) failures.push(planRun.failure);
  const whatNext = planRun.assessment.actions;

  // who: distinct owner roles referenced by the recommended plan
  const whoMap = new Map<string, { role: string; labelHe: string }>();
  for (const a of whatNext) {
    if (!whoMap.has(a.ownerRole)) whoMap.set(a.ownerRole, { role: a.ownerRole, labelHe: roleHe(a.ownerRole) });
  }
  // also surface team findings about staffing
  const who = Array.from(whoMap.values());

  // when: pull the deadline engine's structured views
  const deadlineData = componentAssessments.find((a) => a.engine === "matter-deadline")?.data as
    | { views?: Array<{ labelHe: string; dueDate: string | null; daysRemaining: number | null; strict: boolean; state: string }> }
    | undefined;
  const when: WhenItem[] = (deadlineData?.views ?? [])
    .slice()
    .sort((a, b) => {
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      return a.daysRemaining - b.daysRemaining;
    })
    .map((v) => ({ labelHe: v.labelHe, dueDate: v.dueDate, daysRemaining: v.daysRemaining, strict: v.strict, state: v.state }));

  const questions: MatterQuestions = {
    whatIsHappening: dedupe([
      snapshot.currentStageTitleHe ? `שלב נוכחי: ${snapshot.currentStageTitleHe}` : "שלב נוכחי אינו מזוהה",
      ...byDim("what_is_happening"),
    ]),
    whatIsMissing: dedupe(byDim("what_is_missing")),
    whatNext,
    who,
    when,
    why: dedupe(byDim("why")),
    blocking,
  };

  const degradation: MatterDegradation = {
    hasFailures: failures.length > 0,
    executionComplete: failures.length === 0,
    failedEngines: failures,
  };

  const requiresHumanReview = failures.length > 0 || engines.some((a) => a.requiresHumanReview);

  return {
    matterId: matter.id,
    titleHe: matter.titleHe,
    asOf: matter.asOf,
    overallStatus,
    overallScore,
    requiresHumanReview,
    degraded: degradation,
    stage: snapshot,
    questions,
    engines,
    engineCount: MATTER_ENGINE_COUNT,
    version: MATTER_INTELLIGENCE_VERSION,
  };
}

function roleHe(role: string): string {
  switch (role) {
    case "partner": return "שותף";
    case "senior_lawyer": return "עו\"ד בכיר";
    case "lawyer": return "עו\"ד";
    case "intern": return "מתמחה";
    case "paralegal": return "פרליגל";
    case "client": return "לקוח";
    default: return role;
  }
}

/**
 * Matter Progress Engine (Epic 4). Measures how far the matter has advanced
 * through its procedure (stage index / total) and whether it appears stalled
 * relative to the time it has been open. Rule-based; no forecasting.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { blockingConditions, stateSnapshot } from "../state-machine.ts";
import { action, assessment, daysBetween, finding, score01 } from "./framework.ts";

export const PROGRESS_ENGINE_VERSION = "matter-progress-1.0.0";

const STALL_DAYS = 45;

export const progressEngine: MatterEngine = {
  name: "matter-progress",
  version: PROGRESS_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const snapshot = stateSnapshot(matter);
    const blocking = blockingConditions(matter);
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    const total = snapshot.totalStages || 1;
    const idx = snapshot.stageIndex < 0 ? 0 : snapshot.stageIndex;
    const completion = score01(idx / total);
    const openedDaysAgo = daysBetween(matter.openedAt, matter.asOf) ?? 0;

    // stalled = open a long time, early in the procedure, and blocked
    const stalled = openedDaysAgo > STALL_DAYS && completion < 0.34 && blocking.length > 0;
    if (stalled) {
      findings.push(finding("progress-stalled", "high",
        `התיק פתוח ${openedDaysAgo} ימים אך התקדם רק כ-${Math.round(completion * 100)}% ועדיין חסום`, "what_is_happening"));
      actions.push(action("progress-unblock", "לתעדף הסרת החסמים כדי לקדם את התיק", "senior_lawyer",
        "קצב התקדמות נמוך ביחס לזמן הפתיחה", "high"));
    } else {
      findings.push(finding("progress-position", "info",
        `התקדמות: כ-${Math.round(completion * 100)}% מהמסלול`, "what_is_happening"));
    }

    return assessment(this.name, this.version, {
      score: completion,
      status: stalled ? "at_risk" : "healthy",
      findings,
      actions,
      data: { completion, stageIndex: idx, totalStages: total, openedDaysAgo, blockingCount: blocking.length, stalled },
      confidence: 0.75,
      requiresHumanReview: stalled,
    });
  },
};

/**
 * Matter Timeline Engine (Epic 4). Places the matter in time: how long it has
 * been open, where it sits in the procedure sequence, and the ordered list of
 * upcoming/overdue deadlines. Detects staleness (no recent communication). All
 * relative to matter.asOf.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { stateSnapshot } from "../state-machine.ts";
import { action, assessment, daysBetween, finding } from "./framework.ts";

export const TIMELINE_ENGINE_VERSION = "matter-timeline-1.0.0";

const STALE_DAYS = 21;

export const timelineEngine: MatterEngine = {
  name: "matter-timeline",
  version: TIMELINE_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const snapshot = stateSnapshot(matter);
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    const openedDaysAgo = daysBetween(matter.openedAt, matter.asOf);

    const deadlineTimeline = matter.deadlines
      .map((d) => ({ id: d.id, labelHe: d.labelHe, dueDate: d.dueDate, strict: d.strict, daysRemaining: daysBetween(matter.asOf, d.dueDate) }))
      .sort((a, b) => {
        if (a.daysRemaining === null) return 1;
        if (b.daysRemaining === null) return -1;
        return a.daysRemaining - b.daysRemaining;
      });

    // last communication recency
    const commTimes = matter.communications
      .map((c) => daysBetween(c.at, matter.asOf))
      .filter((n): n is number => n !== null);
    const daysSinceLastComm = commTimes.length > 0 ? Math.min(...commTimes) : null;

    if (daysSinceLastComm !== null && daysSinceLastComm > STALE_DAYS) {
      findings.push(finding("timeline-stale", "medium",
        `לא תועדה תקשורת ${daysSinceLastComm} ימים — התיק עשוי להיות רדום`, "what_is_happening"));
      actions.push(action("timeline-touch", "לתעד התקדמות / ליזום צעד כדי למנוע קיפאון", "lawyer",
        "היעדר פעילות מתועדת לאורך זמן", "medium"));
    } else if (matter.communications.length === 0) {
      findings.push(finding("timeline-no-comm", "low", "לא תועדה תקשורת בתיק", "what_is_happening"));
    }

    findings.push(finding("timeline-position", "info",
      `שלב ${snapshot.stageIndex + 1} מתוך ${snapshot.totalStages}${snapshot.currentStageTitleHe ? ` — ${snapshot.currentStageTitleHe}` : ""}`,
      "what_is_happening"));

    return assessment(this.name, this.version, {
      score: null,
      status: "healthy",
      findings,
      actions,
      data: {
        openedDaysAgo,
        stageIndex: snapshot.stageIndex,
        totalStages: snapshot.totalStages,
        daysSinceLastComm,
        deadlineTimeline,
      },
      confidence: 0.9,
      requiresHumanReview: false,
    });
  },
};

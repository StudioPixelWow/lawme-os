/**
 * Team Intelligence Engine (Epic 4). Assesses staffing: whether a supervising
 * partner is assigned, per-member load, and overall capacity. Overloaded
 * members and unstaffed high-stakes matters are surfaced. Rule-based.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { action, assessment, finding, score01 } from "./framework.ts";

export const TEAM_ENGINE_VERSION = "matter-team-1.0.0";

const OVERLOAD_THRESHOLD = 0.85;

export const teamEngine: MatterEngine = {
  name: "matter-team",
  version: TEAM_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const team = matter.team;
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    if (team.length === 0) {
      findings.push(finding("team-unstaffed", "high", "לא הוקצה צוות לתיק", "who"));
      actions.push(action("team-assign", "להקצות אחראי תיק", "partner", "אין גורם מטפל מוקצה", "high"));
      return assessment(this.name, this.version, {
        score: 0, findings, actions, data: { size: 0, hasPartner: false },
        confidence: 0.9, requiresHumanReview: true,
      });
    }

    const hasSupervisor = team.some((m) => m.role === "partner" || m.role === "senior_lawyer");
    if (!hasSupervisor) {
      findings.push(finding("team-no-supervisor", "medium",
        "אין שותף/עו\"ד בכיר מפקח על התיק", "who"));
      actions.push(action("team-add-supervisor", "לצרף גורם מפקח בכיר", "partner",
        "פיקוח בכיר נדרש לאיכות ולאחריות מקצועית", "medium"));
    }

    const overloaded = team.filter((m) => m.capacityLoad >= OVERLOAD_THRESHOLD);
    for (const m of overloaded) {
      findings.push(finding(`team-overload:${m.id}`, "medium",
        `עומס גבוה (${Math.round(m.capacityLoad * 100)}%): ${m.nameHe}`, "who"));
    }

    const avgLoad = team.reduce((s, m) => s + m.capacityLoad, 0) / team.length;
    const openTasks = team.reduce((s, m) => s + m.openTasks, 0);
    // score: supervisor presence + spare capacity
    const score = score01((hasSupervisor ? 0.5 : 0) + 0.5 * (1 - avgLoad));

    return assessment(this.name, this.version, {
      score,
      findings,
      actions,
      data: { size: team.length, hasSupervisor, avgLoad: Math.round(avgLoad * 100) / 100, openTasks, overloaded: overloaded.map((m) => m.nameHe) },
      confidence: 0.8,
      requiresHumanReview: !hasSupervisor,
    });
  },
};

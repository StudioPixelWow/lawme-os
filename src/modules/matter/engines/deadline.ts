/**
 * Deadline Engine (Epic 4) — one of the six core engines.
 * Computes, relative to matter.asOf, which deadlines are overdue, imminent,
 * or not-yet-scheduled. A missed STRICT deadline is critical (it can bar the
 * claim/step). Everything is deterministic and relative to asOf — no wall clock.
 */
import type { EngineAssessment, Finding, Matter, MatterDeadline, MatterEngine, RecommendedAction } from "../types.ts";
import { action, assessment, daysBetween, finding, score01 } from "./framework.ts";

export const DEADLINE_ENGINE_VERSION = "matter-deadline-1.0.0";

export interface DeadlineView {
  id: string;
  labelHe: string;
  strict: boolean;
  dueDate: string | null;
  daysRemaining: number | null;   // negative = overdue; null = unscheduled
  state: "overdue" | "imminent" | "upcoming" | "unscheduled";
}

const IMMINENT_DAYS = 7;

function classify(matter: Matter, d: MatterDeadline): DeadlineView {
  const daysRemaining = daysBetween(matter.asOf, d.dueDate);
  let state: DeadlineView["state"];
  if (d.dueDate === null || daysRemaining === null) state = "unscheduled";
  else if (daysRemaining < 0) state = "overdue";
  else if (daysRemaining <= IMMINENT_DAYS) state = "imminent";
  else state = "upcoming";
  return { id: d.id, labelHe: d.labelHe, strict: d.strict, dueDate: d.dueDate, daysRemaining, state };
}

export const deadlineEngine: MatterEngine = {
  name: "matter-deadline",
  version: DEADLINE_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const views = matter.deadlines.map((d) => classify(matter, d));
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    for (const v of views) {
      if (v.state === "overdue") {
        const sev = v.strict ? "critical" : "high";
        findings.push(finding(`deadline:overdue:${v.id}`, sev,
          `מועד חלף (${Math.abs(v.daysRemaining ?? 0)} ימים): ${v.labelHe}${v.strict ? " — מועד קשיח שעלול לחסום את הצעד/התביעה" : ""}`,
          "when"));
        actions.push(action(`deadline-remediate:${v.id}`,
          `לבחון חלופות בעקבות חריגה ממועד: ${v.labelHe}`, "senior_lawyer",
          "מועד קשיח שחלף עלול לשלול זכות דיונית — נדרשת בחינת חלופות/בקשת ארכה", sev,
          { dueHint: "מיידי" }));
      } else if (v.state === "imminent") {
        findings.push(finding(`deadline:imminent:${v.id}`, v.strict ? "high" : "medium",
          `מועד מתקרב (${v.daysRemaining} ימים): ${v.labelHe}`, "when"));
        actions.push(action(`deadline-act:${v.id}`, `להשלים לקראת מועד: ${v.labelHe}`,
          "lawyer", "מועד מתקרב — יש להיערך בהקדם", v.strict ? "high" : "medium",
          { dueHint: `בתוך ${v.daysRemaining} ימים` }));
      } else if (v.state === "unscheduled" && v.strict) {
        findings.push(finding(`deadline:unscheduled:${v.id}`, "medium",
          `מועד קשיח ללא תאריך משוער: ${v.labelHe} — יש לקבע/לחשב מועד`, "when"));
      }
    }

    const overdue = views.filter((v) => v.state === "overdue").length;
    const imminent = views.filter((v) => v.state === "imminent").length;
    const strictOverdue = views.filter((v) => v.state === "overdue" && v.strict).length;
    // score: any strict-overdue → 0; otherwise penalize overdue/imminent.
    const score = strictOverdue > 0 ? 0 : score01(1 - overdue * 0.3 - imminent * 0.15);

    return assessment(this.name, this.version, {
      score,
      findings,
      actions,
      data: { views, overdue, imminent, strictOverdue, unscheduledStrict: views.filter((v) => v.state === "unscheduled" && v.strict).length },
      confidence: 0.9,
      requiresHumanReview: strictOverdue > 0 || imminent > 0,
    });
  },
};

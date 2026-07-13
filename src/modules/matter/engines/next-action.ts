/**
 * Next-Action Engine (Epic 4) — core engine. Produces a single, prioritized,
 * de-duplicated action plan answering "what next / who / when / why". It reads
 * the matter and the state machine directly and ranks actions by severity and
 * time pressure. This is the canonical planner; the orchestrator surfaces its
 * output as the matter's recommended plan.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction, Severity } from "../types.ts";
import { blockingConditions, currentStage, stateSnapshot } from "../state-machine.ts";
import { action, assessment, daysBetween, finding, worst } from "./framework.ts";

export const NEXT_ACTION_ENGINE_VERSION = "matter-next-action-1.0.0";

const SEV_RANK: Record<Severity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

export const nextActionEngine: MatterEngine = {
  name: "matter-next-action",
  version: NEXT_ACTION_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const stage = currentStage(matter);
    const snapshot = stateSnapshot(matter);
    const blocking = blockingConditions(matter);
    const actions: RecommendedAction[] = [];
    const findings: Finding[] = [];

    // 1) time-critical: overdue/imminent strict deadlines first
    for (const d of matter.deadlines) {
      const rem = daysBetween(matter.asOf, d.dueDate);
      if (rem !== null && rem < 0) {
        actions.push(action(`na-deadline-overdue:${d.id}`,
          `לטפל בחריגה ממועד: ${d.labelHe}`, "senior_lawyer",
          `המועד חלף לפני ${Math.abs(rem)} ימים${d.strict ? " (מועד קשיח)" : ""}`,
          d.strict ? "critical" : "high", { dueHint: "מיידי" }));
      } else if (rem !== null && rem <= 7) {
        actions.push(action(`na-deadline-imminent:${d.id}`,
          `להיערך למועד מתקרב: ${d.labelHe}`, "lawyer",
          `נותרו ${rem} ימים${d.strict ? " (מועד קשיח)" : ""}`,
          d.strict ? "high" : "medium", { dueHint: `בתוך ${rem} ימים` }));
      }
    }

    // 2) unblock the current stage: each blocking condition → an action
    for (const b of blocking) {
      if (b.kind === "missing_fact") {
        actions.push(action(`na-fact:${b.code}`, `לברר ולאמת: ${b.messageHe}`, "lawyer", "חוסם התקדמות מהשלב הנוכחי", "high"));
      } else if (b.kind === "missing_evidence") {
        actions.push(action(`na-evidence:${b.code}`, `לאסוף ראיה: ${b.messageHe}`, "lawyer", "ראיה מהותית חסרה חוסמת את השלב", "high"));
      } else if (b.kind === "policy") {
        actions.push(action(`na-policy:${b.code}`, "לקבל אישור/הבהרה על מדיניות הלקוח לפני עיבוד", "partner", b.messageHe, "critical"));
      } else if (b.kind === "deadline") {
        actions.push(action(`na-block-deadline:${b.code}`, `לטפל בחסם מועד: ${b.messageHe}`, "senior_lawyer", "חסם מבוסס-מועד", "critical"));
      } else {
        actions.push(action(`na-doc:${b.code}`, `להשלים מסמך: ${b.messageHe}`, "lawyer", "מסמך נדרש לשלב חסר", "high"));
      }
    }

    // 3) client responsiveness follow-up
    if (matter.client.responsiveness === "unreachable" || matter.client.responsiveness === "slow") {
      actions.push(action("na-client-followup", "ליצור קשר יזום עם הלקוח לקידום הצעדים", "paralegal",
        "היענות הלקוח מעכבת קידום", matter.client.responsiveness === "unreachable" ? "high" : "medium"));
    }

    // 4) if nothing blocks and there is a next stage → advance
    if (blocking.length === 0 && snapshot.nextOptionsHe.length > 0) {
      actions.push(action("na-advance",
        `לקדם לשלב הבא: ${snapshot.nextOptionsHe.map((n) => n.toTitleHe).join(" / ")}`,
        "senior_lawyer", "השלב הנוכחי הושלם וקיימת חלופת המשך", "medium"));
    }

    // 5) if fully complete (no next options) note closure path
    if (blocking.length === 0 && snapshot.nextOptionsHe.length === 0 && stage) {
      findings.push(finding("na-terminal", "info",
        `השלב הנוכחי (${stage.titleHe}) הוא סופי במסלול זה — אין צעד המשך בגרף`, "what_next"));
    }

    // rank: severity desc, then keep insertion order (time-critical came first)
    const ranked = actions
      .map((a, i) => ({ a, i }))
      .sort((x, y) => SEV_RANK[y.a.priority] - SEV_RANK[x.a.priority] || x.i - y.i)
      .map((x) => x.a);

    const top = ranked.reduce<Severity>((s, a) => worst(s, a.priority), "info");
    if (ranked.length > 0) {
      findings.push(finding("na-plan", top,
        `נגזרו ${ranked.length} פעולות מומלצות; הפעולה הדחופה ביותר: ${ranked[0].labelHe}`, "what_next"));
    }

    return assessment(this.name, this.version, {
      score: null, // an action planner is not a health score
      status: ranked.length === 0 ? "healthy" : undefined,
      findings,
      actions: ranked,
      data: { plan: ranked, count: ranked.length, topPriority: top },
      confidence: 0.8,
      requiresHumanReview: ranked.some((a) => a.requiresHumanApproval),
    });
  },
};

/**
 * Communication Intelligence Engine (Epic 4). Reads the communication log:
 * outstanding inbound items awaiting a response, silence gaps, and the last
 * touch. Unanswered inbound communications are the primary driver — they are
 * both a service risk and, sometimes, a substantive one.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { action, assessment, daysBetween, finding, score01 } from "./framework.ts";

export const COMMUNICATION_ENGINE_VERSION = "matter-communication-1.0.0";

const AWAIT_WARN_DAYS = 3;

export const communicationEngine: MatterEngine = {
  name: "matter-communication",
  version: COMMUNICATION_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const comms = matter.communications;
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    const awaiting = comms.filter((c) => c.awaitingResponse);
    for (const c of awaiting) {
      const age = daysBetween(c.at, matter.asOf);
      const sev = age !== null && age > AWAIT_WARN_DAYS ? "medium" : "low";
      findings.push(finding(`comm-awaiting:${c.id}`, sev,
        `ממתין למענה${age !== null ? ` (${age} ימים)` : ""}: ${c.summaryHe}`, "what_is_missing"));
      if (sev === "medium") {
        actions.push(action(`comm-respond:${c.id}`, `להשיב לפנייה: ${c.summaryHe}`, "lawyer",
          "פנייה נכנסת ממתינה למענה מעבר לסף הסביר", "medium"));
      }
    }

    const times = comms.map((c) => daysBetween(c.at, matter.asOf)).filter((n): n is number => n !== null);
    const daysSinceLast = times.length > 0 ? Math.min(...times) : null;

    const score = comms.length === 0 ? 1 : score01(1 - awaiting.length * 0.2);

    return assessment(this.name, this.version, {
      score,
      findings,
      actions,
      data: {
        total: comms.length,
        awaitingResponse: awaiting.length,
        daysSinceLast,
        lastDirection: comms.length > 0 ? comms[comms.length - 1].direction : null,
      },
      confidence: 0.8,
      requiresHumanReview: false,
    });
  },
};

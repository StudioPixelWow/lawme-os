/**
 * Matter Health Engine (Epic 4) — core engine. Produces the matter's overall
 * vitality. When given the other engines' assessments it rolls them up (worst
 * status dominates; score is a weighted mean of the component engines). Given
 * no components it computes a direct vitality from primary matter signals so it
 * remains usable standalone. Health is a *summary*, never a substitute for the
 * component findings.
 */
import type { EngineAssessment, EngineStatus, Finding, Matter, MatterEngine, RecommendedAction, Severity } from "../types.ts";
import { blockingConditions } from "../state-machine.ts";
import { assessment, daysBetween, finding, score01, statusFromSeverity, worst } from "./framework.ts";

export const HEALTH_ENGINE_VERSION = "matter-health-1.0.0";

const STATUS_RANK: Record<EngineStatus, number> = {
  healthy: 0, attention: 1, at_risk: 2, blocked: 3, unknown: 1,
};

// weights for the standalone signals (sum need not be 1; normalized below)
const COMPONENT_WEIGHTS: Record<string, number> = {
  "matter-readiness": 1.4,
  "matter-deadline": 1.4,
  "matter-risk": 1.2,
  "matter-evidence": 1.0,
  "matter-missing-information": 1.0,
  "matter-financial": 0.6,
  "matter-client": 0.6,
};

export interface HealthExtra {
  assessments?: EngineAssessment[];
}

export const healthEngine: MatterEngine<HealthExtra> = {
  name: "matter-health",
  version: HEALTH_ENGINE_VERSION,
  assess(matter: Matter, extra?: HealthExtra): EngineAssessment {
    const components = (extra?.assessments ?? []).filter((a) => a.engine !== "matter-health");
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    if (components.length > 0) {
      // roll-up mode
      let worstStatus: EngineStatus = "healthy";
      let wSum = 0;
      let wScore = 0;
      for (const c of components) {
        if (STATUS_RANK[c.status] > STATUS_RANK[worstStatus]) worstStatus = c.status;
        if (c.score !== null) {
          const w = COMPONENT_WEIGHTS[c.engine] ?? 0.5;
          wSum += w;
          wScore += w * c.score;
        }
      }
      const score = wSum > 0 ? score01(wScore / wSum) : null;

      const blockedEngines = components.filter((c) => c.status === "blocked").map((c) => c.engine);
      const atRisk = components.filter((c) => c.status === "at_risk").map((c) => c.engine);
      if (blockedEngines.length > 0) {
        findings.push(finding("health-blocked", "critical",
          `התיק חסום: ${blockedEngines.join(", ")}`, "blocking"));
      }
      if (atRisk.length > 0) {
        findings.push(finding("health-at-risk", "high",
          `מנועים בסיכון: ${atRisk.join(", ")}`, "why"));
      }
      if (blockedEngines.length === 0 && atRisk.length === 0) {
        findings.push(finding("health-ok", "info", "אין חסימות או סיכונים גבוהים פעילים", "what_is_happening"));
      }

      return assessment(this.name, this.version, {
        status: worstStatus,
        score,
        findings,
        actions,
        data: {
          mode: "rollup",
          componentCount: components.length,
          worstStatus,
          statusByEngine: Object.fromEntries(components.map((c) => [c.engine, c.status])),
          scoreByEngine: Object.fromEntries(components.map((c) => [c.engine, c.score])),
        },
        confidence: 0.85,
        requiresHumanReview: worstStatus === "blocked" || worstStatus === "at_risk",
      });
    }

    // standalone mode — direct vitality from primary signals
    const blocking = blockingConditions(matter);
    let penalty = 0;
    if (blocking.length > 0) {
      penalty += 0.25 + 0.1 * (blocking.length - 1);
      findings.push(finding("health-blocking", "high", `קיימות ${blocking.length} חסימות פעילות`, "blocking"));
    }
    const overdueStrict = matter.deadlines.filter((d) => {
      const r = daysBetween(matter.asOf, d.dueDate);
      return r !== null && r < 0 && d.strict;
    }).length;
    if (overdueStrict > 0) {
      penalty += 0.5;
      findings.push(finding("health-overdue", "critical", `${overdueStrict} מועדים קשיחים שחלפו`, "when"));
    }
    if (matter.client.responsiveness === "unreachable") {
      penalty += 0.15;
      findings.push(finding("health-client", "medium", "הלקוח אינו זמין", "who"));
    }
    const score = score01(1 - penalty);
    const topSeverity = findings.reduce<Severity>((s, f) => worst(s, f.severity), "info");
    const status: EngineStatus = overdueStrict > 0 ? "blocked" : statusFromSeverity(topSeverity);

    return assessment(this.name, this.version, {
      status,
      score,
      findings,
      actions,
      data: { mode: "standalone", blockingCount: blocking.length, overdueStrict },
      confidence: 0.7,
      requiresHumanReview: status !== "healthy",
    });
  },
};

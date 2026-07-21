/**
 * Outcome Predictor Engine (Epic 4) — RULE-BASED ONLY.
 * This engine does NOT use machine learning, statistics over past cases, or any
 * probabilistic model. It maps a small set of transparent, matter-internal
 * signals (legal coverage, mandatory-evidence completeness, factual
 * confirmation, deadline compliance) to a QUALITATIVE posture band. It never
 * emits a numeric probability of winning and always requires human review. The
 * band describes the strength of the *current position*, not a forecast of the
 * verdict.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { currentStage } from "../state-machine.ts";
import { isEstablishedFactStatus } from "../fact-status.ts";
import { evaluateTriad } from "../../legal-knowledge/triad/coverage.ts";
import { assessment, daysBetween, finding, score01 } from "./framework.ts";

export const OUTCOME_ENGINE_VERSION = "matter-outcome-1.0.0";

export type OutcomeBand = "position_strong" | "position_moderate" | "position_weak" | "position_uncertain";

export const outcomeEngine: MatterEngine = {
  name: "matter-outcome",
  version: OUTCOME_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const stage = currentStage(matter);
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    // signal 1: legal coverage
    const requiredFacts = stage?.requiredFacts ?? [];
    const factsConfirmed = requiredFacts.length > 0 && requiredFacts.every((field) => {
      const f = matter.facts.find((x) => x.field === field);
      return f !== undefined && isEstablishedFactStatus(f.status);
    });
    const coverage = evaluateTriad({
      topic: matter.topic,
      availableLegislationRefIds: matter.availableLegislationRefIds,
      procedureType: matter.procedureType,
      factsConfirmed,
    });
    const legalOk = coverage.canProduceMatterRecommendation;

    // signal 2: mandatory-evidence completeness
    const mandatory = matter.evidence.filter((e) => e.mandatory);
    const evidenceRatio = mandatory.length === 0 ? 1 : mandatory.filter((e) => e.collected).length / mandatory.length;

    // signal 3: factual confirmation ratio
    const factRatio = requiredFacts.length === 0 ? 1
      : requiredFacts.filter((field) => {
          const f = matter.facts.find((x) => x.field === field);
          return f !== undefined && isEstablishedFactStatus(f.status);
        }).length / requiredFacts.length;

    // signal 4: deadline compliance (no strict overdue)
    const strictOverdue = matter.deadlines.some((d) => {
      const r = daysBetween(matter.asOf, d.dueDate);
      return r !== null && r < 0 && d.strict;
    });

    // Transparent rule table → band. No probabilities.
    let band: OutcomeBand;
    const strong = legalOk && evidenceRatio >= 0.9 && factRatio >= 0.9 && !strictOverdue;
    const weak = !legalOk || strictOverdue || evidenceRatio < 0.5 || factRatio < 0.5;
    if (!legalOk && coverage.state === "requires_specialist_review") {
      band = "position_uncertain";
    } else if (strong) {
      band = "position_strong";
    } else if (weak) {
      band = "position_weak";
    } else {
      band = "position_moderate";
    }

    const bandHe: Record<OutcomeBand, string> = {
      position_strong: "עמדה חזקה יחסית (כל האותות המהותיים מתקיימים)",
      position_moderate: "עמדה בינונית — חלק מהאותות אינם מלאים",
      position_weak: "עמדה חלשה — חסרים מרכיבים מהותיים",
      position_uncertain: "לא ניתן להעריך עמדה — נדרש כיסוי/מומחיות נוספים",
    };

    findings.push(finding("outcome-band", band === "position_weak" || band === "position_uncertain" ? "medium" : "info",
      `הערכת עמדה (מבוססת-כללים, לא חיזוי): ${bandHe[band]}`, "why"));
    findings.push(finding("outcome-disclaimer", "info",
      "הערכה זו נגזרת מכללים שקופים בלבד ואינה חיזוי הסתברותי של תוצאת ההליך — טעונה שיקול דעת אנושי", "why"));

    // an index for ordering only (NOT a probability of winning)
    const positionIndex = score01(
      (legalOk ? 0.35 : 0) + 0.3 * evidenceRatio + 0.25 * factRatio + (strictOverdue ? 0 : 0.1),
    );

    return assessment(this.name, this.version, {
      status: band === "position_uncertain" ? "unknown" : "healthy",
      score: positionIndex,
      findings,
      actions,
      data: {
        method: "rule_based_only",
        band,
        signals: { legalOk, evidenceRatio: Math.round(evidenceRatio * 100) / 100, factRatio: Math.round(factRatio * 100) / 100, strictOverdue },
        positionIndexNote: "positionIndex is an ordering aid, not a probability of success",
        triadState: coverage.state,
      },
      confidence: 0.5,
      requiresHumanReview: true,
    });
  },
};

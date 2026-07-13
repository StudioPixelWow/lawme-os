/**
 * Missing-Information Engine (Epic 4) — core engine, answers "what is missing".
 * Distinguishes epistemic states precisely: a fact that is merely *alleged*
 * (by client or opposing side) or *disputed* is NOT confirmed and is surfaced
 * as a gap. Facts required by the current procedure stage but absent are the
 * highest-severity gaps.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { currentStage } from "../state-machine.ts";
import { action, assessment, finding, score01 } from "./framework.ts";

export const MISSING_INFO_ENGINE_VERSION = "matter-missing-information-1.0.0";

const CONFIRMED_STATUSES = new Set(["confirmed", "document_derived"]);

export const missingInformationEngine: MatterEngine = {
  name: "matter-missing-information",
  version: MISSING_INFO_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const stage = currentStage(matter);
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    const factByField = new Map(matter.facts.map((f) => [f.field, f]));
    const requiredFields = stage ? stage.requiredFacts : [];

    const missingRequired: string[] = [];
    const allegedRequired: string[] = [];
    for (const field of requiredFields) {
      const fact = factByField.get(field);
      if (!fact || fact.status === "unknown") {
        missingRequired.push(field);
        findings.push(finding(`missing-fact:${field}`, "high",
          `עובדה נדרשת לשלב חסרה: ${field}`, "what_is_missing"));
        actions.push(action(`collect-fact:${field}`, `לברר ולאמת עובדה: ${field}`,
          "lawyer", "העובדה נדרשת לשלב הנוכחי בהליך ועדיין אינה מאומתת", "high"));
      } else if (!CONFIRMED_STATUSES.has(fact.status)) {
        allegedRequired.push(field);
        findings.push(finding(`unconfirmed-fact:${field}`, "medium",
          `עובדה נדרשת קיימת אך אינה מאומתת (${fact.status}): ${field}`, "what_is_missing"));
      }
    }

    // alleged/disputed facts anywhere (not only required) are lower-severity gaps
    const allegedElsewhere = matter.facts.filter(
      (f) => !requiredFields.includes(f.field) && (f.status === "client_alleged" || f.status === "opposing_alleged" || f.status === "disputed"),
    );
    for (const f of allegedElsewhere) {
      findings.push(finding(`unconfirmed-context:${f.field}`, "low",
        `טענה שאינה מאומתת (${f.status}): ${f.statementHe}`, "what_is_missing"));
    }

    const requiredCount = requiredFields.length;
    const satisfied = requiredCount - missingRequired.length - allegedRequired.length;
    const score = requiredCount === 0 ? 1 : score01(satisfied / requiredCount);

    return assessment(this.name, this.version, {
      score,
      findings,
      actions,
      data: {
        requiredFields,
        missingRequired,
        allegedRequired,
        allegedElsewhere: allegedElsewhere.map((f) => ({ field: f.field, status: f.status })),
      },
      confidence: 0.85,
      requiresHumanReview: missingRequired.length > 0,
    });
  },
};

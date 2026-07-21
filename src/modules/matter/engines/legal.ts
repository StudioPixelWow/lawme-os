/**
 * Legal Intelligence Engine (Epic 4). Bridges the living matter to the Legal
 * Knowledge Triad (Legislation + Case Law + Procedure). It asks: for THIS
 * matter's topic, does LawME have enough connected legal knowledge to support a
 * substantive recommendation? It fails closed — when coverage is insufficient it
 * says so and routes to specialist review rather than manufacturing confidence.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction, Severity } from "../types.ts";
import { currentStage } from "../state-machine.ts";
import { isEstablishedFactStatus } from "../fact-status.ts";
import { evaluateTriad } from "../../legal-knowledge/triad/coverage.ts";
import { action, assessment, finding } from "./framework.ts";

export const LEGAL_ENGINE_VERSION = "matter-legal-1.0.0";

export const legalEngine: MatterEngine = {
  name: "matter-legal",
  version: LEGAL_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const stage = currentStage(matter);
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    // facts are "confirmed" for triad purposes when every stage-required fact is confirmed
    const requiredFacts = stage?.requiredFacts ?? [];
    const factsConfirmed = requiredFacts.every((field) => {
      const f = matter.facts.find((x) => x.field === field);
      return f !== undefined && isEstablishedFactStatus(f.status);
    });

    const coverage = evaluateTriad({
      topic: matter.topic,
      availableLegislationRefIds: matter.availableLegislationRefIds,
      procedureType: matter.procedureType,
      factsConfirmed,
    });

    let severity: Severity = "info";
    if (!coverage.canProduceMatterRecommendation) {
      severity = coverage.state === "requires_specialist_review" ? "high" : "medium";
      findings.push(finding("legal-insufficient", severity,
        `כיסוי משפטי לא מספיק להמלצה מהותית (מצב: ${coverage.state})`, "why"));
      for (const na of coverage.nextResearchActionsHe) {
        actions.push(action(`legal-research:${na.slice(0, 24)}`, na, "lawyer",
          "נדרש להשלים כיסוי משפטי לפני קביעה מהותית", severity));
      }
      if (coverage.state === "requires_specialist_review") {
        actions.push(action("legal-specialist", "להעביר לבחינת מומחה תחום", "senior_lawyer",
          "הנושא מונע-פסיקה ללא פסיקה מאומתת בקורפוס", "high"));
      }
    } else {
      findings.push(finding("legal-covered", "info",
        `כיסוי משפטי מספיק להמלצה מהותית (מצב: ${coverage.state})`, "what_is_happening"));
    }

    // pillar-level transparency
    if (!coverage.caseLaw.usable && coverage.caseLaw.present) {
      findings.push(finding("legal-caselaw-unverified", "low",
        "קיימות רשומות פסיקה מועמדות בלבד — לא מאומתות מול המקור הרשמי", "what_is_missing"));
    }

    return assessment(this.name, this.version, {
      status: coverage.canProduceMatterRecommendation ? "healthy" : (severity === "high" ? "at_risk" : "attention"),
      score: coverage.canProduceMatterRecommendation ? 1 : (coverage.state === "requires_specialist_review" ? 0.2 : 0.5),
      findings,
      actions,
      data: {
        topic: matter.topic,
        triadState: coverage.state,
        canRecommend: coverage.canProduceMatterRecommendation,
        legislation: coverage.legislation,
        caseLaw: coverage.caseLaw,
        procedure: coverage.procedure,
        factsConfirmed,
      },
      confidence: 0.8,
      requiresHumanReview: !coverage.canProduceMatterRecommendation,
    });
  },
};

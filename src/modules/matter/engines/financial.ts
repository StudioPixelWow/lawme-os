/**
 * Financial Intelligence Engine (Epic 4). Reads the matter's fee arrangement,
 * billing/collection posture and write-off risk. Surfaces a missing fee
 * arrangement and high open balances. Rule-based; no financial advice, only
 * operational flags for the firm.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { action, assessment, finding, score01 } from "./framework.ts";

export const FINANCIAL_ENGINE_VERSION = "matter-financial-1.0.0";

export const financialEngine: MatterEngine = {
  name: "matter-financial",
  version: FINANCIAL_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const f = matter.financials;
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];
    let penalty = 0;

    if (!f.feeArrangementHe) {
      findings.push(finding("fin-no-arrangement", "medium",
        "לא תועד הסדר שכר טרחה", "why"));
      actions.push(action("fin-set-arrangement", "לתעד/להסדיר שכר טרחה בכתב", "partner",
        "היעדר הסדר שכר טרחה מגדיל סיכון גבייה ומחלוקת", "medium"));
      penalty += 0.2;
    }

    const billed = f.billedAmount ?? 0;
    const outstanding = f.outstandingAmount ?? 0;
    if (billed > 0) {
      const ratio = outstanding / billed;
      if (ratio >= 0.5) {
        findings.push(finding("fin-high-outstanding", "medium",
          `יתרה פתוחה גבוהה: ${Math.round(ratio * 100)}% מהחיוב`, "why"));
        penalty += 0.2;
        actions.push(action("fin-collect", "לפעול לגביית יתרה פתוחה", "paralegal",
          "יתרה פתוחה משמעותית", "medium"));
      }
    }

    if (f.writeOffRiskHe) {
      findings.push(finding("fin-writeoff", "medium", `סיכון מחיקה: ${f.writeOffRiskHe}`, "why"));
      penalty += 0.2;
    }

    return assessment(this.name, this.version, {
      score: score01(1 - penalty),
      findings,
      actions,
      data: {
        hasArrangement: Boolean(f.feeArrangementHe),
        billed,
        collected: f.collectedAmount ?? 0,
        outstanding,
        currency: f.currency,
        writeOffRisk: f.writeOffRiskHe,
      },
      confidence: 0.8,
      requiresHumanReview: false,
    });
  },
};

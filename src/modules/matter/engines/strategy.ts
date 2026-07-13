/**
 * Matter Strategy Engine (Epic 4). Recommends a legal posture from the matter's
 * current stage and its evidentiary/deadline/factual position. Rule-based and
 * transparent: every option carries an explicit rationale. It proposes; a human
 * decides. It never asserts an outcome.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { currentStage } from "../state-machine.ts";
import { action, assessment, daysBetween, finding } from "./framework.ts";

export const STRATEGY_ENGINE_VERSION = "matter-strategy-1.0.0";

export interface StrategyOption {
  key: "gather_evidence" | "seek_settlement" | "prepare_filing" | "seek_interim_relief" | "proceed" | "stabilize_deadlines";
  labelHe: string;
  rationaleHe: string;
  weight: number; // relative recommendation weight (higher = stronger fit)
}

export const strategyEngine: MatterEngine = {
  name: "matter-strategy",
  version: STRATEGY_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const stage = currentStage(matter);
    const options: StrategyOption[] = [];
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    const missingMandatoryEvidence = matter.evidence.filter((e) => e.mandatory && !e.collected).length;
    const overdueStrict = matter.deadlines.filter((d) => {
      const r = daysBetween(matter.asOf, d.dueDate);
      return r !== null && r < 0 && d.strict;
    }).length;
    const imminentStrict = matter.deadlines.filter((d) => {
      const r = daysBetween(matter.asOf, d.dueDate);
      return r !== null && r >= 0 && r <= 7 && d.strict;
    }).length;
    const unknownRequired = stage
      ? stage.requiredFacts.filter((f) => {
          const fact = matter.facts.find((x) => x.field === f);
          return !fact || fact.status === "unknown";
        }).length
      : 0;

    if (overdueStrict > 0 || imminentStrict > 0) {
      options.push({ key: "stabilize_deadlines", labelHe: "לייצב חזית מועדים לפני כל צעד מהותי",
        rationaleHe: "קיים לחץ מועדים קשיח שעלול לשלול זכויות דיוניות", weight: 5 });
    }
    if (missingMandatoryEvidence > 0 || unknownRequired > 0) {
      options.push({ key: "gather_evidence", labelHe: "להשלים איסוף ראיות ואימות עובדות מהותיות",
        rationaleHe: `חסרות ${missingMandatoryEvidence} ראיות מהותיות ו-${unknownRequired} עובדות נדרשות`, weight: 4 });
    }

    const kind = stage?.kind;
    if (kind === "pre_litigation") {
      options.push({ key: "seek_settlement", labelHe: "לבחון פנייה מקדימה / הסדר טרם הגשה",
        rationaleHe: "שלב טרום-התדיינות מאפשר פתרון מהיר וחסכוני", weight: 3 });
      if (missingMandatoryEvidence === 0 && unknownRequired === 0) {
        options.push({ key: "prepare_filing", labelHe: "להתחיל בהכנת כתבי טענות",
          rationaleHe: "התשתית הראייתית/עובדתית לשלב מוכנה", weight: 3 });
      }
    } else if (kind === "interim_relief") {
      options.push({ key: "seek_interim_relief", labelHe: "לשקול בקשה לסעד זמני",
        rationaleHe: "מסלול זה כולל אפשרות לסעד ביניים דחוף", weight: 3 });
    } else if (kind && missingMandatoryEvidence === 0 && unknownRequired === 0 && overdueStrict === 0) {
      options.push({ key: "proceed", labelHe: `להתקדם בשלב הנוכחי (${stage?.titleHe})`,
        rationaleHe: "אין חסמים ראייתיים/עובדתיים/מועדיים מהותיים", weight: 2 });
    }

    if (options.length === 0) {
      options.push({ key: "proceed", labelHe: "להמשיך במסלול הקיים", rationaleHe: "לא זוהו אילוצים המחייבים שינוי אסטרטגיה", weight: 1 });
    }

    options.sort((a, b) => b.weight - a.weight);
    const recommended = options[0];
    findings.push(finding("strategy-recommendation", "info",
      `אסטרטגיה מומלצת: ${recommended.labelHe} — ${recommended.rationaleHe}`, "what_next"));
    actions.push(action("strategy-adopt", `לאמץ/לדחות אסטרטגיה: ${recommended.labelHe}`, "partner",
      recommended.rationaleHe, "medium"));

    return assessment(this.name, this.version, {
      score: null,
      status: "healthy",
      findings,
      actions,
      data: { options, recommended: recommended.key },
      confidence: 0.65,
      requiresHumanReview: true,
    });
  },
};

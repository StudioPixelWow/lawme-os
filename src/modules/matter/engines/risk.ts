/**
 * Risk Engine (Epic 4) — core engine. Builds a structured risk register across
 * five dimensions: procedural (deadlines), evidentiary, factual, client, and
 * financial. Each risk carries a severity and a "why". The engine is
 * deterministic and reads the matter directly so it does not depend on other
 * engines' ordering. Score is an inverted risk index (1 = low risk).
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction, Severity } from "../types.ts";
import { currentStage } from "../state-machine.ts";
import { action, assessment, daysBetween, finding, score01, worst } from "./framework.ts";

export const RISK_ENGINE_VERSION = "matter-risk-1.0.0";

export interface RiskItem {
  code: string;
  dimension: "procedural" | "evidentiary" | "factual" | "client" | "financial";
  severity: Severity;
  messageHe: string;
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  info: 0, low: 0.1, medium: 0.25, high: 0.5, critical: 1,
};

export const riskEngine: MatterEngine = {
  name: "matter-risk",
  version: RISK_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const stage = currentStage(matter);
    const risks: RiskItem[] = [];

    // --- procedural risk: overdue/imminent strict deadlines
    for (const d of matter.deadlines) {
      const rem = daysBetween(matter.asOf, d.dueDate);
      if (rem === null) {
        if (d.strict) risks.push({ code: `proc:unscheduled:${d.id}`, dimension: "procedural", severity: "medium", messageHe: `מועד קשיח ללא תאריך: ${d.labelHe}` });
      } else if (rem < 0) {
        risks.push({ code: `proc:overdue:${d.id}`, dimension: "procedural", severity: d.strict ? "critical" : "high", messageHe: `חריגה ממועד: ${d.labelHe}` });
      } else if (rem <= 7 && d.strict) {
        risks.push({ code: `proc:imminent:${d.id}`, dimension: "procedural", severity: "high", messageHe: `מועד קשיח מתקרב: ${d.labelHe}` });
      }
    }

    // --- evidentiary risk: missing mandatory evidence
    const missingEvidence = matter.evidence.filter((e) => e.mandatory && !e.collected);
    for (const e of missingEvidence) {
      risks.push({ code: `evid:${e.id}`, dimension: "evidentiary", severity: "high", messageHe: `ראיה מהותית חסרה: ${e.labelHe}` });
    }

    // --- factual risk: required facts unknown/disputed
    const reqFields = new Set(stage?.requiredFacts ?? []);
    for (const f of matter.facts) {
      if (reqFields.has(f.field) && (f.status === "unknown")) {
        risks.push({ code: `fact:unknown:${f.field}`, dimension: "factual", severity: "high", messageHe: `עובדה מהותית לא ידועה: ${f.field}` });
      } else if (reqFields.has(f.field) && f.status === "disputed") {
        risks.push({ code: `fact:disputed:${f.field}`, dimension: "factual", severity: "medium", messageHe: `עובדה מהותית שנויה במחלוקת: ${f.field}` });
      }
    }
    // required fields with no fact record at all
    for (const field of reqFields) {
      if (!matter.facts.some((f) => f.field === field)) {
        risks.push({ code: `fact:absent:${field}`, dimension: "factual", severity: "high", messageHe: `עובדה מהותית חסרה לחלוטין: ${field}` });
      }
    }

    // --- client risk
    if (matter.client.responsiveness === "unreachable") {
      risks.push({ code: "client:unreachable", dimension: "client", severity: "high", messageHe: "הלקוח אינו זמין — עלול לעכב צעדים דחופים" });
    } else if (matter.client.responsiveness === "slow") {
      risks.push({ code: "client:slow", dimension: "client", severity: "medium", messageHe: "היענות איטית של הלקוח" });
    }

    // --- financial risk
    if (matter.financials.writeOffRiskHe) {
      risks.push({ code: "fin:writeoff", dimension: "financial", severity: "medium", messageHe: `סיכון גבייה: ${matter.financials.writeOffRiskHe}` });
    }
    const outstanding = matter.financials.outstandingAmount ?? 0;
    const billed = matter.financials.billedAmount ?? 0;
    if (billed > 0 && outstanding / billed >= 0.5) {
      risks.push({ code: "fin:high-outstanding", dimension: "financial", severity: "medium", messageHe: "יתרה פתוחה גבוהה ביחס לחיוב" });
    }

    const findings: Finding[] = risks.map((r) =>
      finding(`risk:${r.code}`, r.severity, `[${r.dimension}] ${r.messageHe}`, "why"));

    const actions: RecommendedAction[] = [];
    const topRisk = risks.reduce<Severity>((s, r) => worst(s, r.severity), "info");
    if (topRisk === "critical" || topRisk === "high") {
      actions.push(action("risk-mitigation-review",
        "לקיים בחינת סיכונים ממוקדת ולתעדף פעולות מיטיגציה", "senior_lawyer",
        "קיימים סיכונים ברמת חומרה גבוהה הדורשים החלטת שותף", topRisk));
    }

    // risk index → inverted score. Sum weighted risk, saturate.
    const riskIndex = Math.min(1, risks.reduce((sum, r) => sum + SEVERITY_WEIGHT[r.severity], 0));
    const score = score01(1 - riskIndex);

    // group counts by dimension for structured payload
    const byDimension: Record<string, number> = {};
    for (const r of risks) byDimension[r.dimension] = (byDimension[r.dimension] ?? 0) + 1;

    return assessment(this.name, this.version, {
      score,
      findings,
      actions,
      data: { risks, riskIndex: Math.round(riskIndex * 1000) / 1000, byDimension, topRisk },
      confidence: 0.75,
      requiresHumanReview: topRisk === "critical" || topRisk === "high",
    });
  },
};

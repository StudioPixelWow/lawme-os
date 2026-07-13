/**
 * Matter Score — dimension registry (Epic 4.2).
 * Declares each score dimension, its Hebrew label, the engine assessment(s) it
 * consumes, and whether a numeric 0..100 is justified for it. The score layer
 * READS these assessments; it never recomputes domain facts.
 */
import type { ScoreDimensionId } from "./types.ts";

export interface DimensionSpec {
  id: ScoreDimensionId;
  labelHe: string;
  /** primary engine name(s) the dimension is derived from */
  engines: string[];
  /** numeric 0..100 is meaningful (measurable completeness) vs categorical-only */
  numericEligible: boolean;
  required: boolean;
}

export const DIMENSION_SPECS: DimensionSpec[] = [
  // legal certainty is categorical — no false-precision number
  { id: "legal", labelHe: "משפטי", engines: ["matter-legal"], numericEligible: false, required: true },
  // procedure position derives from the state machine + readiness gating
  { id: "procedure", labelHe: "הליך", engines: ["matter-readiness"], numericEligible: false, required: true },
  { id: "evidence", labelHe: "ראיות", engines: ["matter-evidence"], numericEligible: true, required: true },
  { id: "documents", labelHe: "מסמכים", engines: ["matter-document"], numericEligible: true, required: true },
  // deadlines are categorical (overdue/imminent) — no percentage
  { id: "deadlines", labelHe: "מועדים", engines: ["matter-deadline"], numericEligible: false, required: true },
  { id: "readiness", labelHe: "מוכנות", engines: ["matter-readiness"], numericEligible: true, required: true },
  { id: "progress", labelHe: "התקדמות", engines: ["matter-progress"], numericEligible: true, required: true },
  // client sentiment/policy is categorical
  { id: "client", labelHe: "לקוח", engines: ["matter-client"], numericEligible: false, required: true },
  { id: "communication", labelHe: "תקשורת", engines: ["matter-communication"], numericEligible: false, required: true },
  { id: "team", labelHe: "צוות", engines: ["matter-team"], numericEligible: true, required: true },
  // finance numeric only when data present; else unavailable
  { id: "finance", labelHe: "פיננסי", engines: ["matter-financial"], numericEligible: true, required: true },
  { id: "risk", labelHe: "סיכון", engines: ["matter-risk"], numericEligible: true, required: true },
  // optional
  { id: "outcomeReadiness", labelHe: "מוכנות לתוצאה", engines: ["matter-outcome"], numericEligible: false, required: false },
];

export function dimensionSpec(id: ScoreDimensionId): DimensionSpec {
  const s = DIMENSION_SPECS.find((d) => d.id === id);
  if (!s) throw new Error(`unknown score dimension: ${id}`);
  return s;
}

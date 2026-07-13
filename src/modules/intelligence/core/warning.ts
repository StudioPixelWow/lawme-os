/**
 * Shared intelligence primitive — Warning contract (Epic 4.1).
 * Warnings are never swallowed. A degraded/stale/partial condition surfaces as
 * a structured warning that rolls up into the assessment envelope.
 */
import type { Severity } from "./severity.ts";

export type WarningKind =
  | "stale_inputs"
  | "partial_data"
  | "degraded_dependency"
  | "engine_unavailable"
  | "coverage_gap"
  | "policy_restriction"
  | "other";

export interface Warning {
  code: string;
  kind: WarningKind;
  messageHe: string;
  severity: Severity;
}

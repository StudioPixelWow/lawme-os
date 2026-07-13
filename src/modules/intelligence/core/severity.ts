/**
 * Shared intelligence primitive — Severity (Epic 4.1).
 * Neutral severity scale used by every intelligence domain. Contains NO domain
 * logic — only the scale and its ordering.
 */

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export const SEVERITY_ORDER: readonly Severity[] = ["info", "low", "medium", "high", "critical"];

export function severityRank(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s);
}

/** Return the more severe of two severities. */
export function worstSeverity(a: Severity, b: Severity): Severity {
  return severityRank(a) >= severityRank(b) ? a : b;
}

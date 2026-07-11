/**
 * Validation helpers on top of normalization — used by ingestion
 * (reject/flag inputs) and by the benchmark harness.
 */
import { normalizeCaseNumber } from "./normalize.ts";
import type { NormalizedCaseNumber } from "./normalize.ts";

export interface CaseNumberValidation {
  input: string;
  valid: boolean;
  normalized: NormalizedCaseNumber;
  /** severity: parse failure = error; suspicious values = warning */
  errors: string[];
  warnings: string[];
}

export function validateCaseNumber(input: string): CaseNumberValidation {
  const normalized = normalizeCaseNumber(input);
  const errors: string[] = [];
  const warnings: string[] = [...normalized.warnings];

  if (!normalized.ok) errors.push("לא ניתן לנתח את מספר ההליך");
  if (normalized.ok && normalized.confidence < 0.8) {
    warnings.push(`רמת ביטחון נמוכה (${normalized.confidence.toFixed(2)}) — מומלץ אימות ידני`);
  }
  if (normalized.ok && !normalized.procedure) {
    warnings.push("קוד ההליך אינו במרשם הקודים — court hints לא זמינים");
  }

  return { input, valid: errors.length === 0, normalized, errors, warnings };
}

/** True when two raw strings denote the same proceeding. */
export function sameProceeding(a: string, b: string): boolean {
  const ka = normalizeCaseNumber(a).searchKey;
  const kb = normalizeCaseNumber(b).searchKey;
  return ka !== null && ka === kb;
}

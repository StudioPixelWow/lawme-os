/**
 * Capability 1 · Slice 1.0.1 — Bootstrap Validation Engine: the result value.
 *
 * `BootstrapValidationResult` is the single go/no-go signal. The core invariant
 * is enforced BY CONSTRUCTION here: an invalid result can never carry a
 * `normalizedDraft`, and a valid result must carry one and have zero blocking
 * issues. Callers therefore cannot observe an "invalid but planned" state.
 */

import type { BootstrapValidationIssue, BootstrapValidationWarning, BootstrapValidationInfo } from "./issues.ts";
import type { ValidatedBootstrapDraft } from "./contracts.ts";

/** Per-section counts. `considered` = presented for validation; `accepted` =
 *  passed into the normalized draft; `dropped` = considered − accepted. */
export interface SectionStat {
  readonly considered: number;
  readonly accepted: number;
  readonly dropped: number;
}

export interface ValidationStatistics {
  readonly participants: SectionStat;
  readonly facts: SectionStat;
  readonly deadlines: SectionStat;
  readonly evidence: SectionStat;
  readonly contacts: SectionStat;
  readonly issues: number;
  readonly warnings: number;
  readonly infos: number;
}

export interface BootstrapValidationResult {
  readonly valid: boolean;
  readonly blockingIssues: readonly BootstrapValidationIssue[];
  readonly warnings: readonly BootstrapValidationWarning[];
  readonly infos: readonly BootstrapValidationInfo[];
  /** Present ONLY when `valid` is true. Absent (undefined) on any failure. */
  readonly normalizedDraft?: ValidatedBootstrapDraft;
  readonly validationVersion: string;
  /** Optional telemetry; the pure engine leaves it undefined (no clock/duration). */
  readonly validationDurationMs?: number;
  readonly statistics: ValidationStatistics;
}

export function emptyStat(): SectionStat {
  return { considered: 0, accepted: 0, dropped: 0 };
}

export function makeStat(considered: number, accepted: number): SectionStat {
  return { considered, accepted, dropped: considered - accepted };
}

/** Build a FAILED result. Enforces `valid=false ⇒ normalizedDraft=undefined`. */
export function failedResult(
  blockingIssues: readonly BootstrapValidationIssue[],
  warnings: readonly BootstrapValidationWarning[],
  infos: readonly BootstrapValidationInfo[],
  validationVersion: string,
  statistics: ValidationStatistics,
): BootstrapValidationResult {
  return Object.freeze({
    valid: false,
    blockingIssues: Object.freeze([...blockingIssues]),
    warnings: Object.freeze([...warnings]),
    infos: Object.freeze([...infos]),
    // normalizedDraft intentionally absent.
    validationVersion,
    statistics,
  });
}

/** Build a VALID result. Requires zero blocking issues + a normalized draft. */
export function validResult(
  normalizedDraft: ValidatedBootstrapDraft,
  warnings: readonly BootstrapValidationWarning[],
  infos: readonly BootstrapValidationInfo[],
  validationVersion: string,
  statistics: ValidationStatistics,
): BootstrapValidationResult {
  return Object.freeze({
    valid: true,
    blockingIssues: Object.freeze([]),
    warnings: Object.freeze([...warnings]),
    infos: Object.freeze([...infos]),
    normalizedDraft,
    validationVersion,
    statistics,
  });
}

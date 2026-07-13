/**
 * Shared intelligence primitive — Blocking Condition contract (Epic 4.1).
 * The neutral shape of "something preventing progress". Domains use their own
 * `kind` vocabulary (procedural for Matter, coverage for Dino, etc.) but the
 * envelope is shared.
 */
import type { Severity } from "./severity.ts";

export interface BlockingCondition {
  code: string;
  /** domain-specific kind, e.g. "missing_fact" | "policy" | "deadline" */
  kind: string;
  messageHe: string;
  severity: Severity;
}

/**
 * Capability 1 · Slice 1.0.5 — safe mapping helpers.
 *
 * Turns Validation Engine issues and RPC outcomes into the stable application
 * result union. All copy is safe Hebrew; developer/SQL text never crosses this
 * boundary. Anti-enumeration is preserved (opaque RESOURCE_NOT_AVAILABLE).
 */

import type { BootstrapValidationIssue, BootstrapValidationWarning } from "../bootstrap/index.ts";
import type { BootstrapRpcOutcome } from "./rpc-gateway.ts";
import { type BootstrapMatterApplicationResult, type SafeIssue, messageForKind } from "./result.ts";

export function toSafeValidationIssues(issues: readonly BootstrapValidationIssue[]): SafeIssue[] {
  return issues.map((i) => ({ code: i.stableCode, field: i.field, messageHe: i.userMessageHe }));
}

export function toSafeValidationWarnings(warnings: readonly BootstrapValidationWarning[]): SafeIssue[] {
  return warnings.map((w) => ({ code: w.code, field: w.field, messageHe: w.messageHe }));
}

/**
 * Map a non-success RPC outcome to a safe application result. CREATED /
 * ALREADY_COMMITTED are handled in the use case (they require a Matter-read
 * authorization gate before a Matter id may be revealed).
 */
export function mapRpcNonSuccess(
  outcome: Exclude<BootstrapRpcOutcome, { code: "BOOTSTRAP_CREATED" } | { code: "BOOTSTRAP_ALREADY_COMMITTED" }>,
  correlationId: string,
): BootstrapMatterApplicationResult {
  switch (outcome.code) {
    case "BOOTSTRAP_STALE_DRAFT":
      return { kind: "DRAFT_STALE", correlationId, messageHe: messageForKind("DRAFT_STALE") };
    case "BOOTSTRAP_IDEMPOTENCY_CONFLICT":
      return { kind: "IDEMPOTENCY_CONFLICT", correlationId, messageHe: messageForKind("IDEMPOTENCY_CONFLICT") };
    case "BOOTSTRAP_NOT_AVAILABLE":
      return { kind: "RESOURCE_NOT_AVAILABLE", correlationId, messageHe: messageForKind("RESOURCE_NOT_AVAILABLE") };
    case "BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED":
      return { kind: "BOOTSTRAP_LIMIT_EXCEEDED", correlationId, messageHe: messageForKind("BOOTSTRAP_LIMIT_EXCEEDED") };
    case "BOOTSTRAP_SLUG_CONFLICT":
      return { kind: "BOOTSTRAP_INTERNAL_FAILURE", correlationId, messageHe: messageForKind("BOOTSTRAP_INTERNAL_FAILURE") };
    case "BOOTSTRAP_RPC_ERROR":
      return {
        kind: "BOOTSTRAP_INTERNAL_FAILURE",
        correlationId,
        messageHe: messageForKind("BOOTSTRAP_INTERNAL_FAILURE"),
      };
  }
}

/**
 * Capability 1 · Slice 1.0.F — Canonical Bootstrap AggregateLimitPolicy (v1).
 *
 * The SINGLE source of truth for the maximum size of a Matter aggregate created
 * by Bootstrap v1. Enforced as HARD BLOCKING ceilings by the pure Validation
 * Engine, mirrored (equal-or-stricter) by the RPC persistence backstop, and
 * CI-verified identical across the TypeScript and SQL layers.
 *
 * These are hard ceilings, not truncation targets: exceeding any limit makes the
 * draft invalid (no plan, no partial write, no silent dropping). Members is an
 * exact-count invariant — Bootstrap v1 always creates exactly one owner member
 * bound to the confirming actor.
 */

export const BOOTSTRAP_AGGREGATE_LIMITS_VERSION = "bootstrap-aggregate-limits-v1";

export interface AggregateLimitPolicy {
  readonly contacts: number;
  readonly participants: number;
  readonly facts: number;
  readonly deadlines: number;
  readonly evidence: number;
  /** Exact required member count in Bootstrap v1 (owner bound to the confirming actor). */
  readonly members: number;
}

export const BOOTSTRAP_AGGREGATE_LIMITS: AggregateLimitPolicy = Object.freeze({
  contacts: 100,
  participants: 100,
  facts: 500,
  deadlines: 200,
  evidence: 200,
  members: 1,
});

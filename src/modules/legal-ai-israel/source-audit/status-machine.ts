/**
 * Collector-status state machine. Only these transitions are legal; anything
 * else throws. Keeps the registry's lifecycle honest and auditable.
 */
import type { CollectorStatus } from "./types.ts";

const TRANSITIONS: Record<CollectorStatus, CollectorStatus[]> = {
  not_evaluated: ["audit_required"],
  audit_required: ["ready_to_build", "permission_required", "blocked", "not_evaluated"],
  ready_to_build: ["development", "permission_required", "blocked", "audit_required"],
  permission_required: ["ready_to_build", "blocked", "audit_required"],
  blocked: ["audit_required", "retired"],
  development: ["testing", "blocked", "paused"],
  testing: ["active", "development", "blocked", "paused"],
  active: ["paused", "blocked", "retired"],
  paused: ["active", "blocked", "retired"],
  retired: [],
};

export function canTransition(from: CollectorStatus, to: CollectorStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class IllegalStatusTransitionError extends Error {
  constructor(from: CollectorStatus, to: CollectorStatus) {
    super(`illegal collector_status transition: ${from} → ${to}`);
    this.name = "IllegalStatusTransitionError";
  }
}

export function assertTransition(from: CollectorStatus, to: CollectorStatus): void {
  if (from === to) return;
  if (!canTransition(from, to)) throw new IllegalStatusTransitionError(from, to);
}

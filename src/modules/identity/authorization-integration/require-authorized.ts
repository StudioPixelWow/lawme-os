/**
 * Decision enforcement (Capability 0.8, Slice 0.8.4).
 *
 * The single choke-point every protected flow calls after obtaining a decision:
 * authorized → return; denied → throw a canonical ResourceAuthorizationError.
 * Routes NEVER branch on role/owner/membership/confidentiality — they call the
 * canonical policy (via the orchestration service) and then this.
 */
import type { ResourceAuthorizationDecision } from "../authorization-policy/index.ts";
import { ResourceAuthorizationError } from "./errors.ts";

/** Throw a safe ResourceAuthorizationError unless the decision allows. */
export function requireAuthorized(decision: ResourceAuthorizationDecision): void {
  if (decision.allowed) return;
  throw new ResourceAuthorizationError(decision);
}

/** Non-throwing guard for callers that prefer a boolean + safe error to map. */
export function isAuthorized(decision: ResourceAuthorizationDecision): boolean {
  return decision.allowed;
}

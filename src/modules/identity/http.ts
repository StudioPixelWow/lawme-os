/**
 * Safe API error mapping for Identity/Authorization (Capability 0.8, Slice 0.8.2).
 *
 * Maps an IdentityAuthorizationError to the canonical safe envelope
 * `{ ok:false, code, messageHe, correlationId }` with the right HTTP status.
 * Never leaks SQL, cookie, token, membership, or Supabase error strings.
 */
import { IdentityAuthorizationError, type AuthorizationDecisionCode } from "./errors.ts";
import { ensureCorrelationId } from "./correlation.ts";

export interface SafeApiError {
  readonly ok: false;
  readonly code: AuthorizationDecisionCode;
  readonly messageHe: string;
  readonly correlationId: string;
}

/** Map any error into a safe { status, body } for a route handler. */
export function toSafeApiError(error: unknown, fallbackCorrelationId?: string): { status: number; body: SafeApiError } {
  if (error instanceof IdentityAuthorizationError) {
    return {
      status: error.httpStatus,
      body: { ok: false, code: error.code, messageHe: error.safeMessageHe, correlationId: error.correlationId },
    };
  }
  // Unknown error — never surface its message.
  return {
    status: 500,
    body: { ok: false, code: "ACTOR_RESOLUTION_FAILED", messageHe: "אירעה שגיאה בלתי צפויה.", correlationId: ensureCorrelationId(fallbackCorrelationId) },
  };
}

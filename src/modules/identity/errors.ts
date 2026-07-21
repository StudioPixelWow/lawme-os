/**
 * Stable Identity/Authorization errors + decision contract (Capability 0.8).
 *
 * Codes are the ONLY authorization signal — never string-match a message. Errors
 * carry safe Hebrew copy and a correlation id; they NEVER carry membership lists,
 * internal role/capability maps, cross-tenant existence, SQL, or auth tokens.
 */

/** Error codes (every non-AUTHORIZED outcome). */
export type IdentityAuthorizationCode =
  | "UNAUTHENTICATED"
  | "ACTOR_PROFILE_NOT_FOUND"
  | "NO_ACTIVE_ORGANIZATION"
  | "ORGANIZATION_SELECTION_REQUIRED"
  | "INACTIVE_MEMBERSHIP"
  | "CAPABILITY_DENIED"
  | "TENANT_MISMATCH"
  | "ACTOR_TYPE_DENIED"
  | "ACTOR_RESOLUTION_FAILED";

/** Decision codes (authorization outcome, incl. success). */
export type AuthorizationDecisionCode = "AUTHORIZED" | IdentityAuthorizationCode;

export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly code: AuthorizationDecisionCode;
  readonly policyVersion: string;
  readonly correlationId: string;
}

const HTTP_STATUS: Readonly<Record<IdentityAuthorizationCode, number>> = {
  UNAUTHENTICATED: 401,
  ACTOR_PROFILE_NOT_FOUND: 403,
  NO_ACTIVE_ORGANIZATION: 403,
  ORGANIZATION_SELECTION_REQUIRED: 409,
  INACTIVE_MEMBERSHIP: 403,
  CAPABILITY_DENIED: 403,
  TENANT_MISMATCH: 403,
  ACTOR_TYPE_DENIED: 403,
  ACTOR_RESOLUTION_FAILED: 403,
};

/** Safe, generic Hebrew copy — deliberately non-specific (no tenant/actor data). */
const SAFE_MESSAGE_HE: Readonly<Record<IdentityAuthorizationCode, string>> = {
  UNAUTHENTICATED: "נדרשת הזדהות.",
  ACTOR_PROFILE_NOT_FOUND: "לא נמצא פרופיל פעיל למשתמש.",
  NO_ACTIVE_ORGANIZATION: "אין חברות ארגונית פעילה.",
  ORGANIZATION_SELECTION_REQUIRED: "יש לבחור ארגון פעיל.",
  INACTIVE_MEMBERSHIP: "החברות בארגון אינה פעילה.",
  CAPABILITY_DENIED: "אין הרשאה לפעולה זו.",
  TENANT_MISMATCH: "הבקשה אינה תואמת את הארגון הפעיל.",
  ACTOR_TYPE_DENIED: "סוג השחקן אינו מורשה לפעולה זו.",
  ACTOR_RESOLUTION_FAILED: "לא ניתן לזהות את הקשר הפעולה.",
};

export interface IdentityAuthorizationErrorOptions {
  /** Optional NON-SENSITIVE developer detail (never shown to the browser as-is). */
  readonly detail?: string;
  readonly cause?: unknown;
}

/** Stable, safe error for identity/authorization failures. */
export class IdentityAuthorizationError extends Error {
  readonly code: IdentityAuthorizationCode;
  readonly safeMessageHe: string;
  readonly httpStatus: number;
  readonly correlationId: string;
  /** Non-sensitive developer detail; never place secrets/PII/tenant data here. */
  readonly detail?: string;

  constructor(code: IdentityAuthorizationCode, correlationId: string, options?: IdentityAuthorizationErrorOptions) {
    // The Error message is the STABLE CODE only — safe for logs, never parsed for logic.
    super(code);
    this.name = "IdentityAuthorizationError";
    this.code = code;
    this.safeMessageHe = SAFE_MESSAGE_HE[code];
    this.httpStatus = HTTP_STATUS[code];
    this.correlationId = correlationId;
    this.detail = options?.detail;
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }

  /** A safe decision projection (never leaks internal detail). */
  toDecision(policyVersion: string): AuthorizationDecision {
    return { allowed: false, code: this.code, policyVersion, correlationId: this.correlationId };
  }
}

/** Build a positive decision. */
export function authorizedDecision(policyVersion: string, correlationId: string): AuthorizationDecision {
  return { allowed: true, code: "AUTHORIZED", policyVersion, correlationId };
}

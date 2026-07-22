/**
 * Resource authorization ENFORCEMENT errors + safe mapping (Cap 0.8, Slice 0.8.4).
 *
 * A denied `ResourceAuthorizationDecision` becomes a `ResourceAuthorizationError`
 * that carries the STABLE internal policy code (for telemetry) but renders to the
 * client only a SAFE external envelope. Two privacy buckets:
 *
 *  - VISIBILITY denials (tenant mismatch, owner/member/reviewer required,
 *    confidentiality, inactive assignment, audit access, absent/malformed facts)
 *    → a uniform 404 `RESOURCE_NOT_AVAILABLE`. Anti-enumeration: a matter in
 *    another tenant and a matter you simply aren't on look identical, and the
 *    message never says "another organization", "not a member", or "privileged".
 *  - CAPABILITY/action denials (missing capability, actor type, approval
 *    authority) → 403 `RESOURCE_FORBIDDEN` (about the actor's permissions, not the
 *    resource's existence).
 *  - status → 409; unsupported action → 400 (programming error).
 *
 * (Deliberate choice: visibility denials render as 404 rather than 403 to satisfy
 * the "never reveal membership/confidentiality/existence" rule; documented for
 * founder review.)
 */
import type { ResourceAction, ResourceAuthorizationCode, ResourceAuthorizationDecision, ResourceType } from "../authorization-policy/index.ts";

export type SafeExternalCode =
  | "RESOURCE_NOT_AVAILABLE"
  | "RESOURCE_FORBIDDEN"
  | "RESOURCE_STATUS_CONFLICT"
  | "RESOURCE_BAD_REQUEST"
  | "RESOURCE_INTERNAL_ERROR";

interface ExternalRendering {
  readonly status: number;
  readonly externalCode: SafeExternalCode;
  readonly messageHe: string;
}

const NOT_AVAILABLE: ExternalRendering = { status: 404, externalCode: "RESOURCE_NOT_AVAILABLE", messageHe: "המשאב אינו זמין." };
const FORBIDDEN: ExternalRendering = { status: 403, externalCode: "RESOURCE_FORBIDDEN", messageHe: "אין לך הרשאה לפעולה זו." };
const STATUS_CONFLICT: ExternalRendering = { status: 409, externalCode: "RESOURCE_STATUS_CONFLICT", messageHe: "הפעולה אינה זמינה במצב הנוכחי של המשאב." };
const BAD_REQUEST: ExternalRendering = { status: 400, externalCode: "RESOURCE_BAD_REQUEST", messageHe: "בקשה לא נתמכת." };

/** Internal policy code → safe external rendering. */
function render(code: ResourceAuthorizationCode): ExternalRendering {
  switch (code) {
    // visibility / existence-revealing → uniform not-available
    case "RESOURCE_TENANT_MISMATCH":
    case "RESOURCE_OWNER_OR_MEMBER_REQUIRED":
    case "RESOURCE_MEMBERSHIP_REQUIRED":
    case "RESOURCE_CONFIDENTIALITY_DENIED":
    case "RESOURCE_REVIEWER_REQUIRED":
    case "RESOURCE_INACTIVE_ASSIGNMENT":
    case "RESOURCE_AUDIT_ACCESS_DENIED":
    case "RESOURCE_INVALID_POLICY_FACTS":
      return NOT_AVAILABLE;
    // actor capability / action authority → forbidden
    case "RESOURCE_CAPABILITY_DENIED":
    case "RESOURCE_ACTOR_TYPE_DENIED":
    case "RESOURCE_APPROVAL_DENIED":
      return FORBIDDEN;
    case "RESOURCE_STATUS_DENIED":
      return STATUS_CONFLICT;
    case "RESOURCE_ACTION_UNSUPPORTED":
      return BAD_REQUEST;
    case "RESOURCE_AUTHORIZED":
      return FORBIDDEN; // never reached (authorized is not an error)
  }
}

export interface SafeResourceApiError {
  readonly ok: false;
  readonly code: SafeExternalCode;
  readonly messageHe: string;
  readonly correlationId: string;
}

/** Thrown by `requireAuthorized` on a denied decision. Carries the internal code
 *  for telemetry; `toSafeBody()` produces the client-facing envelope. */
export class ResourceAuthorizationError extends Error {
  readonly code: ResourceAuthorizationCode; // STABLE internal (telemetry only)
  readonly resourceType: ResourceType;
  readonly action: ResourceAction;
  readonly correlationId: string;
  readonly httpStatus: number;
  readonly externalCode: SafeExternalCode;
  readonly safeMessageHe: string;

  constructor(decision: ResourceAuthorizationDecision) {
    const r = render(decision.code);
    super(`resource authorization denied: ${decision.code}`);
    this.name = "ResourceAuthorizationError";
    this.code = decision.code;
    this.resourceType = decision.resourceType;
    this.action = decision.action;
    this.correlationId = decision.correlationId;
    this.httpStatus = r.status;
    this.externalCode = r.externalCode;
    this.safeMessageHe = r.messageHe;
  }

  /** The client-facing envelope — never carries the internal code or any detail. */
  toSafeBody(): SafeResourceApiError {
    return { ok: false, code: this.externalCode, messageHe: this.safeMessageHe, correlationId: this.correlationId };
  }
}

/** Map ANY thrown error to a safe { status, body }. A ResourceAuthorizationError
 *  renders its bucket; anything else (incl. a loader/store failure) becomes a
 *  generic 500 that never leaks a DB/SQL/Supabase message. */
export function toSafeResourceApiError(error: unknown, correlationId: string): { status: number; body: SafeResourceApiError } {
  if (error instanceof ResourceAuthorizationError) {
    return { status: error.httpStatus, body: error.toSafeBody() };
  }
  return {
    status: 500,
    body: { ok: false, code: "RESOURCE_INTERNAL_ERROR", messageHe: "אירעה שגיאה בלתי צפויה.", correlationId },
  };
}

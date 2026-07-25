/**
 * Capability 1 · Slice 1.0.5 — Bootstrap application result contract.
 *
 * A stable, safe union returned by the canonical use case. It NEVER exposes the
 * raw Draft, raw plan/aggregate, database role, SQLSTATE, internal RPC name,
 * Contact data, other user IDs, cross-tenant existence, or raw error text. The
 * Matter id is included ONLY on an authorized success.
 */

export type BootstrapMatterResultKind =
  | "MATTER_CREATED"
  | "MATTER_ALREADY_CREATED"
  | "VALIDATION_BLOCKED"
  | "DRAFT_STALE"
  | "IDEMPOTENCY_CONFLICT"
  | "RESOURCE_NOT_AVAILABLE"
  | "BOOTSTRAP_LIMIT_EXCEEDED"
  | "BOOTSTRAP_UNAVAILABLE"
  | "BOOTSTRAP_INTERNAL_FAILURE";

export interface SafeIssue {
  readonly code: string;
  readonly field: string | null;
  readonly messageHe: string;
}

interface ResultBase {
  readonly correlationId: string;
  readonly messageHe: string;
}

export type BootstrapMatterApplicationResult =
  | (ResultBase & {
      readonly kind: "MATTER_CREATED";
      readonly matterId: string;
      readonly matterHref: string;
      readonly idempotent: false;
    })
  | (ResultBase & {
      readonly kind: "MATTER_ALREADY_CREATED";
      readonly matterId: string | null;
      readonly matterHref: string | null;
      readonly idempotent: true;
    })
  | (ResultBase & {
      readonly kind: "VALIDATION_BLOCKED";
      readonly issues: readonly SafeIssue[];
      readonly warnings: readonly SafeIssue[];
    })
  | (ResultBase & { readonly kind: "DRAFT_STALE" })
  | (ResultBase & { readonly kind: "IDEMPOTENCY_CONFLICT" })
  | (ResultBase & { readonly kind: "RESOURCE_NOT_AVAILABLE" })
  | (ResultBase & { readonly kind: "BOOTSTRAP_LIMIT_EXCEEDED" })
  | (ResultBase & { readonly kind: "BOOTSTRAP_UNAVAILABLE" })
  | (ResultBase & { readonly kind: "BOOTSTRAP_INTERNAL_FAILURE" });

/** Safe Hebrew copy — machine `kind` is authoritative; copy is UI-only. */
const MESSAGES_HE: Record<BootstrapMatterResultKind, string> = {
  MATTER_CREATED: "התיק נוצר בהצלחה.",
  MATTER_ALREADY_CREATED: "התיק כבר נוצר עבור טיוטה זו.",
  VALIDATION_BLOCKED: "לא ניתן לאשר את הטיוטה — יש פריטים שדורשים תיקון.",
  DRAFT_STALE: "הטיוטה עודכנה מאז הסקירה. יש לרענן ולסקור מחדש.",
  IDEMPOTENCY_CONFLICT: "בקשת האישור מתנגשת עם אישור קודם של אותה טיוטה.",
  RESOURCE_NOT_AVAILABLE: "הפעולה אינה זמינה.",
  BOOTSTRAP_LIMIT_EXCEEDED: "האינטייק כולל יותר מדי פריטים. יש לצמצם ולסקור מחדש לפני יצירת התיק.",
  BOOTSTRAP_UNAVAILABLE: "שירות יצירת התיק אינו זמין כרגע.",
  BOOTSTRAP_INTERNAL_FAILURE: "אירעה תקלה פנימית. הבקשה לא הושלמה.",
};

export function messageForKind(kind: BootstrapMatterResultKind): string {
  return MESSAGES_HE[kind];
}

/** Safe HTTP status for the confirmation endpoint. */
export function httpStatusForResult(kind: BootstrapMatterResultKind): number {
  switch (kind) {
    case "MATTER_CREATED":
      return 201;
    case "MATTER_ALREADY_CREATED":
      return 200;
    case "VALIDATION_BLOCKED":
    case "BOOTSTRAP_LIMIT_EXCEEDED":
      return 422;
    case "DRAFT_STALE":
    case "IDEMPOTENCY_CONFLICT":
      return 409;
    case "RESOURCE_NOT_AVAILABLE":
      return 404;
    case "BOOTSTRAP_UNAVAILABLE":
      return 503;
    case "BOOTSTRAP_INTERNAL_FAILURE":
      return 500;
  }
}

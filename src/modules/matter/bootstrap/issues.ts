/**
 * Capability 1 · Slice 1.0.1 — Bootstrap Validation Engine: frozen taxonomies.
 *
 * Stable machine CODES (never user-facing copy) + a matching Hebrew message for
 * each. Codes follow the platform convention (SCREAMING_SNAKE, like
 * `ResourceAuthorizationCode`). Node strip-types forbids `enum`, so every
 * vocabulary is a union type + a frozen `as const` array + a guard.
 *
 * `developerMessage` NEVER contains confidential draft text — only structural
 * facts (which section, which item id, which rule). `userMessageHe` is a safe,
 * reviewer-facing Hebrew sentence.
 */

/* ── Blocking issues (fail closed: any one ⇒ valid=false ⇒ no plan) ───────── */

export type BootstrapIssueCode =
  | "DRAFT_NOT_READY"
  | "DRAFT_ALREADY_CONFIRMED"
  | "DRAFT_EXPIRED"
  | "DRAFT_REJECTED"
  | "DRAFT_VERSION_CONFLICT"
  | "MISSING_MATTER_TYPE"
  | "MISSING_CLIENT"
  | "INVALID_PARTICIPANT"
  | "DUPLICATE_PARTICIPANT"
  | "AMBIGUOUS_CONTACT"
  | "UNKNOWN_CONTACT"
  | "INVALID_DEADLINE"
  | "INVALID_FACT"
  | "INVALID_EPISTEMIC_STATE"
  | "INVALID_ORGANIZATION"
  | "CROSS_TENANT_REFERENCE"
  | "INVALID_OWNER"
  | "UNSUPPORTED_EVIDENCE"
  | "UNKNOWN_ENUM"
  | "SCHEMA_MISMATCH"
  | "MALFORMED_DRAFT"
  | "UNSUPPORTED_VERSION";

export const BOOTSTRAP_ISSUE_CODES: readonly BootstrapIssueCode[] = [
  "DRAFT_NOT_READY",
  "DRAFT_ALREADY_CONFIRMED",
  "DRAFT_EXPIRED",
  "DRAFT_REJECTED",
  "DRAFT_VERSION_CONFLICT",
  "MISSING_MATTER_TYPE",
  "MISSING_CLIENT",
  "INVALID_PARTICIPANT",
  "DUPLICATE_PARTICIPANT",
  "AMBIGUOUS_CONTACT",
  "UNKNOWN_CONTACT",
  "INVALID_DEADLINE",
  "INVALID_FACT",
  "INVALID_EPISTEMIC_STATE",
  "INVALID_ORGANIZATION",
  "CROSS_TENANT_REFERENCE",
  "INVALID_OWNER",
  "UNSUPPORTED_EVIDENCE",
  "UNKNOWN_ENUM",
  "SCHEMA_MISMATCH",
  "MALFORMED_DRAFT",
  "UNSUPPORTED_VERSION",
] as const;

export function isBootstrapIssueCode(v: unknown): v is BootstrapIssueCode {
  return typeof v === "string" && (BOOTSTRAP_ISSUE_CODES as readonly string[]).includes(v);
}

/** Which codes a reviewer can clear by editing/re-reviewing the draft. All
 *  others are terminal for this draft (a new draft/idempotent path is required). */
const RETRYABLE_CODES: ReadonlySet<BootstrapIssueCode> = new Set<BootstrapIssueCode>([
  "DRAFT_NOT_READY",
  "DRAFT_VERSION_CONFLICT",
  "MISSING_MATTER_TYPE",
  "MISSING_CLIENT",
  "INVALID_PARTICIPANT",
  "DUPLICATE_PARTICIPANT",
  "AMBIGUOUS_CONTACT",
  "UNKNOWN_CONTACT",
  "INVALID_DEADLINE",
  "INVALID_FACT",
  "INVALID_OWNER",
  "UNSUPPORTED_EVIDENCE",
]);

/** Safe, reviewer-facing Hebrew copy per code (never leaks confidential text). */
const ISSUE_MESSAGE_HE: Readonly<Record<BootstrapIssueCode, string>> = {
  DRAFT_NOT_READY: "הטיוטה אינה במצב «מוכן לבדיקה» ולכן לא ניתן לאשר ממנה תיק.",
  DRAFT_ALREADY_CONFIRMED: "הטיוטה כבר אושרה ונוצר ממנה תיק.",
  DRAFT_EXPIRED: "תוקף הטיוטה פג ואין לאשר ממנה תיק.",
  DRAFT_REJECTED: "הטיוטה נדחתה ואין לאשר ממנה תיק.",
  DRAFT_VERSION_CONFLICT: "הטיוטה עודכנה מאז הבדיקה — יש לרענן ולבדוק מחדש.",
  MISSING_MATTER_TYPE: "לא נבחר סוג הליך לתיק.",
  MISSING_CLIENT: "חסר בעל דין בתפקיד «לקוח» — תיק עבודה מחייב לקוח.",
  INVALID_PARTICIPANT: "אחד המשתתפים אינו תקין או אינו קיים בטיוטה.",
  DUPLICATE_PARTICIPANT: "אותו משתתף בתפקיד זהה מופיע יותר מפעם אחת.",
  AMBIGUOUS_CONTACT: "אנשי קשר אפשריים כפולים — יש להכריע לפני אישור.",
  UNKNOWN_CONTACT: "איש הקשר המקושר אינו קיים או אינו נגיש.",
  INVALID_DEADLINE: "מועד אחרון אינו עקבי (מצב הוודאות והתאריך אינם תואמים).",
  INVALID_FACT: "עובדה אינה תקינה (מפתח או ניסוח חסר/חורג).",
  INVALID_EPISTEMIC_STATE: "סטטוס עובדה אסור באינטייק (למשל «מאושר»).",
  INVALID_ORGANIZATION: "הטיוטה אינה שייכת לארגון הפעיל.",
  CROSS_TENANT_REFERENCE: "הפניה לישות מארגון אחר — נחסם.",
  INVALID_OWNER: "בעל התיק אינו חבר פעיל בארגון.",
  UNSUPPORTED_EVIDENCE: "פריט ראיה אינו נתמך במבנה הנוכחי.",
  UNKNOWN_ENUM: "ערך מתוך רשימה סגורה אינו מזוהה.",
  SCHEMA_MISMATCH: "מבנה הטיוטה אינו תואם לסכימה הנתמכת.",
  MALFORMED_DRAFT: "הטיוטה פגומה או אינה קריאה.",
  UNSUPPORTED_VERSION: "גרסת הטיוטה אינה נתמכת על ידי מנוע האימות.",
};

/** A single blocking issue. `field`/`path` locate the offending value. */
export interface BootstrapValidationIssue {
  readonly stableCode: BootstrapIssueCode;
  readonly severity: "blocking";
  readonly field: string | null;
  readonly path: string | null;
  readonly retryable: boolean;
  readonly userMessageHe: string;
  /** Structural detail only — NEVER confidential draft content. */
  readonly developerMessage: string;
}

export interface IssueOptions {
  readonly field?: string | null;
  readonly path?: string | null;
  readonly developerMessage?: string;
}

/** Build a frozen blocking issue with canonical copy + retryability. */
export function issue(code: BootstrapIssueCode, opts: IssueOptions = {}): BootstrapValidationIssue {
  return Object.freeze({
    stableCode: code,
    severity: "blocking" as const,
    field: opts.field ?? null,
    path: opts.path ?? null,
    retryable: RETRYABLE_CODES.has(code),
    userMessageHe: ISSUE_MESSAGE_HE[code],
    developerMessage: opts.developerMessage ?? code,
  });
}

/* ── Warnings (never invalidate; each declares its planner effect) ────────── */

export type BootstrapWarningCode =
  | "APPROXIMATE_DATE"
  | "UNKNOWN_DATE"
  | "UNKNOWN_CONTACT_WILL_BE_CREATED"
  | "UNLINKED_PARTICIPANT"
  | "WEAK_EVIDENCE"
  | "MISSING_PHONE"
  | "MISSING_EMAIL"
  | "DEFERRED_CONTACT"
  | "SPARSE_FACTS"
  | "LOW_CONFIDENCE_DEADLINE"
  | "PLANNER_DEFAULT_APPLIED"
  | "UNKNOWN_TIMEZONE";

export const BOOTSTRAP_WARNING_CODES: readonly BootstrapWarningCode[] = [
  "APPROXIMATE_DATE",
  "UNKNOWN_DATE",
  "UNKNOWN_CONTACT_WILL_BE_CREATED",
  "UNLINKED_PARTICIPANT",
  "WEAK_EVIDENCE",
  "MISSING_PHONE",
  "MISSING_EMAIL",
  "DEFERRED_CONTACT",
  "SPARSE_FACTS",
  "LOW_CONFIDENCE_DEADLINE",
  "PLANNER_DEFAULT_APPLIED",
  "UNKNOWN_TIMEZONE",
] as const;

export function isBootstrapWarningCode(v: unknown): v is BootstrapWarningCode {
  return typeof v === "string" && (BOOTSTRAP_WARNING_CODES as readonly string[]).includes(v);
}

const WARNING_MESSAGE_HE: Readonly<Record<BootstrapWarningCode, string>> = {
  APPROXIMATE_DATE: "תאריך משוער — יתוכנן במצב ודאות «משוער».",
  UNKNOWN_DATE: "תאריך לא ידוע — יתוכנן ללא תאריך (dueAt=null).",
  UNKNOWN_CONTACT_WILL_BE_CREATED: "איש קשר חדש ייווצר בעת יצירת התיק.",
  UNLINKED_PARTICIPANT: "משתתף ללא קישור לאיש קשר קיים — ייווצר איש קשר חדש.",
  WEAK_EVIDENCE: "דרישת ראיה חלשה — תתוכנן כלא-חובה.",
  MISSING_PHONE: "לאיש הקשר חסר טלפון — יתוכנן כפי שהוא.",
  MISSING_EMAIL: "לאיש הקשר חסר דוא\"ל — יתוכנן כפי שהוא.",
  DEFERRED_CONTACT: "איש קשר נדחה — לא ייכלל ביצירת התיק, יישמר במטא-דאטה.",
  SPARSE_FACTS: "מעט עובדות בטיוטה — ודא/י שהתיק מלא דיו.",
  LOW_CONFIDENCE_DEADLINE: "רמת ודאות נמוכה למועד — הערך נשמר עם ציון מקור.",
  PLANNER_DEFAULT_APPLIED: "ברירת מחדל תמולא על ידי המתכנן לשדה שלא הוגדר.",
  UNKNOWN_TIMEZONE: "אזור זמן לא ידוע — יתוכנן כ-Asia/Jerusalem.",
};

/** The concrete downstream effect the planner will apply (documented, explicit). */
const WARNING_PLANNER_EFFECT: Readonly<Record<BootstrapWarningCode, string>> = {
  APPROXIMATE_DATE: "deadline planned with confidence='estimated'",
  UNKNOWN_DATE: "deadline planned with confidence='unknown', dueAt=null",
  UNKNOWN_CONTACT_WILL_BE_CREATED: "contact classified create_new",
  UNLINKED_PARTICIPANT: "participant planned against a to-be-created contact",
  WEAK_EVIDENCE: "evidence planned mandatory=false",
  MISSING_PHONE: "contact contact_info omits phone (planned as-is)",
  MISSING_EMAIL: "contact contact_info omits email (planned as-is)",
  DEFERRED_CONTACT: "contact excluded from persistence, retained in metadata",
  SPARSE_FACTS: "no planner effect (advisory)",
  LOW_CONFIDENCE_DEADLINE: "value kept; provenance notes low confidence",
  PLANNER_DEFAULT_APPLIED: "an org/procedure default fills an unspecified field",
  UNKNOWN_TIMEZONE: "deadline planned with default Asia/Jerusalem",
};

export interface BootstrapValidationWarning {
  readonly code: BootstrapWarningCode;
  readonly field: string | null;
  readonly path: string | null;
  readonly messageHe: string;
  /** What the planner will do about it — explicit, non-blocking. */
  readonly plannerEffect: string;
}

export interface WarningOptions {
  readonly field?: string | null;
  readonly path?: string | null;
}

export function warning(code: BootstrapWarningCode, opts: WarningOptions = {}): BootstrapValidationWarning {
  return Object.freeze({
    code,
    field: opts.field ?? null,
    path: opts.path ?? null,
    messageHe: WARNING_MESSAGE_HE[code],
    plannerEffect: WARNING_PLANNER_EFFECT[code],
  });
}

/* ── Infos (advisory only; ZERO behavioral effect) ────────────────────────── */

export type BootstrapInfoCode =
  | "WHITESPACE_NORMALIZED"
  | "DUPLICATE_DROPPED"
  | "COLLECTION_SORTED"
  | "EMPTY_SECTION"
  | "APPROVALS_SUBSET";

export const BOOTSTRAP_INFO_CODES: readonly BootstrapInfoCode[] = [
  "WHITESPACE_NORMALIZED",
  "DUPLICATE_DROPPED",
  "COLLECTION_SORTED",
  "EMPTY_SECTION",
  "APPROVALS_SUBSET",
] as const;

export function isBootstrapInfoCode(v: unknown): v is BootstrapInfoCode {
  return typeof v === "string" && (BOOTSTRAP_INFO_CODES as readonly string[]).includes(v);
}

const INFO_MESSAGE_HE: Readonly<Record<BootstrapInfoCode, string>> = {
  WHITESPACE_NORMALIZED: "בוצע ניקוי רווחים/יוניקוד לטקסטים.",
  DUPLICATE_DROPPED: "פריט כפול הוסר לפי מפתח קנוני.",
  COLLECTION_SORTED: "אוסף מוין לסדר דטרמיניסטי.",
  EMPTY_SECTION: "מקטע ריק — לא אושרו פריטים.",
  APPROVALS_SUBSET: "אושרה תת-קבוצה מתוך הפריטים בטיוטה.",
};

export interface BootstrapValidationInfo {
  readonly code: BootstrapInfoCode;
  readonly field: string | null;
  readonly path: string | null;
  readonly messageHe: string;
}

export interface InfoOptions {
  readonly field?: string | null;
  readonly path?: string | null;
}

export function info(code: BootstrapInfoCode, opts: InfoOptions = {}): BootstrapValidationInfo {
  return Object.freeze({
    code,
    field: opts.field ?? null,
    path: opts.path ?? null,
    messageHe: INFO_MESSAGE_HE[code],
  });
}

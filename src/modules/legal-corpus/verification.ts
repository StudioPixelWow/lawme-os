/**
 * Editorial verification workflow (P1-S1 Phase 6).
 *
 * A source version becomes `verified` ONLY through an explicit verification
 * record confirming every required field. Being official is NOT sufficient —
 * there is no auto-verify. The app fails closed when verification is absent,
 * rejected, expired or superseded.
 */
import type {
  LegalVerificationRecord,
  VerificationCheckedFields,
  VerificationOutcome,
} from "./types.ts";
import { deepFreeze } from "./deep-freeze.ts";

const ALL_FIELDS: (keyof VerificationCheckedFields)[] = [
  "title",
  "enactmentIdentity",
  "sectionIdentity",
  "effectiveDate",
  "amendmentStatus",
  "permalink",
  "sourceTextHash",
  "sourceVersion",
  "licensePolicy",
];

export function allFieldsChecked(fields: VerificationCheckedFields): boolean {
  return ALL_FIELDS.every((f) => fields[f] === true);
}

export interface RecordVerificationInput {
  verificationId: string;
  versionId: string;
  verifier: string; // must be a real editor/pipeline identity
  method: string;
  checkedFields: VerificationCheckedFields;
  timestamp: string;
  reVerifyDueDate: string | null;
  notes: string | null;
  /** Set true only when the version has been superseded. */
  superseded?: boolean;
}

/**
 * Produces a verification record. Result is `verified` ONLY when a real
 * verifier is named AND every field was checked AND it is not superseded.
 * Otherwise `rejected` (or `superseded`). Never auto-verifies.
 */
export function recordVerification(
  input: RecordVerificationInput,
): LegalVerificationRecord {
  let result: VerificationOutcome;
  if (input.superseded === true) {
    result = "superseded";
  } else if (
    input.verifier.trim().length > 0 &&
    allFieldsChecked(input.checkedFields)
  ) {
    result = "verified";
  } else {
    result = "rejected";
  }
  return deepFreeze({
    verificationId: input.verificationId,
    versionId: input.versionId,
    verifier: input.verifier,
    method: input.method,
    checkedFields: input.checkedFields,
    result,
    timestamp: input.timestamp,
    reVerifyDueDate: input.reVerifyDueDate,
    notes: input.notes,
  });
}

/**
 * Effective verification status as of a date. `verified` decays to
 * `expired_reverification` once past the re-verify due date.
 */
export function effectiveVerification(
  record: LegalVerificationRecord,
  asOfISO: string,
): VerificationOutcome {
  if (record.result !== "verified") return record.result;
  if (record.reVerifyDueDate !== null && asOfISO > record.reVerifyDueDate) {
    return "expired_reverification";
  }
  return "verified";
}

/** True only when the record currently authorizes conclusion-grade support. */
export function isCurrentlyVerified(
  record: LegalVerificationRecord | null,
  asOfISO: string,
): boolean {
  if (record === null) return false;
  return effectiveVerification(record, asOfISO) === "verified";
}

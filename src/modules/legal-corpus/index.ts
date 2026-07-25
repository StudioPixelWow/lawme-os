/**
 * Verified Legal Corpus — public barrel (P1-S1 foundation).
 * Contracts + invariants + verification + license + coverage + guarded adapter.
 * NO legal text, NO ingestion, NO pipeline wiring in this slice.
 */
export * from "./types.ts";
export { deepFreeze } from "./deep-freeze.ts";
export { sha256Hex, reproducibilityKey } from "./hash.ts";
export {
  recordVerification,
  effectiveVerification,
  isCurrentlyVerified,
  allFieldsChecked,
} from "./verification.ts";
export { licensePermits, enforceExcerpt } from "./license.ts";
export {
  selectVersionForAsOf,
  isWholeDocumentPinpoint,
  canProvisionSupportConclusion,
} from "./invariants.ts";
export { computeCoverageLevel, buildDoctrineCoverage } from "./coverage.ts";
export {
  createGuardedLegislationAdapter,
  P1_S1_ALLOWLIST,
  ReuseBasisMissingError,
  InstrumentNotAllowlistedError,
} from "./adapter.ts";

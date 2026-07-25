/**
 * ============================================================================
 * SYNTHETIC TEST FIXTURES — CONTAINS **NO** REAL LEGAL TEXT.
 * ============================================================================
 * Every string below is invented placeholder content used solely to exercise
 * the corpus invariants and benchmark harness. It is NOT legislation, NOT a
 * real statute title, section, date, or quotation, and MUST NEVER be rendered
 * to a user or treated as authority. Real verified provisions arrive only via
 * the approved source + editorial verification once a written reuse basis
 * exists (STOP GATE A).
 *
 * The synthetic "source" is deliberately labelled unofficial + discovery_only
 * so that, even by accident, nothing here can support a conclusion.
 */
import type {
  LegalLicensePolicy,
  LegalPinpoint,
  LegalProvision,
  LegalSourceVersion,
} from "./types.ts";
import { sha256Hex } from "./hash.ts";
import { deepFreeze } from "./deep-freeze.ts";

export const SYNTHETIC_BANNER =
  "SYNTHETIC-NON-LEGAL-FIXTURE — not real legislation";

export const syntheticLicense: LegalLicensePolicy = deepFreeze({
  policyId: "synthetic-license",
  provider: "SYNTHETIC",
  ingestionAllowed: true,
  displayAllowed: true,
  maxExcerptChars: 40,
  redistributionAllowed: false,
  exportToWorkProductAllowed: true,
  attributionRequired: true,
  attributionTextHe: "מקור סינתטי לבדיקה בלבד",
  retentionObligations: null,
  territory: "TEST",
  termsRef: null,
  verifiedInWriting: false,
});

const SYNTH_TEXT = "SYNTHETIC PROVISION BODY — placeholder, not legal content.";

/** A synthetic version that is "verified" for invariant testing only. */
export function syntheticVerifiedVersion(overrides?: Partial<LegalSourceVersion>): LegalSourceVersion {
  const base: LegalSourceVersion = {
    versionId: "synthetic-v1",
    sourceId: "synthetic-source",
    versionLabel: "SYNTHETIC v1",
    effectiveDate: "2020-01-01",
    commencementDate: "2020-01-01",
    publicationDate: "2019-12-01",
    supersededByVersionId: null,
    supersededFromDate: null,
    sourceTextHash: sha256Hex(SYNTH_TEXT),
    permalink: "https://example.test/synthetic#s1",
    directLink: "https://example.test/synthetic",
    ingestionTimestamp: "2026-07-25T09:00:00+03:00",
    lastVerifiedTimestamp: "2026-07-25T09:00:00+03:00",
    verificationStatus: "verified",
  };
  return deepFreeze({ ...base, ...(overrides ?? {}) });
}

export function syntheticProvision(overrides?: Partial<LegalProvision>): LegalProvision {
  const base: LegalProvision = {
    provisionId: "synthetic-p1",
    versionId: "synthetic-v1",
    path: "§1",
    heading: "SYNTHETIC HEADING",
    text: SYNTH_TEXT,
    textHash: sha256Hex(SYNTH_TEXT),
    inForce: "in_force",
    pinpointRef: "synthetic-pin1",
  };
  return deepFreeze({ ...base, ...(overrides ?? {}) });
}

export function syntheticVerifiedPinpoint(): LegalPinpoint {
  return deepFreeze({
    pinpointId: "synthetic-pin1",
    provisionOrParagraph: "§1",
    anchorType: "section",
    resolvableAnchor: "https://example.test/synthetic#s1",
    pinpointStatus: "verified",
    pinpointStatementHe: null,
  });
}

export function syntheticWholeDocPinpoint(): LegalPinpoint {
  // Claims verified but the anchor is a bare document URL — must be rejected.
  return deepFreeze({
    pinpointId: "synthetic-pin-bad",
    provisionOrParagraph: "§1",
    anchorType: "section",
    resolvableAnchor: "https://example.test/synthetic",
    pinpointStatus: "verified",
    pinpointStatementHe: null,
  });
}

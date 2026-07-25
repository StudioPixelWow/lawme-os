/**
 * Corpus invariants (P1-S0 contract §6.3, P1-S1 Phases 3/7/9).
 *
 * These encode the hard rules that make a provision eligible to SUPPORT a
 * conclusion. Anything that fails ⇒ the provision may still be shown as
 * discovery/context, but never as verified supporting authority.
 */
import type {
  LegalLicensePolicy,
  LegalPinpoint,
  LegalProvision,
  LegalSourceVersion,
  LegalVerificationRecord,
  PermittedUse,
} from "./types.ts";
import { isCurrentlyVerified } from "./verification.ts";
import { licensePermits } from "./license.ts";

/**
 * Select the version in force for `asOfISO`:
 *  - effectiveDate must be known and <= asOf (no guessing; unknown ⇒ excluded)
 *  - not future-effective relative to asOf
 *  - not superseded on/before asOf
 * Returns null when no version qualifies (fail closed).
 */
export function selectVersionForAsOf(
  versions: LegalSourceVersion[],
  asOfISO: string,
): LegalSourceVersion | null {
  const eligible = versions.filter((v) => {
    if (v.effectiveDate === null) return false; // unknown stays unknown
    if (v.effectiveDate > asOfISO) return false; // future-effective
    if (v.supersededFromDate !== null && v.supersededFromDate <= asOfISO) {
      return false; // already superseded
    }
    return true;
  });
  if (eligible.length === 0) return null;
  // Most recent effective date wins.
  return eligible.reduce((best, v) =>
    v.effectiveDate! > best.effectiveDate! ? v : best,
  );
}

/** A whole-document URL must never masquerade as a pinpoint. */
export function isWholeDocumentPinpoint(pinpoint: LegalPinpoint): boolean {
  if (pinpoint.pinpointStatus !== "verified") return false;
  // A verified pinpoint must carry a genuine deep anchor (fragment / query
  // that targets the provision), not a bare document link.
  const anchor = pinpoint.resolvableAnchor;
  if (anchor === null) return true; // claims verified but has no anchor
  const hasFragmentOrQuery = anchor.includes("#") || anchor.includes("?");
  return !hasFragmentOrQuery;
}

export interface SupportDecision {
  canSupport: boolean;
  reason:
    | "ok"
    | "version_unverified"
    | "verification_absent_or_expired"
    | "license_forbids_use"
    | "provision_not_in_force"
    | "version_mismatch";
}

/**
 * The single authority gate: may this provision support a conclusion?
 * ALL must hold: version verified · a current verification record · license
 * permits the use · provision in force · it belongs to the selected version.
 */
export function canProvisionSupportConclusion(input: {
  provision: LegalProvision;
  version: LegalSourceVersion;
  verification: LegalVerificationRecord | null;
  license: LegalLicensePolicy;
  use: PermittedUse;
  asOfISO: string;
}): SupportDecision {
  const { provision, version, verification, license, use, asOfISO } = input;
  if (provision.versionId !== version.versionId) {
    return { canSupport: false, reason: "version_mismatch" };
  }
  if (version.verificationStatus !== "verified") {
    return { canSupport: false, reason: "version_unverified" };
  }
  if (!isCurrentlyVerified(verification, asOfISO)) {
    return { canSupport: false, reason: "verification_absent_or_expired" };
  }
  if (!licensePermits(license, use)) {
    return { canSupport: false, reason: "license_forbids_use" };
  }
  if (provision.inForce !== "in_force") {
    return { canSupport: false, reason: "provision_not_in_force" };
  }
  return { canSupport: true, reason: "ok" };
}

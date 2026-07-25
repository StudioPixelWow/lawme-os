/**
 * License-policy enforcement at the rendering boundary (P1-S1 Phase 12/15).
 * Rendering/excerpt/export obey the source's LegalLicensePolicy.
 */
import type { LegalLicensePolicy, PermittedUse } from "./types.ts";

export function licensePermits(
  policy: LegalLicensePolicy,
  use: PermittedUse,
): boolean {
  switch (use) {
    case "display":
      return policy.displayAllowed;
    case "excerpt":
      return policy.displayAllowed; // excerpt is a bounded display
    case "export":
      return policy.exportToWorkProductAllowed;
    case "redistribute":
      return policy.redistributionAllowed;
    default:
      return false;
  }
}

export interface ExcerptResult {
  allowed: boolean;
  text: string | null;
  truncated: boolean;
  attributionHe: string | null;
}

/** Enforces excerpt length + display permission. Never over-renders. */
export function enforceExcerpt(
  policy: LegalLicensePolicy,
  fullText: string,
): ExcerptResult {
  if (!policy.displayAllowed) {
    return { allowed: false, text: null, truncated: false, attributionHe: null };
  }
  const max = policy.maxExcerptChars;
  const attribution = policy.attributionRequired ? policy.attributionTextHe : null;
  if (max === null || fullText.length <= max) {
    return { allowed: true, text: fullText, truncated: false, attributionHe: attribution };
  }
  return {
    allowed: true,
    text: fullText.slice(0, max),
    truncated: true,
    attributionHe: attribution,
  };
}

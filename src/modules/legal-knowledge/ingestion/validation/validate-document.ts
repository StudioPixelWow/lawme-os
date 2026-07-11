/**
 * Normalized-document validation — schema-level + business rules.
 * Failures are explicit; nothing is silently dropped or auto-corrected.
 */
import type { AdapterValidationResult, NormalizedLegalDocument } from "../core/types.ts";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;

export function validateNormalizedDocument(doc: NormalizedLegalDocument): AdapterValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!doc.title || doc.title.trim().length === 0) errors.push("title is empty");
  if (doc.title && doc.title.length > 1000) errors.push("title exceeds 1000 chars");
  if (!doc.sourceId) errors.push("sourceId missing");
  if (!doc.provenance) errors.push("provenance missing");

  if (doc.provenance) {
    if (!SHA256_RE.test(doc.provenance.sha256)) errors.push("provenance.sha256 invalid");
    if (!doc.provenance.retrievedAt) errors.push("provenance.retrievedAt missing");
    if (!doc.provenance.originalUrl) errors.push("provenance.originalUrl missing");
    if (doc.provenance.isFixture && doc.verificationStatus.startsWith("verified")) {
      errors.push("fixture content must not claim verified_* status");
    }
  }

  for (const [field, value] of [
    ["documentDate", doc.documentDate],
    ["publicationDate", doc.publicationDate],
    ["effectiveDate", doc.effectiveDate],
    ["versionDate", doc.versionDate],
  ] as const) {
    if (value !== null && !DATE_RE.test(value)) errors.push(`${field} not YYYY-MM-DD: ${value}`);
  }

  if (doc.documentType === "judgment" || doc.documentType === "decision") {
    if (!doc.caseNumberRaw) warnings.push("judgment/decision without a case number");
    if (!doc.court) warnings.push("judgment/decision without a court");
  }
  if ((doc.documentType === "legislation" || doc.documentType === "regulation") && !doc.versionDate) {
    warnings.push("legislation/regulation without version_date — validity answers will be limited");
  }

  if (doc.rawContent !== null && doc.storagePolicy === "pointer_only") {
    errors.push("pointer_only storage policy but rawContent is present");
  }
  if (doc.rawContent !== null && doc.rawContent.length > 5_000_000) {
    errors.push("rawContent exceeds 5MB POC bound");
  }
  if (!doc.isSynthetic && doc.provenance?.isFixture) {
    warnings.push("fixture-derived content not marked synthetic — confirm it is a manually selected public sample");
  }
  if (doc.authorityType === "binding" && doc.verificationStatus === "unverified") {
    warnings.push("binding authority claimed while unverified — authority must be re-derived at verification");
  }

  return { valid: errors.length === 0, errors, warnings };
}

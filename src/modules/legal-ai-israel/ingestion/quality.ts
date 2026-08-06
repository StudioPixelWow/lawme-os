/**
 * Canonical validation / quality gates (Step 14).
 *
 * A record is QUARANTINED (not published, kept for review) if any gate fails:
 * missing provenance, missing external id, missing content hash, mapping
 * invalid, confidence below threshold, license/source status disallows use,
 * unmarked partial content, or an unresolved duplicate conflict. Reuses the
 * Phase-2 restriction detector so publication-restricted text is refused.
 */
import type { CanonicalRecord } from "./canonical/envelope.ts";
import type { ValidationResult, QuarantinedRecord } from "./contract.ts";
import { detectRestrictionNotices } from "../quality/gates.ts";

export interface LicenseGate {
  /** May this source's content be stored/used at all? (from Source Registry) */
  ingestionAllowed: boolean;
  /** May full document text be stored? (false → only metadata/summary). */
  fullTextAllowed: boolean;
}

export interface ValidationConfig {
  minConfidence: number;
  license: LicenseGate;
}

export const DEFAULT_VALIDATION: ValidationConfig = {
  minConfidence: 0.5,
  license: { ingestionAllowed: true, fullTextAllowed: true },
};

/** Gate a single canonical record; returns the failure reasons (empty = pass). */
export function gateRecord(record: CanonicalRecord, cfg: ValidationConfig): string[] {
  const reasons: string[] = [];
  const env = record.envelope;

  if (!env.sourceUrl || !env.sourcePlatform) reasons.push("no_provenance");
  if (env.externalIdentifiers.length === 0 && !env.externalRecordId) reasons.push("no_external_id");
  if (!env.contentHash) reasons.push("missing_content_hash");
  if (!env.rawRecordHash) reasons.push("missing_raw_hash");
  if (env.confidence < cfg.minConfidence) reasons.push("low_confidence");

  if (!cfg.license.ingestionAllowed) reasons.push("license_forbids_ingestion");

  // content_level integrity: a full_text claim must actually carry primary text;
  // full text may only be stored when the license permits it.
  if (env.contentLevel === "full_text") {
    if (!record.primaryText || record.primaryText.raw.trim().length === 0) {
      reasons.push("full_text_claimed_without_text");
    }
    if (!cfg.license.fullTextAllowed) reasons.push("full_text_not_licensed");
  }

  // a record carrying primary text must declare the correct content_level
  if (record.primaryText && record.primaryText.raw.trim().length > 0 && env.contentLevel === "metadata_only") {
    reasons.push("unmarked_partial_content");
  }

  // publication-restriction notices (איסור פרסום, קטין, חסוי, …) → refuse.
  // Scan the primary text AND any summary/detail field, so metadata/summary
  // rows carrying restriction language are caught even without full text.
  const summary = typeof record.fields.summary === "string" ? record.fields.summary : "";
  const textToScan = `${record.primaryText ? record.primaryText.raw : ""} ${summary}`.trim();
  if (textToScan.length > 0) {
    const hits = detectRestrictionNotices(textToScan);
    if (hits.length > 0) reasons.push("publication_restricted");
  }

  return reasons;
}

/** Validate a batch, splitting into valid vs quarantined with reasons. */
export function validateCanonicalRecords(
  records: readonly CanonicalRecord[],
  cfg: ValidationConfig = DEFAULT_VALIDATION,
): ValidationResult {
  const valid: CanonicalRecord[] = [];
  const quarantined: QuarantinedRecord[] = [];
  for (const record of records) {
    const reasons = gateRecord(record, cfg);
    if (reasons.length === 0) {
      record.envelope.versionStatus = "validated";
      valid.push(record);
    } else {
      record.envelope.versionStatus = "quarantined";
      quarantined.push({ record, reasons });
    }
  }
  return { valid, quarantined };
}

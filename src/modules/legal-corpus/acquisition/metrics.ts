/**
 * Honest coverage metrics (Acquisition Slice 1).
 * Never claim completeness — report what is registered vs actually ingested.
 */
import type {
  CanonicalSourceRecord,
  AcquisitionMode,
  WorkstreamId,
  SourceClassification,
} from "./types.ts";
import { SOURCE_REGISTRY } from "./registry.ts";

export interface RegistryCoverage {
  totalSources: number;
  byWorkstream: Record<string, number>;
  byClassification: Record<string, number>;
  immediatelyImplementable: number;
  requiresExternalApproval: number;
}

export function registryCoverage(): RegistryCoverage {
  const byWorkstream: Record<string, number> = {};
  const byClassification: Record<string, number> = {};
  let immediate = 0;
  let stop = 0;
  for (const s of SOURCE_REGISTRY) {
    byWorkstream[s.workstream] = (byWorkstream[s.workstream] ?? 0) + 1;
    byClassification[s.classification] = (byClassification[s.classification] ?? 0) + 1;
    if (s.requiresExternalApproval) stop += 1;
    else immediate += 1;
  }
  return {
    totalSources: SOURCE_REGISTRY.length,
    byWorkstream,
    byClassification,
    immediatelyImplementable: immediate,
    requiresExternalApproval: stop,
  };
}

export interface IngestedCoverage {
  totalRecords: number;
  byMode: Record<string, number>;
  byAuthorityTier: Record<string, number>;
  byYear: Record<string, number>;
  fullTextHeld: number;
  tenantOwned: number;
  shared: number;
}

function yearOf(r: CanonicalSourceRecord): string {
  const iso = r.decisionDate ?? r.effectiveDate ?? r.publicationDate;
  if (!iso) return "unknown";
  const y = iso.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : "unknown";
}

export function ingestedCoverage(
  records: readonly CanonicalSourceRecord[],
): IngestedCoverage {
  const byMode: Record<string, number> = {};
  const byAuthorityTier: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  let fullTextHeld = 0;
  let tenantOwned = 0;
  let shared = 0;
  for (const r of records) {
    byMode[r.acquisitionMode] = (byMode[r.acquisitionMode] ?? 0) + 1;
    byAuthorityTier[r.authorityTier] = (byAuthorityTier[r.authorityTier] ?? 0) + 1;
    const y = yearOf(r);
    byYear[y] = (byYear[y] ?? 0) + 1;
    if (r.fullTextAvailable) fullTextHeld += 1;
    if (r.tenantId) tenantOwned += 1;
    else shared += 1;
  }
  return {
    totalRecords: records.length,
    byMode,
    byAuthorityTier,
    byYear,
    fullTextHeld,
    tenantOwned,
    shared,
  };
}

// Re-export a couple of unions for downstream typing convenience.
export type { AcquisitionMode, WorkstreamId, SourceClassification };

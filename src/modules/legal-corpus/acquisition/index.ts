/**
 * Maximum-Lawful Corpus Acquisition — public barrel (Acquisition Slice 1).
 * Schema + ladder + registry + dedup + first open-official adapter + metrics.
 * No legal text, no live retrieval, no fabrication in this slice.
 */
export * from "./types.ts";
export {
  resolveAcquisitionMode,
  resolveForSource,
  modeHoldsFullText,
} from "./ladder.ts";
export type { LadderInput, LadderResult } from "./ladder.ts";
export {
  SOURCE_REGISTRY,
  sourceByKey,
  sourcesByWorkstream,
  sourcesByClassification,
  immediatelyImplementableSources,
  stopSources,
} from "./registry.ts";
export { canonicalKey, dedupeRecords } from "./dedup.ts";
export type { DedupResult } from "./dedup.ts";
export { createOpenOfficialAdapter } from "./adapter.ts";
export {
  registryCoverage,
  ingestedCoverage,
} from "./metrics.ts";
export type { RegistryCoverage, IngestedCoverage } from "./metrics.ts";
export {
  authorityClassOf,
  authorityRankOf,
  rankByAuthority,
  authorityClassCounts,
  AUTHORITY_CLASS_LABEL_HE,
} from "./classification.ts";
export type { AuthorityClass } from "./classification.ts";

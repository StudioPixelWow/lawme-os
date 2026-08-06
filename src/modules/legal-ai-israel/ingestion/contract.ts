/**
 * CanonicalCollector contract (LEGAL AI ISRAEL — First Production Slice, Step 8).
 *
 * The uniform interface both collectors implement. It is the founder-specified
 * shape: discoverCheckpoint → fetchBatch → mapRecord → validate → persist.
 * `validate` and `persist` delegate to shared modules (quality gates + store)
 * so no collector re-implements those; each collector owns only discovery,
 * fetching, and mapping — the source-specific parts.
 *
 * Nothing in this file fetches the network; concrete collectors inject HTTP.
 */
import type { CanonicalRecord } from "./canonical/envelope.ts";

/** Resumable position within a source. Persisted between runs (Step 9). */
export interface Checkpoint {
  source: string; // collector code, e.g. "knesset_odata"
  dataset: string | null; // entity set / CKAN dataset id
  mode: "backfill" | "incremental";
  cursor: string | null; // opaque source cursor (OData $skiptoken / CKAN start)
  page: number;
  lastModified: string | null; // high-water mark for incremental sync
  done: boolean;
  fetched: number; // records fetched so far under this checkpoint
}

/** A raw source record before mapping. */
export interface RawRecord {
  externalId: string;
  sourceUrl: string;
  raw: Record<string, unknown>;
  rawHash: string; // hash of the raw payload (traceability + update detection)
  modifiedAt: string | null; // source modified timestamp when available
  deleted: boolean; // source tombstone / retired record
}

export interface RawRecordBatch {
  records: readonly RawRecord[];
  nextCheckpoint: Checkpoint;
}

/** A record rejected by validation, with the reasons (Step 14). */
export interface QuarantinedRecord {
  record: CanonicalRecord;
  reasons: readonly string[];
}

export interface ValidationResult {
  valid: readonly CanonicalRecord[];
  quarantined: readonly QuarantinedRecord[];
}

export interface PersistResult {
  persisted: number;
  duplicates: number;
  updated: number;
  quarantined: number;
  indexed: number;
  published: number;
  deadLettered: number;
  tombstoned: number;
}

/** The uniform collector contract every source adapter implements. */
export interface CanonicalCollector {
  readonly code: string;
  readonly datasetId: string | null;
  discoverCheckpoint(): Promise<Checkpoint>;
  fetchBatch(checkpoint: Checkpoint): Promise<RawRecordBatch>;
  mapRecord(record: RawRecord): Promise<CanonicalRecord[]>;
  validate(records: readonly CanonicalRecord[]): ValidationResult;
  persist(records: readonly CanonicalRecord[]): Promise<PersistResult>;
}

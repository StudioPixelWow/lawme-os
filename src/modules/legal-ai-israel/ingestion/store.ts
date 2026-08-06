/**
 * CanonicalStore — persistence surface for the ingestion slice.
 *
 * A narrow interface so the pipeline is DB-free and offline-testable. Two
 * implementations exist: the in-memory store here (used by the fixture pilot
 * and all tests — no network, no DB) and a Supabase service-role adapter
 * (dev-only, env-driven) in ./supabase-canonical-store.ts.
 *
 * Persistence guarantees:
 *  - DEDUP on (canonicalId, contentHash): identical content → `duplicate`,
 *    changed content → `updated` (new version). Re-running never duplicates.
 *  - TOMBSTONE, never hard-delete: a source-deleted record is flagged.
 *  - Checkpoints persist so a run resumes where it stopped.
 */
import type { CanonicalRecord, VersionStatus } from "./canonical/envelope.ts";
import type { Checkpoint, QuarantinedRecord } from "./contract.ts";

export type PersistOutcome = "new" | "duplicate" | "updated";

export interface StoredRecord {
  record: CanonicalRecord;
  versionNumber: number;
  status: VersionStatus;
  tombstoned: boolean;
  indexed: boolean;
}

export interface UpsertResult {
  outcome: PersistOutcome;
  versionNumber: number;
  canonicalId: string;
}

export interface DeadLetter {
  externalId: string;
  sourceUrl: string;
  rawHash: string;
  error: string;
}

export interface CanonicalStore {
  loadCheckpoint(source: string, dataset: string | null): Promise<Checkpoint | null>;
  saveCheckpoint(cp: Checkpoint): Promise<void>;
  getByCanonicalId(canonicalId: string): Promise<StoredRecord | null>;
  upsert(record: CanonicalRecord): Promise<UpsertResult>;
  tombstone(canonicalId: string): Promise<void>;
  markIndexed(canonicalId: string): Promise<void>;
  markStatus(canonicalId: string, status: VersionStatus): Promise<void>;
  quarantine(q: QuarantinedRecord): Promise<void>;
  deadLetter(dl: DeadLetter): Promise<void>;
}

/** In-memory store for offline pilots and tests. Deterministic; no I/O. */
export class InMemoryCanonicalStore implements CanonicalStore {
  private readonly records = new Map<string, StoredRecord>();
  private readonly checkpoints = new Map<string, Checkpoint>();
  readonly quarantined: QuarantinedRecord[] = [];
  readonly deadLetters: DeadLetter[] = [];

  private cpKey(source: string, dataset: string | null): string {
    return `${source}::${dataset ?? ""}`;
  }

  async loadCheckpoint(source: string, dataset: string | null): Promise<Checkpoint | null> {
    return this.checkpoints.get(this.cpKey(source, dataset)) ?? null;
  }
  async saveCheckpoint(cp: Checkpoint): Promise<void> {
    this.checkpoints.set(this.cpKey(cp.source, cp.dataset), { ...cp });
  }

  async getByCanonicalId(canonicalId: string): Promise<StoredRecord | null> {
    return this.records.get(canonicalId) ?? null;
  }

  async upsert(record: CanonicalRecord): Promise<UpsertResult> {
    const id = record.envelope.canonicalId;
    const existing = this.records.get(id);
    if (!existing) {
      this.records.set(id, {
        record,
        versionNumber: 1,
        status: "persisted",
        tombstoned: false,
        indexed: false,
      });
      return { outcome: "new", versionNumber: 1, canonicalId: id };
    }
    if (existing.record.envelope.contentHash === record.envelope.contentHash) {
      // identical content — refresh last-verified only, no new version
      existing.record.envelope.lastVerifiedAt = record.envelope.lastVerifiedAt;
      return { outcome: "duplicate", versionNumber: existing.versionNumber, canonicalId: id };
    }
    const nextVersion = existing.versionNumber + 1;
    this.records.set(id, {
      record,
      versionNumber: nextVersion,
      status: "persisted",
      tombstoned: existing.tombstoned,
      indexed: false,
    });
    return { outcome: "updated", versionNumber: nextVersion, canonicalId: id };
  }

  async tombstone(canonicalId: string): Promise<void> {
    const existing = this.records.get(canonicalId);
    if (existing) existing.tombstoned = true;
  }
  async markIndexed(canonicalId: string): Promise<void> {
    const existing = this.records.get(canonicalId);
    if (existing) { existing.indexed = true; existing.status = "indexed"; }
  }
  async markStatus(canonicalId: string, status: VersionStatus): Promise<void> {
    const existing = this.records.get(canonicalId);
    if (existing) existing.status = status;
  }
  async quarantine(q: QuarantinedRecord): Promise<void> {
    this.quarantined.push(q);
  }
  async deadLetter(dl: DeadLetter): Promise<void> {
    this.deadLetters.push(dl);
  }

  // ---- test / pilot inspection helpers (no I/O) ----
  all(): StoredRecord[] {
    return [...this.records.values()];
  }
  byType(entityType: string): StoredRecord[] {
    return this.all().filter((r) => r.record.entityType === entityType);
  }
  size(): number {
    return this.records.size;
  }
}

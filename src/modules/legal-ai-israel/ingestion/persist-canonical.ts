/**
 * Shared canonical persistence used by every collector's `persist()` — so no
 * collector re-implements dedup/versioning/tombstone/indexing.
 *
 * Idempotent: identical content → duplicate (no new version); changed content →
 * a new version; source-deleted → tombstone (never hard-delete). After a
 * successful (new|updated) upsert the record is marked indexed then published
 * (it has already passed validation before reaching here).
 */
import type { CanonicalRecord } from "./canonical/envelope.ts";
import type { PersistResult } from "./contract.ts";
import type { CanonicalStore } from "./store.ts";

export async function persistCanonicalRecords(
  store: CanonicalStore,
  records: readonly CanonicalRecord[],
): Promise<PersistResult> {
  const result: PersistResult = {
    persisted: 0, duplicates: 0, updated: 0, quarantined: 0,
    indexed: 0, published: 0, deadLettered: 0, tombstoned: 0,
  };
  for (const record of records) {
    const id = record.envelope.canonicalId;
    if (record.deleted) {
      await store.tombstone(id);
      result.tombstoned += 1;
      continue;
    }
    const upsert = await store.upsert(record);
    if (upsert.outcome === "duplicate") {
      result.duplicates += 1;
      continue;
    }
    if (upsert.outcome === "new") result.persisted += 1;
    else result.updated += 1; // "updated"
    await store.markIndexed(id);
    result.indexed += 1;
    await store.markStatus(id, "published");
    result.published += 1;
  }
  return result;
}

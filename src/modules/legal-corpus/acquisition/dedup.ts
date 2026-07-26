/**
 * Duplicate detection for acquired records (Acquisition Slice 1).
 * Same instrument/judgment acquired from two sources collapses to one record,
 * keeping the FULLEST lawful acquisition and the freshest check.
 */
import type { CanonicalSourceRecord } from "./types.ts";
import { ACQUISITION_RANK } from "./types.ts";

/** Stable identity of the underlying legal item (not the acquisition event). */
export function canonicalKey(r: CanonicalSourceRecord): string {
  if (r.sourceHash) return `hash:${r.sourceHash}`;
  const body = (r.issuingBody ?? "").trim().toLowerCase();
  const num = (r.instrumentNumber ?? "").trim().toLowerCase();
  const ver = (r.version ?? "").trim().toLowerCase();
  if (body || num) return `id:${body}|${num}|${ver}`;
  const title = (r.titleHe ?? "").trim().toLowerCase();
  return `title:${title}|${ver}`;
}

export interface DedupResult {
  unique: readonly CanonicalSourceRecord[];
  duplicatesRemoved: number;
  /** keys that had more than one record */
  collidedKeys: readonly string[];
}

/** Keep, per key, the record with the fullest mode; tie-break on lastCheckedAt. */
export function dedupeRecords(
  records: readonly CanonicalSourceRecord[],
): DedupResult {
  const best = new Map<string, CanonicalSourceRecord>();
  const seen = new Map<string, number>();

  for (const rec of records) {
    const key = canonicalKey(rec);
    seen.set(key, (seen.get(key) ?? 0) + 1);
    const cur = best.get(key);
    if (!cur) {
      best.set(key, rec);
      continue;
    }
    const better =
      ACQUISITION_RANK[rec.acquisitionMode] < ACQUISITION_RANK[cur.acquisitionMode] ||
      (rec.acquisitionMode === cur.acquisitionMode && rec.lastCheckedAt > cur.lastCheckedAt);
    if (better) best.set(key, rec);
  }

  const collidedKeys = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  const unique = [...best.values()];
  return {
    unique,
    duplicatesRemoved: records.length - unique.length,
    collidedKeys,
  };
}

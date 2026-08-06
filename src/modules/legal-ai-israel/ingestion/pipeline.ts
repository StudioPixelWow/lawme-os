/**
 * Ingestion pipeline orchestrator (Steps 9, 14, 15).
 *
 * Drives one collector through discover → fetch → map → validate → persist,
 * with: checkpoint persistence + resume, controlled retry, dead-letter on
 * unmappable records, quarantine on validation failure, tombstone handling,
 * content-level accounting, and full metrics. A terminal access block (403/429)
 * stops THIS source cleanly (never bypassed) without throwing, so a sibling
 * collector keeps running.
 */
import type { CanonicalCollector, Checkpoint } from "./contract.ts";
import type { CanonicalStore } from "./store.ts";
import type { CanonicalRecord } from "./canonical/envelope.ts";
import type { IngestionMetrics } from "./metrics.ts";
import { emptyMetrics, countContentLevel, finalizeRate } from "./metrics.ts";
import { HttpAccessBlockedError } from "./collectors/http.ts";

export interface RunOptions {
  maxIterations: number; // safety cap on batches
  maxRetries: number; // per-batch retries on transient errors
  clockMs: () => number; // injectable clock (default Date.now)
}

export const DEFAULT_RUN_OPTIONS: RunOptions = {
  maxIterations: 100000,
  maxRetries: 3,
  clockMs: () => Date.now(),
};

export interface RunResult {
  source: string;
  dataset: string | null;
  metrics: IngestionMetrics;
  stopped: boolean; // true if a terminal access block halted the source
  stopReason: string | null;
  finalCheckpoint: Checkpoint;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof HttpAccessBlockedError) throw e; // terminal — never retry
      lastErr = e;
    }
  }
  throw lastErr;
}

export async function runIngestion(
  collector: CanonicalCollector,
  store: CanonicalStore,
  options: Partial<RunOptions> = {},
): Promise<RunResult> {
  const opts: RunOptions = { ...DEFAULT_RUN_OPTIONS, ...options };
  const metrics = emptyMetrics();
  const start = opts.clockMs();
  let stopped = false;
  let stopReason: string | null = null;

  let cp = await collector.discoverCheckpoint();
  let iterations = 0;

  while (!cp.done && iterations < opts.maxIterations) {
    iterations += 1;
    let batch;
    try {
      batch = await withRetry(() => collector.fetchBatch(cp), opts.maxRetries);
    } catch (e) {
      if (e instanceof HttpAccessBlockedError) {
        stopped = true;
        stopReason = `access_blocked_${e.status}`;
        break; // fail-closed: stop this source, do not bypass
      }
      stopped = true;
      stopReason = `fetch_failed: ${(e as Error).message}`;
      break;
    }

    metrics.recordsDiscovered += batch.records.length;
    metrics.recordsFetched += batch.records.length;

    // MAP (dead-letter unmappable records; never crash the batch)
    const mapped: CanonicalRecord[] = [];
    for (const raw of batch.records) {
      try {
        const canon = await collector.mapRecord(raw);
        for (const c of canon) mapped.push(c);
      } catch (e) {
        await store.deadLetter({
          externalId: raw.externalId, sourceUrl: raw.sourceUrl,
          rawHash: raw.rawHash, error: (e as Error).message,
        });
        metrics.deadLettered += 1;
      }
    }
    metrics.recordsMapped += mapped.length;

    // VALIDATE (quarantine failures with reasons)
    const { valid, quarantined } = collector.validate(mapped);
    for (const q of quarantined) {
      await store.quarantine(q);
      metrics.recordsQuarantined += 1;
    }
    metrics.recordsValidated += valid.length;

    // content-level accounting on validated records
    for (const v of valid) countContentLevel(metrics, v.envelope.contentLevel);

    // PERSIST (dedup/version/tombstone/index/publish inside)
    const pr = await collector.persist(valid);
    metrics.recordsPersisted += pr.persisted;
    metrics.duplicatesDetected += pr.duplicates;
    metrics.updatesDetected += pr.updated;
    metrics.recordsIndexed += pr.indexed;
    metrics.recordsPublished += pr.published;
    metrics.tombstonesApplied += pr.tombstoned;

    cp = batch.nextCheckpoint;
    await store.saveCheckpoint(cp);
  }

  finalizeRate(metrics, opts.clockMs() - start);
  return { source: collector.code, dataset: cp.dataset, metrics, stopped, stopReason, finalCheckpoint: cp };
}

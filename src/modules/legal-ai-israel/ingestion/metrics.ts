/**
 * Ingestion metrics (Step 15). Plain counters accumulated during a run and
 * reported at the end. No timing magic that would break node --test type-strip.
 */
import type { ContentLevel } from "./canonical/envelope.ts";

export interface IngestionMetrics {
  recordsDiscovered: number;
  recordsFetched: number;
  recordsMapped: number;
  recordsValidated: number;
  recordsPersisted: number;
  recordsIndexed: number;
  recordsPublished: number;
  recordsQuarantined: number;
  duplicatesDetected: number;
  updatesDetected: number;
  tombstonesApplied: number;
  deadLettered: number;
  documentsWithFullText: number;
  documentsWithSummaryOnly: number;
  documentsWithMetadataOnly: number;
  ingestionDurationMs: number;
  recordsPerSecond: number;
}

export function emptyMetrics(): IngestionMetrics {
  return {
    recordsDiscovered: 0,
    recordsFetched: 0,
    recordsMapped: 0,
    recordsValidated: 0,
    recordsPersisted: 0,
    recordsIndexed: 0,
    recordsPublished: 0,
    recordsQuarantined: 0,
    duplicatesDetected: 0,
    updatesDetected: 0,
    tombstonesApplied: 0,
    deadLettered: 0,
    documentsWithFullText: 0,
    documentsWithSummaryOnly: 0,
    documentsWithMetadataOnly: 0,
    ingestionDurationMs: 0,
    recordsPerSecond: 0,
  };
}

export function countContentLevel(m: IngestionMetrics, level: ContentLevel): void {
  if (level === "full_text") m.documentsWithFullText += 1;
  else if (level === "summary") m.documentsWithSummaryOnly += 1;
  else m.documentsWithMetadataOnly += 1;
}

export function finalizeRate(m: IngestionMetrics, durationMs: number): void {
  m.ingestionDurationMs = durationMs;
  const secs = durationMs > 0 ? durationMs / 1000 : 0;
  m.recordsPerSecond = secs > 0 ? Number((m.recordsFetched / secs).toFixed(2)) : 0;
}

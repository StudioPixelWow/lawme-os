/**
 * Phase-1 ingestion runner (Open-Official Ingestion).
 * Ingests the real Basic-Laws batch through the open-official adapter, runs the
 * quality gates (validate → dedup → quarantine), and returns REAL metrics.
 * No network, no scraping, no fabrication — it structures a verified batch.
 */
import type { CanonicalSourceRecord, AcquisitionContext } from "../types.ts";
import { createOpenOfficialAdapter } from "../adapter.ts";
import { sourceByKey } from "../registry.ts";
import { dedupeRecords } from "../dedup.ts";
import { ingestedCoverage } from "../metrics.ts";
import type { IngestedCoverage } from "../metrics.ts";
import { quarantine } from "./validate.ts";
import type { RecordIssue } from "./validate.ts";
import { BASIC_LAWS_ITEMS, MALFORMED_ITEMS } from "./data/basic-laws.ts";

export interface Phase1Report {
  ingestedAtISO: string;
  totalIn: number;
  accepted: number;
  quarantined: number;
  duplicatesRemoved: number;
  coverage: IngestedCoverage;
  quarantineDetail: readonly { recordId: string; issues: readonly RecordIssue[] }[];
  acceptedRecords: readonly CanonicalSourceRecord[];
  oldestYear: string;
  newestYear: string;
}

export async function runPhase1(nowISO = "2026-07-26T10:00:00+03:00"): Promise<Phase1Report> {
  const ctx: AcquisitionContext = { nowISO, blockers: [] };
  const source = sourceByKey("il-knesset-legislation-db");
  if (!source) throw new Error("registry missing il-knesset-legislation-db");
  const adapter = createOpenOfficialAdapter(source);

  // Real batch + one deliberately-malformed record to prove quarantine.
  const raw = await adapter.acquire([...BASIC_LAWS_ITEMS, ...MALFORMED_ITEMS], ctx);

  const { unique, duplicatesRemoved } = dedupeRecords(raw);
  const { accepted, quarantined } = quarantine(unique);
  const coverage = ingestedCoverage(accepted);

  const years = Object.keys(coverage.byYear).filter((y) => y !== "unknown").sort();
  return {
    ingestedAtISO: nowISO,
    totalIn: raw.length,
    accepted: accepted.length,
    quarantined: quarantined.length,
    duplicatesRemoved,
    coverage,
    quarantineDetail: quarantined.map((q) => ({ recordId: q.record.recordId, issues: q.issues })),
    acceptedRecords: accepted,
    oldestYear: years[0] ?? "unknown",
    newestYear: years[years.length - 1] ?? "unknown",
  };
}

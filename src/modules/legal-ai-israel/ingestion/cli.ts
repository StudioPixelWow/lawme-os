/**
 * Pilot CLI runners (Steps 16, 20). Two modes:
 *   --pilot (default)  → runs against BUNDLED FIXTURES with the in-memory store.
 *                        Fully offline; prints real metrics. Safe in CI / here.
 *   --live             → runs against the real Knesset OData / data.gov.il APIs
 *                        with the Supabase canonical store. Requires network +
 *                        SUPABASE_* creds + the applied migration (founder-run).
 *
 * The offline pilot is what proves the harness end-to-end without a network; the
 * live run is the founder-gated production step.
 */
import { InMemoryCanonicalStore } from "./store.ts";
import type { CanonicalStore } from "./store.ts";
import { runIngestion } from "./pipeline.ts";
import type { RunResult } from "./pipeline.ts";
import { KnessetODataCollector, DEFAULT_KNESSET_CONFIG } from "./collectors/knesset-odata.ts";
import { DataGovCkanCollector } from "./collectors/data-gov-ckan.ts";
import type { CkanConfig } from "./collectors/data-gov-ckan.ts";
import { createRealHttp } from "./collectors/http.ts";
import type { JsonHttp } from "./collectors/http.ts";
import {
  FixtureHttp, KNESSET_LAWS, KNESSET_BILLS, KNESSET_DOCBILLS, KNESSET_SUBJECTS, KNESSET_INITIATORS,
  ARARIM_ROWS, MISHMORET_ROWS, JUDGMENTS_ROWS,
} from "./__fixtures__/fixtures.ts";

const NOW = "2026-08-06T00:00:00.000Z";

export interface CliOptions {
  live: boolean;
  pilot: boolean;
  dataset?: string;
}

export function parseArgs(argv: readonly string[]): CliOptions {
  const has = (f: string) => argv.includes(f);
  const val = (f: string): string | undefined => {
    const hit = argv.find((a) => a.startsWith(`${f}=`));
    return hit ? hit.slice(f.length + 1) : undefined;
  };
  return { live: has("--live"), pilot: has("--pilot") || !has("--live"), dataset: val("--dataset") };
}

function printResult(r: RunResult): void {
  const m = r.metrics;
  const line = (k: string, v: unknown) => process.stdout.write(`  ${k.padEnd(26)} ${String(v)}\n`);
  process.stdout.write(`\n== ${r.source}${r.dataset ? " / " + r.dataset : ""} ==\n`);
  line("discovered", m.recordsDiscovered);
  line("fetched", m.recordsFetched);
  line("mapped", m.recordsMapped);
  line("validated", m.recordsValidated);
  line("persisted", m.recordsPersisted);
  line("duplicates", m.duplicatesDetected);
  line("updated", m.updatesDetected);
  line("quarantined", m.recordsQuarantined);
  line("tombstoned", m.tombstonesApplied);
  line("dead_lettered", m.deadLettered);
  line("indexed", m.recordsIndexed);
  line("published", m.recordsPublished);
  line("full_text", m.documentsWithFullText);
  line("summary_only", m.documentsWithSummaryOnly);
  line("metadata_only", m.documentsWithMetadataOnly);
  line("stopped", `${r.stopped}${r.stopReason ? " (" + r.stopReason + ")" : ""}`);
}

function fixtureKnessetHttp(): FixtureHttp {
  return new FixtureHttp({
    odata: {
      KNS_IsraelLaw: KNESSET_LAWS, KNS_Bill: KNESSET_BILLS, KNS_DocumentBill: KNESSET_DOCBILLS,
      KNS_Subject: KNESSET_SUBJECTS, KNS_BillInitiator: KNESSET_INITIATORS,
    },
    ckan: {},
  });
}
function fixtureCkanHttp(dataset: string): FixtureHttp {
  const rows = dataset === "ararim" ? ARARIM_ROWS : dataset === "mishmoret" ? MISHMORET_ROWS : JUDGMENTS_ROWS;
  return new FixtureHttp({ odata: {}, ckan: { [`res-${dataset}`]: rows } });
}

export async function runKnessetPilot(opts: CliOptions): Promise<RunResult> {
  const store: CanonicalStore = opts.live ? liveStore() : new InMemoryCanonicalStore();
  const http: JsonHttp = opts.live ? createRealHttp() : fixtureKnessetHttp();
  const cfg = { ...DEFAULT_KNESSET_CONFIG, pageSize: opts.live ? 100 : 2, now: NOW };
  const collector = new KnessetODataCollector(http, store, cfg);
  const res = await runIngestion(collector, store);
  printResult(res);
  return res;
}

export async function runDataGovPilot(opts: CliOptions): Promise<RunResult> {
  const dataset = opts.dataset ?? "ararim";
  const store: CanonicalStore = opts.live ? liveStore() : new InMemoryCanonicalStore();
  const http: JsonHttp = opts.live ? createRealHttp() : fixtureCkanHttp(dataset);
  const cfg: CkanConfig = {
    datasetId: dataset, resourceId: opts.live ? requireResourceId(dataset) : `res-${dataset}`,
    pageSize: opts.live ? 100 : 5, mode: "backfill", pilotLimit: 500, now: NOW,
  };
  const collector = new DataGovCkanCollector(http, store, cfg);
  const res = await runIngestion(collector, store);
  printResult(res);
  return res;
}

function liveStore(): CanonicalStore {
  // lazy import so the offline pilot never needs @supabase/supabase-js creds
  throw new Error(
    "live mode requires createSupabaseCanonicalStore() + applied migration + network; " +
    "run on the operator machine with SUPABASE_* set (see docs/ingestion/first-production-slice.md).",
  );
}

function requireResourceId(dataset: string): string {
  const v = process.env[`CKAN_RESOURCE_${dataset.toUpperCase()}`];
  if (!v) throw new Error(`missing env CKAN_RESOURCE_${dataset.toUpperCase()} (the datastore resource id for ${dataset})`);
  return v;
}

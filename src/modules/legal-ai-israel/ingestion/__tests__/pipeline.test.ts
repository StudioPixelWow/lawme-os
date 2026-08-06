/**
 * Integration tests: pilot end-to-end over fixtures, idempotency, checkpoint
 * resume, retry, quarantine, indexing, attribution, tombstone, fail-closed.
 * No network, no DB — the fixture http + in-memory store make it deterministic.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { InMemoryCanonicalStore } from "../store.ts";
import { runIngestion } from "../pipeline.ts";
import { KnessetODataCollector } from "../collectors/knesset-odata.ts";
import { DataGovCkanCollector } from "../collectors/data-gov-ckan.ts";
import type { CkanConfig } from "../collectors/data-gov-ckan.ts";
import type { KnessetConfig } from "../collectors/knesset-odata.ts";
import {
  FixtureHttp, KNESSET_LAWS, KNESSET_BILLS, KNESSET_DOCBILLS, KNESSET_SUBJECTS, KNESSET_INITIATORS,
  ARARIM_ROWS, JUDGMENTS_ROWS,
} from "../__fixtures__/fixtures.ts";

const NOW = "2026-08-06T00:00:00.000Z";
const RUN = { clockMs: () => 1000 };

function knessetHttp(): FixtureHttp {
  return new FixtureHttp({
    odata: {
      KNS_IsraelLaw: KNESSET_LAWS, KNS_Bill: KNESSET_BILLS, KNS_DocumentBill: KNESSET_DOCBILLS,
      KNS_Subject: KNESSET_SUBJECTS, KNS_BillInitiator: KNESSET_INITIATORS,
    },
    ckan: {},
  });
}
const knessetCfg: KnessetConfig = {
  entitySets: ["KNS_IsraelLaw", "KNS_Bill", "KNS_DocumentBill", "KNS_Subject", "KNS_BillInitiator"],
  pageSize: 2, mode: "backfill", pilotLimitPerSet: 500, now: NOW,
};

function ararimCfg(): CkanConfig {
  return { datasetId: "ararim", resourceId: "res-ararim", pageSize: 2, mode: "backfill", pilotLimit: 500, now: NOW };
}
function ckanHttp(rid: string, rows: Record<string, unknown>[]): FixtureHttp {
  return new FixtureHttp({ odata: {}, ckan: { [rid]: rows } });
}

test("pilot e2e: Knesset collector ingests all entity sets across pages", async () => {
  const store = new InMemoryCanonicalStore();
  const collector = new KnessetODataCollector(knessetHttp(), store, knessetCfg);
  const res = await runIngestion(collector, store, RUN);
  assert.equal(res.stopped, false);
  // 3 laws + 2 bills + 1 docbill + 2 subjects + 1 initiator = 9 raw → mapped records
  assert.equal(res.metrics.recordsFetched, 9);
  assert.ok(store.byType("Law").length === 3);
  assert.ok(store.byType("Bill").length === 2);
  assert.ok(store.byType("Topic").length === 2);
  assert.equal(res.finalCheckpoint.done, true);
});

test("pilot e2e: data.gov ararim ingests Decisions as metadata_only (real datastore has no text)", async () => {
  const store = new InMemoryCanonicalStore();
  const collector = new DataGovCkanCollector(ckanHttp("res-ararim", ARARIM_ROWS), store, ararimCfg());
  const res = await runIngestion(collector, store, RUN);
  assert.equal(res.stopped, false);
  assert.ok(store.byType("Decision").length >= 1);
  assert.equal(res.metrics.documentsWithFullText, 0);
  assert.ok(res.metrics.documentsWithMetadataOnly >= 1);
});

test("judgments: documents counted as summary-only, never full_text", async () => {
  const store = new InMemoryCanonicalStore();
  const cfg: CkanConfig = { datasetId: "judgments", resourceId: "res-judg", pageSize: 10, mode: "backfill", pilotLimit: 500, now: NOW };
  const collector = new DataGovCkanCollector(ckanHttp("res-judg", JUDGMENTS_ROWS), store, cfg);
  const res = await runIngestion(collector, store, RUN);
  assert.ok(res.metrics.documentsWithSummaryOnly >= 2);
  assert.equal(res.metrics.documentsWithFullText, 0);
});

test("idempotency: running the SAME pilot twice creates no new records (duplicates)", async () => {
  const store = new InMemoryCanonicalStore();
  const cfg = ararimCfg();
  const first = await runIngestion(new DataGovCkanCollector(ckanHttp("res-ararim", ARARIM_ROWS), store, cfg), store, RUN);
  const sizeAfterFirst = store.size();
  // reset checkpoint so it re-processes the same rows
  await store.saveCheckpoint({ source: "data_gov_il", dataset: "ararim", mode: "backfill", cursor: "0", page: 0, lastModified: null, done: false, fetched: 0 });
  const second = await runIngestion(new DataGovCkanCollector(ckanHttp("res-ararim", ARARIM_ROWS), store, cfg), store, RUN);
  assert.equal(store.size(), sizeAfterFirst, "no new canonical ids on re-run");
  assert.ok(second.metrics.duplicatesDetected > 0, "re-run detects duplicates");
  assert.equal(second.metrics.recordsPersisted, 0, "nothing newly persisted on identical re-run");
  assert.ok(first.metrics.recordsPersisted > 0);
});

test("update detection: changed source content creates a NEW version", async () => {
  const store = new InMemoryCanonicalStore();
  const cfg = ararimCfg();
  await runIngestion(new DataGovCkanCollector(ckanHttp("res-ararim", ARARIM_ROWS), store, cfg), store, RUN);
  // change a CONTENT field that is part of the Decision payload (costs) but not
  // its identity (case+court+date) → same canonical id, new version.
  const changed = ARARIM_ROWS.map((r) => ({ ...r }));
  changed[0] = { ...changed[0], "הוצאות לעותר": "9999" };
  await store.saveCheckpoint({ source: "data_gov_il", dataset: "ararim", mode: "backfill", cursor: "0", page: 0, lastModified: null, done: false, fetched: 0 });
  const res = await runIngestion(new DataGovCkanCollector(ckanHttp("res-ararim", changed), store, cfg), store, RUN);
  assert.ok(res.metrics.updatesDetected >= 1, "a changed decision field yields an update/new version");
  const decision = store.byType("Decision").find((d) => (d.record.fields.caseNumberRaw as string) === "ערר 1234-01-23");
  assert.ok(decision && decision.versionNumber >= 2, "version number incremented");
});

test("checkpoint resume: a fresh collector continues from the saved checkpoint", async () => {
  const store = new InMemoryCanonicalStore();
  // pre-seed a checkpoint partway (skip first page of ararim)
  await store.saveCheckpoint({ source: "data_gov_il", dataset: "ararim", mode: "backfill", cursor: "2", page: 1, lastModified: null, done: false, fetched: 2 });
  const collector = new DataGovCkanCollector(ckanHttp("res-ararim", ARARIM_ROWS), store, ararimCfg());
  const cp = await collector.discoverCheckpoint();
  assert.equal(cp.cursor, "2", "resumes from saved cursor, not from 0");
});

test("retry: a transient failure is retried and the run still completes", async () => {
  const store = new InMemoryCanonicalStore();
  const http = new FixtureHttp({ odata: {}, ckan: { "res-ararim": ARARIM_ROWS }, failFirstN: 2 });
  const collector = new DataGovCkanCollector(http, store, ararimCfg());
  const res = await runIngestion(collector, store, { ...RUN, maxRetries: 3 });
  assert.equal(res.stopped, false, "run recovers after transient failures");
  assert.ok(store.byType("Decision").length >= 1);
});

test("fail-closed: a 403 access block STOPS the source cleanly, no bypass", async () => {
  const store = new InMemoryCanonicalStore();
  const http = new FixtureHttp({ odata: {}, ckan: { "res-ararim": ARARIM_ROWS }, blockStatus: 403 });
  const collector = new DataGovCkanCollector(http, store, ararimCfg());
  const res = await runIngestion(collector, store, RUN);
  assert.equal(res.stopped, true);
  assert.equal(res.stopReason, "access_blocked_403");
  assert.equal(store.size(), 0, "nothing ingested when blocked");
});

test("quarantine: records are quarantined (not published) when the license forbids ingestion", async () => {
  const store = new InMemoryCanonicalStore();
  const cfg = ararimCfg();
  const collector = new DataGovCkanCollector(
    ckanHttp("res-ararim", ARARIM_ROWS), store, cfg,
    { minConfidence: 0.5, license: { ingestionAllowed: false, fullTextAllowed: false } },
  );
  const res = await runIngestion(collector, store, RUN);
  assert.ok(res.metrics.recordsQuarantined > 0);
  assert.equal(res.metrics.recordsPersisted, 0, "nothing persisted when ingestion is unlicensed");
  assert.ok(store.quarantined.some((q) => q.reasons.includes("license_forbids_ingestion")));
});

test("indexing + attribution: persisted records are indexed and fully attributed", async () => {
  const store = new InMemoryCanonicalStore();
  const collector = new DataGovCkanCollector(ckanHttp("res-ararim", ARARIM_ROWS), store, ararimCfg());
  await runIngestion(collector, store, RUN);
  const decisions = store.byType("Decision");
  assert.ok(decisions.length >= 1);
  for (const d of decisions) {
    assert.ok(d.indexed, "each persisted record is marked indexed");
    assert.equal(d.status, "published");
    // full source attribution present (traceable to source)
    assert.ok(d.record.envelope.sourcePlatform && d.record.envelope.sourceUrl);
    assert.ok(d.record.envelope.rawRecordHash.length > 0);
    assert.ok(d.record.envelope.externalRecordId.length > 0);
  }
});

test("two collectors are independent: one blocked source does not stop the other", async () => {
  const store = new InMemoryCanonicalStore();
  const blocked = new DataGovCkanCollector(
    new FixtureHttp({ odata: {}, ckan: { "res-ararim": ARARIM_ROWS }, blockStatus: 403 }), store, ararimCfg());
  const healthy = new KnessetODataCollector(knessetHttp(), store, knessetCfg);
  const r1 = await runIngestion(blocked, store, RUN);
  const r2 = await runIngestion(healthy, store, RUN);
  assert.equal(r1.stopped, true);
  assert.equal(r2.stopped, false);
  assert.ok(store.byType("Law").length === 3, "healthy collector still ingested");
});

test("tombstone: a source-deleted record is flagged, never hard-deleted", async () => {
  const store = new InMemoryCanonicalStore();
  const cfg = ararimCfg();
  await runIngestion(new DataGovCkanCollector(ckanHttp("res-ararim", ARARIM_ROWS), store, cfg), store, RUN);
  const before = store.size();
  // deliver the same row flagged deleted
  const deletedRow = [{ ...ARARIM_ROWS[0], __deleted: true }];
  await store.saveCheckpoint({ source: "data_gov_il", dataset: "ararim", mode: "backfill", cursor: "0", page: 0, lastModified: null, done: false, fetched: 0 });
  const res = await runIngestion(new DataGovCkanCollector(ckanHttp("res-ararim", deletedRow), store, cfg), store, RUN);
  assert.ok(res.metrics.tombstonesApplied >= 1);
  assert.equal(store.size(), before, "tombstone marks, never removes");
});

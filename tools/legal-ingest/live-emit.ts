#!/usr/bin/env node
/**
 * Live pilot emitter. Runs REAL source rows (captured from the live Knesset
 * OData + data.gov.il CKAN APIs) through the REAL collectors + pipeline in the
 * container (no network needed — the rows are local), then serializes the
 * resulting canonical entities / versions / external-ids / relationships /
 * quarantine / metrics to SQL for the dev database.
 *
 * This is how the container (whose egress is blocked) still produces a genuine
 * live pilot: the fetch happened over the operator's network via the browser;
 * the mapping/validation/dedup/versioning/metrics are the real code; the output
 * is applied to the dev DB via the Supabase MCP.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { InMemoryCanonicalStore } from "../../src/modules/legal-ai-israel/ingestion/store.ts";
import { runIngestion } from "../../src/modules/legal-ai-israel/ingestion/pipeline.ts";
import { KnessetODataCollector } from "../../src/modules/legal-ai-israel/ingestion/collectors/knesset-odata.ts";
import { DataGovCkanCollector } from "../../src/modules/legal-ai-israel/ingestion/collectors/data-gov-ckan.ts";
import { FixtureHttp } from "../../src/modules/legal-ai-israel/ingestion/__fixtures__/fixtures.ts";
import type { IngestionMetrics } from "../../src/modules/legal-ai-israel/ingestion/metrics.ts";

const NOW = "2026-08-06T00:00:00.000Z";
const rows = JSON.parse(readFileSync(new URL("../../artifacts/live-pilot-source-rows.json", import.meta.url), "utf8"));

// Optional per-CKAN-dataset cap for the dev load (keeps the SQL compact while the
// in-container pipeline still exercises the full captured sample). Laws/bills are
// small, so they are not capped.
const CAP = Number(process.env.PILOT_CKAN_CAP ?? "0") || Infinity;
const cap = (arr: Record<string, unknown>[]): Record<string, unknown>[] =>
  (arr.length > CAP ? arr.slice(0, CAP) : arr);

const store = new InMemoryCanonicalStore();
const http = new FixtureHttp({
  odata: { KNS_IsraelLaw: rows.knesset_laws, KNS_Bill: rows.knesset_bills },
  ckan: {
    "res-ararim": cap(rows.ararim),
    "res-mishmoret": cap(rows.mishmoret),
    "res-judgments": [...cap(rows.judgments), ...rows.judgments_restricted],
  },
});

const runs: Record<string, unknown>[] = [];

const knesset = new KnessetODataCollector(http, store, {
  entitySets: ["KNS_IsraelLaw", "KNS_Bill"], pageSize: 100, mode: "backfill", pilotLimitPerSet: 500, now: NOW,
});
runs.push(summarize("knesset_odata", null, await runIngestion(knesset, store)));

for (const ds of ["ararim", "mishmoret", "judgments"]) {
  const collector = new DataGovCkanCollector(http, store, {
    datasetId: ds, resourceId: `res-${ds}`, pageSize: 100, mode: "backfill", pilotLimit: 500, now: NOW,
  }, { minConfidence: 0.5, license: { ingestionAllowed: true, fullTextAllowed: true } });
  runs.push(summarize("data_gov_il", ds, await runIngestion(collector, store)));
}

function summarize(source: string, dataset: string | null, r: { metrics: IngestionMetrics }): Record<string, unknown> {
  return { source, dataset, ...r.metrics };
}

// ---- serialize to SQL ----
const persistedIds = new Set(store.all().map((s) => s.record.envelope.canonicalId));
const q = (s: string | null): string => (s === null ? "NULL" : `'${s.replace(/'/g, "''")}'`);
const jb = (o: unknown): string => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const num = (n: number): string => String(n);
const bool = (b: boolean): string => (b ? "true" : "false");

// Emit in FK-safe order: ALL entities, then external ids, then versions, then
// relationships (whose from/to must already exist), then quarantine + metrics.
const entityLines: string[] = [];
const extidLines: string[] = [];
const versionLines: string[] = [];
const relLines: string[] = [];

for (const s of store.all()) {
  const e = s.record.envelope;
  entityLines.push(
    `insert into legalai.canonical_entities (canonical_id,entity_type,source_platform,source_publisher,source_dataset,source_resource,source_url,external_record_id,first_seen_at,last_verified_at,extraction_method,parser_version,mapping_version,confidence,content_hash,raw_record_hash,content_level,version_number,version_status,fields,extracted_metadata,source_extras,primary_text,primary_text_language,tombstoned) values (` +
    [
      q(e.canonicalId), q(e.entityType), q(e.sourcePlatform), q(e.sourcePublisher), q(e.sourceDataset),
      q(e.sourceResource), q(e.sourceUrl), q(e.externalRecordId), q(e.firstSeenAt), q(e.lastVerifiedAt),
      q(e.extractionMethod), q(e.parserVersion), q(e.mappingVersion), num(e.confidence), q(e.contentHash),
      q(e.rawRecordHash), q(e.contentLevel), num(s.versionNumber), q(s.status), jb(s.record.fields),
      jb({ external_record_id: e.externalRecordId }), jb(s.record.sourceExtras),
      q(s.record.primaryText ? s.record.primaryText.raw : null),
      q(s.record.primaryText ? s.record.primaryText.language : null), bool(s.tombstoned),
    ].join(",") + `) on conflict (canonical_id) do nothing;`,
  );
  for (const x of e.externalIdentifiers) {
    extidLines.push(
      `insert into legalai.canonical_external_ids (canonical_id,scheme,value,confidence) values (${q(e.canonicalId)},${q(x.scheme)},${q(x.value)},${num(x.confidence)}) on conflict (canonical_id,scheme,value) do nothing;`,
    );
  }
  versionLines.push(
    `insert into legalai.canonical_entity_versions (canonical_id,version_number,content_hash,change_kind,is_current,provenance) values (${q(e.canonicalId)},${num(s.versionNumber)},${q(e.contentHash)},'new_version',true,${jb({ sourcePlatform: e.sourcePlatform, sourceUrl: e.sourceUrl, parserVersion: e.parserVersion })}) on conflict (canonical_id,version_number) do nothing;`,
  );
  for (const rel of s.record.relationships) {
    if (rel.toCanonicalId !== null && !persistedIds.has(rel.toCanonicalId)) continue; // avoid FK to a non-persisted target
    if (!persistedIds.has(rel.fromCanonicalId)) continue;
    relLines.push(
      `insert into legalai.canonical_relationships (type,from_canonical_id,to_canonical_id,to_external_ref,confidence) values (${q(rel.type)},${q(rel.fromCanonicalId)},${q(rel.toCanonicalId)},${q(rel.toExternalRef)},${num(rel.confidence)}) on conflict do nothing;`,
    );
  }
}
// compact multi-row INSERTs (one statement per table) to minimize size
function multi(table: string, cols: string, tuples: string[]): string {
  if (tuples.length === 0) return "";
  return `insert into legalai.${table} (${cols}) values\n${tuples.join(",\n")}\non conflict do nothing;`;
}
const lines: string[] = [];
{
  const tuple = (l: string): string => {
    const m = l.match(/values \(([\s\S]*)\) on conflict/);
    return `(${m ? m[1] : ""})`;
  };
  const et = entityLines.map(tuple);
  const xi = extidLines.map(tuple);
  const ve = versionLines.map(tuple);
  const re = relLines.map(tuple);
  writeFileSync(new URL("../../artifacts/live-pilot-c1-entities.sql", import.meta.url),
    multi("canonical_entities", "canonical_id,entity_type,source_platform,source_publisher,source_dataset,source_resource,source_url,external_record_id,first_seen_at,last_verified_at,extraction_method,parser_version,mapping_version,confidence,content_hash,raw_record_hash,content_level,version_number,version_status,fields,extracted_metadata,source_extras,primary_text,primary_text_language,tombstoned", et) + "\n");
  writeFileSync(new URL("../../artifacts/live-pilot-c2-extver.sql", import.meta.url),
    multi("canonical_external_ids", "canonical_id,scheme,value,confidence", xi) + "\n\n" +
    multi("canonical_entity_versions", "canonical_id,version_number,content_hash,change_kind,is_current,provenance", ve) + "\n");
  writeFileSync(new URL("../../artifacts/live-pilot-c3-rel.sql", import.meta.url),
    multi("canonical_relationships", "type,from_canonical_id,to_canonical_id,to_external_ref,confidence", re) + "\n");
}

for (const item of store.quarantined) {
  lines.push(
    `insert into legalai.ingestion_quarantine (source,dataset,entity_type,canonical_id,reasons,record) values (${q(item.record.envelope.sourcePlatform)},${q(item.record.envelope.sourceDataset)},${q(item.record.entityType)},${q(item.record.envelope.canonicalId)},array[${item.reasons.map((r) => q(r)).join(",")}]::text[],${jb(item.record)});`,
  );
}

for (const r of runs) {
  lines.push(
    `insert into legalai.ingestion_metrics (source,dataset,records_discovered,records_fetched,records_mapped,records_validated,records_persisted,records_indexed,records_published,records_quarantined,duplicates_detected,updates_detected,tombstones_applied,dead_lettered,documents_full_text,documents_summary_only,documents_metadata_only) values (${q(String(r.source))},${q(r.dataset === null ? null : String(r.dataset))},${num(Number(r.recordsDiscovered))},${num(Number(r.recordsFetched))},${num(Number(r.recordsMapped))},${num(Number(r.recordsValidated))},${num(Number(r.recordsPersisted))},${num(Number(r.recordsIndexed))},${num(Number(r.recordsPublished))},${num(Number(r.recordsQuarantined))},${num(Number(r.duplicatesDetected))},${num(Number(r.updatesDetected))},${num(Number(r.tombstonesApplied))},${num(Number(r.deadLettered))},${num(Number(r.documentsWithFullText))},${num(Number(r.documentsWithSummaryOnly))},${num(Number(r.documentsWithMetadataOnly))});`,
  );
}

lines.push("commit;");
writeFileSync(new URL("../../artifacts/live-pilot-insert.sql", import.meta.url), lines.join("\n") + "\n");

// print a compact evidence summary
const byType: Record<string, number> = {};
for (const s of store.all()) byType[s.record.entityType] = (byType[s.record.entityType] ?? 0) + 1;
process.stdout.write(JSON.stringify({
  runs,
  totalCanonicalEntities: store.size(),
  byType,
  quarantined: store.quarantined.length,
  sqlStatements: lines.length,
}, null, 2) + "\n");

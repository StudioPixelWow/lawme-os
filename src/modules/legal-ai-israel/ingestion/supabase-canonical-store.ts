/**
 * Supabase-backed CanonicalStore (service-role, DEV only).
 *
 * The only networked persistence path for the canonical slice. Reads creds from
 * the operator environment, never from committed code:
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
 * Writes into the additive tables from
 * 20260806120000_canonical_ingestion_v1.sql (which must be applied first, with
 * founder approval). The service-role key must only ever point at the DEV
 * project (udispadsbxqicmawqcuk). Never production, never committed.
 *
 * Dedup/versioning mirror the in-memory store: identical content_hash → skip
 * (duplicate); changed content → new version row + head update.
 */
import { createClient } from "@supabase/supabase-js";
import type { CanonicalRecord, VersionStatus } from "./canonical/envelope.ts";
import type { Checkpoint, QuarantinedRecord } from "./contract.ts";
import type { CanonicalStore, StoredRecord, UpsertResult, DeadLetter } from "./store.ts";

function requireEnv(name: string, alt?: string): string {
  const v = process.env[name] ?? (alt ? process.env[alt] : undefined);
  if (!v) throw new Error(`missing env ${name}${alt ? ` (or ${alt})` : ""}`);
  return v;
}
function isoNow(): string {
  return new Date().toISOString();
}

export function createSupabaseCanonicalStore(): CanonicalStore {
  const url = requireEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const client = createClient(url, key, { db: { schema: "legalai" }, auth: { persistSession: false } });

  const loadCheckpoint = async (source: string, dataset: string | null): Promise<Checkpoint | null> => {
    const { data } = await client
      .from("ingestion_checkpoints")
      .select("*")
      .eq("source", source)
      .eq("dataset", dataset ?? "")
      .maybeSingle();
    if (!data) return null;
    return {
      source: data.source, dataset: data.dataset === "" ? null : data.dataset,
      mode: data.mode, cursor: data.cursor, page: data.page,
      lastModified: data.last_modified, done: data.done, fetched: data.fetched,
    };
  };

  const saveCheckpoint = async (cp: Checkpoint): Promise<void> => {
    await client.from("ingestion_checkpoints").upsert({
      source: cp.source, dataset: cp.dataset ?? "", mode: cp.mode, cursor: cp.cursor,
      page: cp.page, last_modified: cp.lastModified, done: cp.done, fetched: cp.fetched,
      updated_at: isoNow(),
    }, { onConflict: "source,dataset" });
  };

  const getByCanonicalId = async (canonicalId: string): Promise<StoredRecord | null> => {
    const { data } = await client
      .from("canonical_entities").select("*").eq("canonical_id", canonicalId).maybeSingle();
    if (!data) return null;
    return {
      record: { envelope: { contentHash: data.content_hash } } as unknown as CanonicalRecord,
      versionNumber: data.version_number, status: data.version_status,
      tombstoned: data.tombstoned, indexed: data.version_status === "indexed" || data.version_status === "published",
    };
  };

  const writeHead = async (record: CanonicalRecord, versionNumber: number): Promise<void> => {
    const e = record.envelope;
    await client.from("canonical_entities").upsert({
      canonical_id: e.canonicalId, entity_type: e.entityType,
      source_platform: e.sourcePlatform, source_publisher: e.sourcePublisher,
      source_dataset: e.sourceDataset, source_resource: e.sourceResource, source_url: e.sourceUrl,
      external_record_id: e.externalRecordId, first_seen_at: e.firstSeenAt, last_verified_at: e.lastVerifiedAt,
      extraction_method: e.extractionMethod, parser_version: e.parserVersion, mapping_version: e.mappingVersion,
      confidence: e.confidence, content_hash: e.contentHash, raw_record_hash: e.rawRecordHash,
      content_level: e.contentLevel, version_number: versionNumber, version_status: "persisted",
      fields: record.fields, extracted_metadata: record.extractedMetadata, source_extras: record.sourceExtras,
      primary_text: record.primaryText ? record.primaryText.raw : null,
      primary_text_language: record.primaryText ? record.primaryText.language : null,
      updated_at: isoNow(),
    }, { onConflict: "canonical_id" });
    // external ids
    for (const x of e.externalIdentifiers) {
      await client.from("canonical_external_ids").upsert(
        { canonical_id: e.canonicalId, scheme: x.scheme, value: x.value, confidence: x.confidence },
        { onConflict: "canonical_id,scheme,value" },
      );
    }
    // immutable version row
    await client.from("canonical_entity_versions").update({ is_current: false }).eq("canonical_id", e.canonicalId);
    await client.from("canonical_entity_versions").insert({
      canonical_id: e.canonicalId, version_number: versionNumber, content_hash: e.contentHash,
      fields: record.fields, primary_text: record.primaryText ? record.primaryText.raw : null,
      change_kind: versionNumber === 1 ? "new_version" : "new_version", is_current: true,
      provenance: { sourcePlatform: e.sourcePlatform, sourceUrl: e.sourceUrl, parserVersion: e.parserVersion },
    });
    // relationships
    for (const r of record.relationships) {
      await client.from("canonical_relationships").upsert({
        type: r.type, from_canonical_id: r.fromCanonicalId, to_canonical_id: r.toCanonicalId,
        to_external_ref: r.toExternalRef, confidence: r.confidence,
        assertion_status: r.toCanonicalId ? "asserted" : "asserted",
      }, { onConflict: "type,from_canonical_id,to_canonical_id,to_external_ref" });
    }
  };

  return {
    loadCheckpoint,
    saveCheckpoint,
    getByCanonicalId,

    async upsert(record: CanonicalRecord): Promise<UpsertResult> {
      const id = record.envelope.canonicalId;
      const existing = await getByCanonicalId(id);
      if (!existing) {
        await writeHead(record, 1);
        return { outcome: "new", versionNumber: 1, canonicalId: id };
      }
      if (existing.record.envelope.contentHash === record.envelope.contentHash) {
        await client.from("canonical_entities").update({ last_verified_at: record.envelope.lastVerifiedAt })
          .eq("canonical_id", id);
        return { outcome: "duplicate", versionNumber: existing.versionNumber, canonicalId: id };
      }
      const next = existing.versionNumber + 1;
      await writeHead(record, next);
      return { outcome: "updated", versionNumber: next, canonicalId: id };
    },

    async tombstone(canonicalId: string): Promise<void> {
      await client.from("canonical_entities")
        .update({ tombstoned: true, version_status: "failed", updated_at: isoNow() })
        .eq("canonical_id", canonicalId);
    },
    async markIndexed(canonicalId: string): Promise<void> {
      await client.from("canonical_entities").update({ version_status: "indexed" }).eq("canonical_id", canonicalId);
    },
    async markStatus(canonicalId: string, status: VersionStatus): Promise<void> {
      await client.from("canonical_entities").update({ version_status: status }).eq("canonical_id", canonicalId);
    },
    async quarantine(q: QuarantinedRecord): Promise<void> {
      await client.from("ingestion_quarantine").insert({
        source: q.record.envelope.sourcePlatform, dataset: q.record.envelope.sourceDataset,
        entity_type: q.record.entityType, canonical_id: q.record.envelope.canonicalId,
        reasons: q.reasons, record: q.record as unknown as Record<string, unknown>,
      });
    },
    async deadLetter(dl: DeadLetter): Promise<void> {
      await client.from("ingestion_dead_letter").insert({
        source: "collector", external_id: dl.externalId, source_url: dl.sourceUrl,
        raw_hash: dl.rawHash, error: dl.error,
      });
    },
  };
}

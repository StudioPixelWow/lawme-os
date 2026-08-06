/**
 * DataGovCkanCollector (Track B) — implements CanonicalCollector.
 *
 * ONE collector, configurable by dataset id (ararim | mishmoret | judgments) —
 * never a collector per dataset. Uses the official CKAN `datastore_search` API
 * (documented public API, no auth, no bypass). HTTP is injected so the pipeline
 * runs offline in tests. content_level is decided by the mapper per dataset and
 * per row (a summary row is never marked full_text).
 */
import type { CanonicalRecord } from "../canonical/envelope.ts";
import type {
  CanonicalCollector, Checkpoint, RawRecord, RawRecordBatch, ValidationResult, PersistResult,
} from "../contract.ts";
import type { JsonHttp } from "./http.ts";
import type { CanonicalStore } from "../store.ts";
import type { ValidationConfig } from "../quality.ts";
import { validateCanonicalRecords, DEFAULT_VALIDATION } from "../quality.ts";
import { persistCanonicalRecords } from "../persist-canonical.ts";
import { mapDataGovTier1Row, TIER1_DATASETS, TIER1_MAPPING_VERSION } from "../mappers/data-gov-tier1.ts";
import type { MapContext } from "../mappers/shared.ts";
import { hashObject, str } from "../mappers/shared.ts";

const BASE = "https://data.gov.il";

export interface CkanConfig {
  datasetId: string; // ararim | mishmoret | judgments
  resourceId: string; // the datastore resource id
  pageSize: number;
  mode: "backfill" | "incremental";
  pilotLimit: number | null;
  now: string;
}

interface CkanDatastorePage {
  success?: boolean;
  result?: {
    records?: Record<string, unknown>[];
    total?: number;
    _links?: { next?: string };
  };
}

export class DataGovCkanCollector implements CanonicalCollector {
  readonly code = "data_gov_il";
  readonly datasetId: string;
  private readonly http: JsonHttp;
  private readonly store: CanonicalStore;
  private readonly cfg: CkanConfig;
  private readonly validation: ValidationConfig;

  constructor(
    http: JsonHttp,
    store: CanonicalStore,
    cfg: CkanConfig,
    validation: ValidationConfig = DEFAULT_VALIDATION,
  ) {
    if (!TIER1_DATASETS[cfg.datasetId]) {
      throw new Error(`unknown Tier-1 dataset: ${cfg.datasetId}`);
    }
    this.http = http;
    this.store = store;
    this.cfg = cfg;
    this.validation = validation;
    this.datasetId = cfg.datasetId;
  }

  private ctx(): MapContext {
    return { now: this.cfg.now, parserVersion: "datagov-ckan-1", mappingVersion: TIER1_MAPPING_VERSION };
  }

  async discoverCheckpoint(): Promise<Checkpoint> {
    const saved = await this.store.loadCheckpoint(this.code, this.cfg.datasetId);
    if (saved && !saved.done) return saved;
    return {
      source: this.code, dataset: this.cfg.datasetId, mode: this.cfg.mode,
      cursor: "0", page: 0, lastModified: null, done: false, fetched: 0,
    };
  }

  async fetchBatch(checkpoint: Checkpoint): Promise<RawRecordBatch> {
    if (checkpoint.done) return { records: [], nextCheckpoint: checkpoint };
    const offset = Number(checkpoint.cursor ?? "0");
    const limit = this.cfg.pageSize;
    const url =
      `${BASE}/api/3/action/datastore_search?resource_id=${encodeURIComponent(this.cfg.resourceId)}` +
      `&limit=${limit}&offset=${offset}`;
    const body = (await this.http.getJson(url)) as CkanDatastorePage;
    const rows = body.result?.records ?? [];

    const records: RawRecord[] = rows.map((row) => {
      const externalId = str(row._id) ?? str(row.id) ?? hashObject(row).slice(0, 12);
      return {
        externalId: `${this.cfg.datasetId}:${externalId}`,
        sourceUrl: `${BASE}/dataset/${this.cfg.datasetId}`,
        raw: row,
        rawHash: hashObject(row),
        modifiedAt: str(row.metadata_modified) ?? null,
        deleted: str(row.__deleted) === "true" || row.__deleted === true,
      };
    });

    const fetched = offset + rows.length;
    const cap = this.cfg.pilotLimit;
    const done = rows.length < limit || (cap !== null && fetched >= cap);
    const next: Checkpoint = {
      ...checkpoint, cursor: String(fetched), page: checkpoint.page + 1,
      fetched, done,
    };
    return { records, nextCheckpoint: next };
  }

  async mapRecord(record: RawRecord): Promise<CanonicalRecord[]> {
    return mapDataGovTier1Row(this.cfg.datasetId, record, this.ctx());
  }

  validate(records: readonly CanonicalRecord[]): ValidationResult {
    return validateCanonicalRecords(records, this.validation);
  }

  async persist(records: readonly CanonicalRecord[]): Promise<PersistResult> {
    return persistCanonicalRecords(this.store, records);
  }
}

/**
 * KnessetODataCollector (Track A) — implements CanonicalCollector.
 *
 * Reads the official Knesset OData ParliamentInfo API (verified open, no auth).
 * One collector instance walks a configured ORDERED list of entity sets; the
 * checkpoint tracks which set + offset, so a run resumes exactly where it
 * stopped. HTTP is injected (offline-testable). No scraping, no bypass — a
 * blocked status is terminal (see HttpAccessBlockedError).
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
import { mapKnessetRecord, KNESSET_MAPPING_VERSION } from "../mappers/knesset.ts";
import type { MapContext } from "../mappers/shared.ts";
import { hashObject, str } from "../mappers/shared.ts";

const BASE = "https://knesset.gov.il/OdataV4/ParliamentInfo";
const RESERVED_ENTITYSET = "__entitySet";

export interface KnessetConfig {
  entitySets: readonly string[]; // ordered, e.g. ["KNS_IsraelLaw","KNS_Bill",...]
  pageSize: number;
  mode: "backfill" | "incremental";
  pilotLimitPerSet: number | null; // Step 16 pilot cap
  now: string; // injected timestamp for deterministic envelopes
}

export const DEFAULT_KNESSET_CONFIG: KnessetConfig = {
  entitySets: ["KNS_IsraelLaw", "KNS_Bill", "KNS_DocumentBill", "KNS_Subject", "KNS_BillInitiator"],
  pageSize: 100,
  mode: "backfill",
  pilotLimitPerSet: 500,
  now: "1970-01-01T00:00:00.000Z",
};

interface ODataPage {
  value?: Record<string, unknown>[];
  "@odata.count"?: number;
}

export class KnessetODataCollector implements CanonicalCollector {
  readonly code = "knesset_odata";
  readonly datasetId: string | null;
  private readonly http: JsonHttp;
  private readonly store: CanonicalStore;
  private readonly cfg: KnessetConfig;
  private readonly validation: ValidationConfig;

  constructor(
    http: JsonHttp,
    store: CanonicalStore,
    cfg: KnessetConfig = DEFAULT_KNESSET_CONFIG,
    validation: ValidationConfig = DEFAULT_VALIDATION,
  ) {
    this.http = http;
    this.store = store;
    this.cfg = cfg;
    this.validation = validation;
    this.datasetId = cfg.entitySets[0] ?? null;
  }

  private ctx(): MapContext {
    return { now: this.cfg.now, parserVersion: "knesset-odata-1", mappingVersion: KNESSET_MAPPING_VERSION };
  }

  async discoverCheckpoint(): Promise<Checkpoint> {
    const first = this.cfg.entitySets[0] ?? null;
    const saved = await this.store.loadCheckpoint(this.code, first);
    if (saved && !saved.done) return saved;
    return {
      source: this.code, dataset: first, mode: this.cfg.mode,
      cursor: "0", page: 0, lastModified: null, done: first === null, fetched: 0,
    };
  }

  private nextEntitySet(current: string | null): string | null {
    if (current === null) return null;
    const i = this.cfg.entitySets.indexOf(current);
    return i >= 0 && i + 1 < this.cfg.entitySets.length ? this.cfg.entitySets[i + 1] : null;
  }

  async fetchBatch(checkpoint: Checkpoint): Promise<RawRecordBatch> {
    const entitySet = checkpoint.dataset;
    if (!entitySet || checkpoint.done) {
      return { records: [], nextCheckpoint: { ...checkpoint, done: true } };
    }
    const skip = Number(checkpoint.cursor ?? "0");
    const top = this.cfg.pageSize;
    const url = `${BASE}/${entitySet}?$format=json&$top=${top}&$skip=${skip}`;
    const body = (await this.http.getJson(url)) as ODataPage;
    const rows = body.value ?? [];

    const records: RawRecord[] = rows.map((row) => {
      const raw = { ...row, [RESERVED_ENTITYSET]: entitySet };
      const externalId =
        str(row.LawID) ?? str(row.BillID) ?? str(row.DocumentBillID) ??
        str(row.SubjectID) ?? str(row.PersonID) ?? hashObject(row).slice(0, 12);
      return {
        externalId,
        sourceUrl: `${BASE}/${entitySet}`,
        raw,
        rawHash: hashObject(row),
        modifiedAt: str(row.LastUpdatedDate),
        deleted: false,
      };
    });

    const fetchedInSet = skip + rows.length;
    const cap = this.cfg.pilotLimitPerSet;
    const setExhausted = rows.length < top || (cap !== null && fetchedInSet >= cap);

    let next: Checkpoint;
    if (setExhausted) {
      const following = this.nextEntitySet(entitySet);
      next = {
        source: this.code, dataset: following, mode: this.cfg.mode,
        cursor: "0", page: 0, lastModified: null,
        done: following === null, fetched: 0,
      };
    } else {
      next = {
        ...checkpoint, cursor: String(fetchedInSet), page: checkpoint.page + 1,
        fetched: fetchedInSet, done: false,
      };
    }
    return { records, nextCheckpoint: next };
  }

  async mapRecord(record: RawRecord): Promise<CanonicalRecord[]> {
    const entitySet = str(record.raw[RESERVED_ENTITYSET]) ?? this.datasetId ?? "";
    return mapKnessetRecord(entitySet, record, this.ctx());
  }

  validate(records: readonly CanonicalRecord[]): ValidationResult {
    return validateCanonicalRecords(records, this.validation);
  }

  async persist(records: readonly CanonicalRecord[]): Promise<PersistResult> {
    return persistCanonicalRecords(this.store, records);
  }
}

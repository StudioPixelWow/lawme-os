/**
 * data.gov.il collector (LEGAL AI ISRAEL — first real adapter).
 *
 * Talks to the official CKAN open-data API (`/api/3/action/*`). No scraping, no
 * auth, no bypass — it is a documented public API. Extends BaseCollector, so the
 * enabled+mode guard still applies (discovery is metadata-only; downloads need a
 * download-capable mode). HTTP is injected so the logic is unit-testable offline.
 */
import { BaseCollector } from "../base.ts";
import type { CollectorConfig } from "../base.ts";
import type {
  SourceAuditResult, DiscoveryBatch, DiscoveredItem, SourceMetadata,
  DownloadedDocument, NormalizedLegalMetadata,
} from "../types.ts";
import { sha256Hex } from "../../ingest/pipeline.ts";

const BASE = "https://data.gov.il";
// Legal-relevant discovery terms (CKAN `q` supports OR).
const LEGAL_QUERY = "פסיקה OR \"פסקי דין\" OR חקיקה OR \"בתי משפט\" OR משפט OR תקנות";
const PAGE_SIZE = 25;

export interface CkanResource {
  id: string;
  url: string;
  format: string | null;
  name: string | null;
}
export interface CkanDataset {
  id: string;
  name: string;
  title: string | null;
  notes: string | null;
  license_title: string | null;
  license_id: string | null;
  resources: CkanResource[];
  metadata_modified?: string | null;
}

export interface CkanHttp {
  json(url: string): Promise<unknown>;
  bytes(url: string): Promise<{ bytes: Uint8Array; contentType: string | null }>;
}

const defaultHttp: CkanHttp = {
  async json(url) {
    const res = await fetch(url, { headers: { "user-agent": "LegalAIIsrael-Research/0.1" } });
    if (!res.ok) throw new Error(`ckan http ${res.status}`);
    return res.json();
  },
  async bytes(url) {
    const res = await fetch(url, { headers: { "user-agent": "LegalAIIsrael-Research/0.1" } });
    if (!res.ok) throw new Error(`resource http ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    return { bytes: buf, contentType: res.headers.get("content-type") };
  },
};

function pickDataResource(ds: CkanDataset): CkanResource | null {
  const preferred = ["csv", "json", "xml", "xlsx"];
  for (const fmt of preferred) {
    const hit = ds.resources.find((r) => (r.format ?? "").toLowerCase() === fmt);
    if (hit) return hit;
  }
  return ds.resources[0] ?? null;
}

export class DataGovIlCollector extends BaseCollector {
  private readonly http: CkanHttp;
  constructor(config: CollectorConfig, http: CkanHttp = defaultHttp) {
    super(config);
    this.http = http;
  }

  async audit(): Promise<SourceAuditResult> {
    try {
      // Probe the confirmed-public search endpoint (not status_show, which
      // data.gov.il gates). A 403 here means bot protection — which we do NOT
      // bypass; it surfaces as NO_GO, not as a reason to spoof a browser.
      const body = (await this.http.json(
        `${BASE}/api/3/action/package_search?q=${encodeURIComponent(LEGAL_QUERY)}&rows=1`,
      )) as { success?: boolean; result?: { count?: number } };
      const ok = body?.success === true;
      return {
        reachable: ok, hasPublicApi: ok, apiKind: "ckan", requiresLogin: false, hasCaptcha: false,
        robotsChecked: false, robotsAllowsPath: "unknown", termsChecked: false,
        automatedAccessStatus: ok ? "apparently_allowed" : "unclear",
        decision: ok ? "LIMITED_GO" : "NO_GO",
        notesHe: ok ? `CKAN package_search מגיב (count=${body.result?.count ?? "?"}).` : "ה-API לא אישר success.",
      };
    } catch (e) {
      return {
        reachable: false, hasPublicApi: false, apiKind: "ckan", requiresLogin: false, hasCaptcha: false,
        robotsChecked: false, robotsAllowsPath: "unknown", termsChecked: false,
        automatedAccessStatus: "unclear", decision: "NO_GO", notesHe: `שגיאה: ${String((e as Error).message)}`,
      };
    }
  }

  protected async doDiscover(cursor?: string): Promise<DiscoveryBatch> {
    const start = cursor ? Number(cursor) : 0;
    const url = `${BASE}/api/3/action/package_search?q=${encodeURIComponent(LEGAL_QUERY)}&rows=${PAGE_SIZE}&start=${start}`;
    const body = (await this.http.json(url)) as { success?: boolean; result?: { count: number; results: CkanDataset[] } };
    if (!body?.success || !body.result) return { items: [], nextCursor: null, windowLabel: `start=${start}` };
    const items: DiscoveredItem[] = body.result.results.map((ds) => ({
      externalId: ds.id,
      url: `${BASE}/dataset/${ds.name}`,
      caseNumberRaw: null,
      courtName: null,
      proceedingType: null,
      decisionDate: ds.metadata_modified ?? null,
    }));
    const nextStart = start + PAGE_SIZE;
    const nextCursor = nextStart < body.result.count ? String(nextStart) : null;
    return { items, nextCursor, windowLabel: `start=${start}/${body.result.count}` };
  }

  protected async doFetchMetadata(item: DiscoveredItem): Promise<SourceMetadata> {
    const url = `${BASE}/api/3/action/package_show?id=${encodeURIComponent(item.externalId ?? "")}`;
    const body = (await this.http.json(url)) as { success?: boolean; result?: CkanDataset };
    return { raw: (body?.result ?? {}) as Record<string, unknown> };
  }

  protected async doDownload(item: DiscoveredItem): Promise<DownloadedDocument> {
    const meta = await this.doFetchMetadata(item);
    const ds = meta.raw as unknown as CkanDataset;
    const resource = pickDataResource(ds);
    if (!resource) throw new Error("no downloadable resource on dataset");
    const { bytes, contentType } = await this.http.bytes(resource.url);
    return { bytes, mimeType: contentType ?? "application/octet-stream", sha256: sha256Hex(bytes), sourceUrl: resource.url };
  }

  protected async doNormalizeMetadata(metadata: SourceMetadata): Promise<NormalizedLegalMetadata> {
    const ds = metadata.raw as unknown as CkanDataset;
    const licenseOpen = /(open|פתוח|cc)/i.test(`${ds.license_title ?? ""} ${ds.license_id ?? ""}`);
    return {
      caseNumberNormalized: null, // datasets are not single judgments
      courtName: null, courtLevel: null,
      decisionDate: ds.metadata_modified ?? null,
      documentType: "other",
      publicationAllowed: licenseOpen ? true : "unknown",
      eligibleForPublicCorpus: false, // datasets enter as discovery until reviewed
    };
  }
}

/** Discovery-mode instance (safe default: metadata only, no downloads). */
export function createDataGovIlDiscoveryCollector(http?: CkanHttp): DataGovIlCollector {
  return new DataGovIlCollector({ code: "data_gov_il", mode: "discovery_only", enabled: true }, http);
}

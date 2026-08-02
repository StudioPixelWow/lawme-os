/**
 * Disabled-by-default collector base + run guard (LEGAL AI ISRAEL — Phase 1).
 *
 * Every collector starts DISABLED. Fetch/download/discovery operations
 * fail-closed until a completed Source Audit sets an explicit allowed mode.
 * The guard is the single chokepoint that decides whether an operation may run.
 */
import type {
  LegalSourceCollector, CollectorMode, DiscoveryBatch, DiscoveredItem,
  SourceMetadata, DownloadedDocument, NormalizedLegalMetadata, CollectorHealth,
  SourceAuditResult, CollectorConstraints,
} from "./types.ts";
import { DEFAULT_CONSTRAINTS } from "./types.ts";

export class CollectorDisabledError extends Error {
  readonly code: string;
  readonly mode: CollectorMode;
  constructor(code: string, mode: CollectorMode) {
    super(`collector "${code}" is not permitted to run (mode=${mode})`);
    this.name = "CollectorDisabledError";
    this.code = code;
    this.mode = mode;
  }
}

/** Which modes may DOWNLOAD document bodies. */
export function modeAllowsDownload(mode: CollectorMode): boolean {
  return mode === "public_search_pilot" || mode === "official_feed" || mode === "licensed_full";
}
/** Which modes may index METADATA. */
export function modeAllowsMetadata(mode: CollectorMode): boolean {
  return (
    mode === "metadata_only" || mode === "discovery_only" ||
    mode === "public_search_pilot" || mode === "official_feed" || mode === "licensed_full"
  );
}
/** Which modes may run any automated operation at all. */
export function modeAllowsAutomation(mode: CollectorMode): boolean {
  return mode !== "disabled" && mode !== "manual_only";
}

export interface CollectorConfig {
  code: string;
  mode: CollectorMode;
  enabled: boolean;
  constraints?: CollectorConstraints;
}

/**
 * Base collector: enforces the enabled+mode gate before any operation.
 * Concrete adapters override the protected do* methods; they are only reached
 * when the guard permits. Nothing here fetches the network.
 */
export abstract class BaseCollector implements LegalSourceCollector {
  readonly code: string;
  readonly mode: CollectorMode;
  readonly enabled: boolean;
  protected readonly constraints: CollectorConstraints;

  constructor(config: CollectorConfig) {
    this.code = config.code;
    this.mode = config.mode;
    this.enabled = config.enabled;
    this.constraints = config.constraints ?? DEFAULT_CONSTRAINTS;
  }

  private guard(op: "automate" | "metadata" | "download"): void {
    if (!this.enabled) throw new CollectorDisabledError(this.code, this.mode);
    if (!modeAllowsAutomation(this.mode)) throw new CollectorDisabledError(this.code, this.mode);
    if (op === "metadata" && !modeAllowsMetadata(this.mode)) throw new CollectorDisabledError(this.code, this.mode);
    if (op === "download" && !modeAllowsDownload(this.mode)) throw new CollectorDisabledError(this.code, this.mode);
  }

  // Audit is always allowed — it is how a source becomes eligible.
  abstract audit(): Promise<SourceAuditResult>;

  async discover(cursor?: string): Promise<DiscoveryBatch> {
    this.guard("metadata");
    return this.doDiscover(cursor);
  }
  async fetchMetadata(item: DiscoveredItem): Promise<SourceMetadata> {
    this.guard("metadata");
    return this.doFetchMetadata(item);
  }
  async download(item: DiscoveredItem): Promise<DownloadedDocument> {
    this.guard("download");
    return this.doDownload(item);
  }
  async normalizeMetadata(metadata: SourceMetadata): Promise<NormalizedLegalMetadata> {
    return this.doNormalizeMetadata(metadata);
  }
  async healthCheck(): Promise<CollectorHealth> {
    return { ok: true, mode: this.mode, enabled: this.enabled, lastError: null };
  }

  protected doDiscover(cursor?: string): Promise<DiscoveryBatch> {
    void cursor;
    throw new CollectorDisabledError(this.code, this.mode);
  }
  protected doFetchMetadata(item: DiscoveredItem): Promise<SourceMetadata> {
    void item;
    throw new CollectorDisabledError(this.code, this.mode);
  }
  protected doDownload(item: DiscoveredItem): Promise<DownloadedDocument> {
    void item;
    throw new CollectorDisabledError(this.code, this.mode);
  }
  protected doNormalizeMetadata(metadata: SourceMetadata): Promise<NormalizedLegalMetadata> {
    void metadata;
    return Promise.resolve({
      caseNumberNormalized: null, courtName: null, courtLevel: null, decisionDate: null,
      documentType: "unknown", publicationAllowed: "unknown", eligibleForPublicCorpus: false,
    });
  }
}

/**
 * A concrete, permanently-disabled collector used for every source until its
 * Source Audit passes. Auditing returns "audit pending" without any network.
 */
export class DisabledCollector extends BaseCollector {
  async audit(): Promise<SourceAuditResult> {
    return {
      reachable: false, hasPublicApi: false, apiKind: "unknown", requiresLogin: false,
      hasCaptcha: false, robotsChecked: false, robotsAllowsPath: "unknown", termsChecked: false,
      automatedAccessStatus: "unclear", decision: "NO_GO",
      notesHe: "בדיקת מקור טרם הושלמה בסביבה זו — האוסף נותר מושבת עד לאימות טכני ומשפטי.",
    };
  }
}

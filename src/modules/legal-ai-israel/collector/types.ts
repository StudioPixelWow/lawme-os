/**
 * Collector framework contracts (LEGAL AI ISRAEL — Phase 1).
 *
 * The uniform interface every source adapter implements. Collectors are
 * DISABLED by default and may only run after a Source Audit sets an explicit
 * allowed mode. This file is contracts + policy only; it performs no fetching.
 */

export type CollectorMode =
  | "disabled"
  | "manual_only"
  | "discovery_only"
  | "public_search_pilot"
  | "metadata_only"
  | "official_feed"
  | "licensed_full";

export type AutomatedAccessStatus =
  | "allowed"
  | "apparently_allowed"
  | "unclear"
  | "prohibited"
  | "manual_only";

export type AuditDecision = "GO" | "LIMITED_GO" | "METADATA_ONLY" | "DISCOVERY_ONLY" | "NO_GO";

/** Mandatory politeness/safety constraints — enforced, never optional. */
export interface CollectorConstraints {
  userAgent: string;             // identified, honest project UA
  minIntervalMsPerDomain: number; // >= 3000 (1 req / 3–5s) unless official API says otherwise
  maxRetries: number;
  backoff: "exponential";
  respectRetryAfter: true;
  proxyRotation: false;           // never
  ipRotation: false;              // never
  identitySpoofing: false;        // never
  solveCaptcha: false;            // never
  autoLogin: false;               // never
  killSwitch: true;               // per-source stop
  autoStopOnErrorRateAbove: number; // fraction of 403/429/5xx that triggers stop
}

export const DEFAULT_CONSTRAINTS: CollectorConstraints = {
  userAgent: "LegalAIIsrael-Research/0.1 (+contact: founder-provided)",
  minIntervalMsPerDomain: 4000,
  maxRetries: 3,
  backoff: "exponential",
  respectRetryAfter: true,
  proxyRotation: false,
  ipRotation: false,
  identitySpoofing: false,
  solveCaptcha: false,
  autoLogin: false,
  killSwitch: true,
  autoStopOnErrorRateAbove: 0.1,
};

export interface SourceAuditResult {
  reachable: boolean;
  hasPublicApi: boolean;
  apiKind: "rest" | "ckan" | "odata" | "rss" | "sitemap" | "none" | "unknown";
  requiresLogin: boolean;
  hasCaptcha: boolean;
  robotsChecked: boolean;
  robotsAllowsPath: boolean | "unknown";
  termsChecked: boolean;
  automatedAccessStatus: AutomatedAccessStatus;
  decision: AuditDecision;
  notesHe: string;
}

export interface DiscoveredItem {
  externalId: string | null;
  url: string;
  caseNumberRaw: string | null;
  courtName: string | null;
  proceedingType: string | null;
  decisionDate: string | null;
}

export interface DiscoveryBatch {
  items: readonly DiscoveredItem[];
  nextCursor: string | null;
  windowLabel: string | null;
}

export interface SourceMetadata {
  raw: Record<string, unknown>;
}

export interface DownloadedDocument {
  bytes: Uint8Array;
  mimeType: string;
  sha256: string;
  sourceUrl: string;
}

export interface NormalizedLegalMetadata {
  caseNumberNormalized: string | null;
  courtName: string | null;
  courtLevel: string | null;
  decisionDate: string | null;
  documentType: "judgment" | "decision" | "other" | "unknown";
  publicationAllowed: boolean | "unknown";
  eligibleForPublicCorpus: boolean;
}

export interface CollectorHealth {
  ok: boolean;
  mode: CollectorMode;
  enabled: boolean;
  lastError: string | null;
}

/** Uniform collector interface (Phase-1 shape). */
export interface LegalSourceCollector {
  readonly code: string;
  readonly mode: CollectorMode;
  readonly enabled: boolean;
  audit(): Promise<SourceAuditResult>;
  discover(cursor?: string): Promise<DiscoveryBatch>;
  fetchMetadata(item: DiscoveredItem): Promise<SourceMetadata>;
  download(item: DiscoveredItem): Promise<DownloadedDocument>;
  normalizeMetadata(metadata: SourceMetadata): Promise<NormalizedLegalMetadata>;
  healthCheck(): Promise<CollectorHealth>;
}

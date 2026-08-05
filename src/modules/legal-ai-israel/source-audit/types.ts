/**
 * Legal Source Audit & Discovery Engine — shared types.
 *
 * Status unions mirror the DB CHECK constraints in
 * supabase/migrations/20260805130000_legal_source_audit_discovery.sql.
 * No enums (node --test type-stripping): plain string-literal unions.
 */

export type AccessStatus =
  | "unknown" | "public" | "restricted" | "login_required" | "paid" | "blocked" | "unavailable";

export type TechnicalAccessStatus =
  | "unknown" | "open" | "partially_open" | "rate_limited" | "captcha"
  | "waf_blocked" | "robots_disallowed" | "authentication_required" | "unavailable";

export type LegalReuseStatus =
  | "unknown" | "open_license" | "public_reuse_allowed" | "personal_use_only"
  | "commercial_permission_required" | "automated_access_prohibited"
  | "written_permission_required" | "restricted";

export type CollectorStatus =
  | "not_evaluated" | "audit_required" | "ready_to_build" | "permission_required"
  | "blocked" | "development" | "testing" | "active" | "paused" | "retired";

export type AuditStatus =
  | "pending" | "running" | "completed" | "incomplete" | "manual_review_required" | "failed";

export type SourceType =
  | "official_government" | "court" | "tribunal" | "regulator" | "municipality"
  | "academic" | "non_profit" | "commercial_database" | "law_firm" | "open_data"
  | "archive" | "news" | "blog" | "document_repository" | "search_engine" | "other";

export type OwnerType = "official" | "public" | "academic" | "commercial" | "non_profit" | "unknown";

/** Final triage bucket for the ranked source list. */
export type SourceVerdict = "OPEN" | "ASK" | "BLOCKED" | "REVIEW";

export type EvidenceType =
  | "homepage" | "robots" | "sitemap" | "terms" | "license" | "api"
  | "feed" | "search" | "document_sample" | "headers" | "error";

export interface EvidenceItem {
  evidenceType: EvidenceType;
  url: string | null;
  statusCode: number | null;
  contentHash: string | null;
  summary: string;
  observedAt: string;
}

export interface RobotsFindings {
  found: boolean;
  statusCode: number | null;
  contentHash: string | null;
  disallowsRelevantPaths: boolean | null;
  crawlDelaySeconds: number | null;
  sitemaps: string[];
}

export interface SitemapFindings {
  found: boolean;
  kind: "index" | "urlset" | "none";
  childSitemapCount: number;
  estimatedUrls: number;
  sampleUrls: string[];
  likelyJudgmentUrls: number;
  likelyPdfUrls: number;
}

export interface ApiFindings {
  hasApi: boolean;
  wpJson: boolean;
  openApi: boolean;
  requiresAuth: boolean | null;
  resourceHints: string[];
}

export interface FeedFindings {
  hasRss: boolean;
  hasAtom: boolean;
  feedUrls: string[];
}

export interface SearchFindings {
  hasPublicSearch: boolean;
  method: "GET" | "POST" | "unknown";
  queryParam: string | null;
  hasPagination: boolean | null;
}

/** Extracted terms *signals* — never a final legal conclusion. */
export interface TermsSignals {
  termsUrl: string | null;
  privacyUrl: string | null;
  licenseUrl: string | null;
  personalUseOnly: boolean;
  noCommercialUse: boolean;
  noScraping: boolean;
  noAutomatedAccess: boolean;
  attributionRequired: boolean;
  openDataLicense: boolean;
  publicDomainClaim: boolean;
  permissionRequired: boolean;
  noTermsFound: boolean;
}

export interface CapabilityFlags {
  hasPublicSearch: boolean;
  hasPublicDocuments: boolean;
  hasDirectFiles: boolean;
  hasPdf: boolean;
  hasDocx: boolean;
  hasHtmlDocuments: boolean;
  hasJson: boolean;
  hasApi: boolean;
  hasRss: boolean;
  hasAtom: boolean;
  hasSitemap: boolean;
  hasPagination: boolean;
}

export interface SourceScores {
  coverageScore: number;
  accessScore: number;
  metadataQualityScore: number;
  documentQualityScore: number;
  legalClarityScore: number;
  priorityScore: number;
}

/** Everything the audit engine derives for a source (pre-persistence). */
export interface AuditFindings {
  url: string;
  normalizedDomain: string;
  https: boolean;
  reachable: boolean;
  httpStatus: number | null;
  cms: string | null;
  robots: RobotsFindings;
  sitemap: SitemapFindings;
  api: ApiFindings;
  feed: FeedFindings;
  search: SearchFindings;
  terms: TermsSignals;
  accessStatus: AccessStatus;
  technicalAccessStatus: TechnicalAccessStatus;
  legalReuseStatus: LegalReuseStatus;
  auditStatus: AuditStatus;
  auditConfidence: number;
  requiresLogin: boolean;
  requiresCaptcha: boolean;
  recommendedAccessMethod: string | null;
  evidence: EvidenceItem[];
  requestCount: number;
}

/** A registry row as the gate/scoring services consume it. */
export interface SourceRecord {
  name: string;
  normalizedDomain: string;
  sourceType: SourceType;
  auditStatus: AuditStatus;
  accessStatus: AccessStatus;
  technicalAccessStatus: TechnicalAccessStatus;
  legalReuseStatus: LegalReuseStatus;
  collectorStatus: CollectorStatus;
  requiresLogin: boolean;
  requiresCaptcha: boolean;
  requiresWrittenPermission: boolean;
  robotsDisallowsRelevantPaths: boolean | null;
  auditConfidence: number;
  recommendedAccessMethod: string | null;
  hasDocumentedPermission: boolean;
  scores: SourceScores;
}

export interface GateResult {
  allowed: boolean;
  reasons: string[];
  requiredActions: string[];
}

export interface PermissionRecord {
  automatedAccessAllowed: boolean;
  commercialUseAllowed: boolean;
  fullTextStorageAllowed: boolean;
  effectiveFrom: string | null;
  expiresAt: string | null;
  evidenceReference: string | null;
}

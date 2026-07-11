/**
 * LawME ingestion framework — core types (Epic 1 POC).
 * Provider-neutral: adapters return typed normalized objects; persistence
 * happens in a SEPARATE repository layer (never coupled to Supabase here).
 * Vocabulary intentionally mirrors docs/legal-knowledge/unified-legal-document.schema.json
 * and the CHECK constraints of the POC migration — one vocabulary everywhere.
 */

export type DocumentType =
  | "judgment" | "decision" | "legislation" | "regulation" | "order"
  | "bill" | "protocol" | "guidance" | "circular" | "regulator_decision"
  | "ethics_decision" | "academic_article" | "internal_firm_document"
  | "pleading" | "contract" | "legal_opinion" | "evidence" | "court_filing";

export type AuthorityType =
  | "binding" | "persuasive" | "secondary" | "internal" | "unverified" | "unknown";

export type VerificationStatus =
  | "verified_primary" | "verified_licensed" | "secondary_supported"
  | "inference" | "unverified" | "unknown";

export type StoragePolicy = "store_full" | "store_extract" | "pointer_only";

export type AccessClassification =
  | "open"                 // explicit open license / public-domain text at official source
  | "public_unspecified"   // publicly viewable, reuse terms not stated
  | "requires_permission"
  | "restricted"
  | "unknown";

/** Full provenance for every adapter result — required by the trust model. */
export interface FetchProvenance {
  sourceId: string;                    // registry code, e.g. LSR-038
  originalUrl: string;
  canonicalUrl: string | null;
  retrievedAt: string;                 // ISO timestamp
  retrievalMethod: "api" | "feed" | "structured_scrape" | "fixture" | "manual_upload" | `mcp:${string}`;
  httpStatus: number | null;           // null for fixtures
  contentType: string | null;
  sha256: string;
  parserVersion: string;
  /** true when the payload is a local fixture, never a live fetch */
  isFixture: boolean;
}

export interface ExtractionWarning {
  code: string;
  message: string;
}

/** The typed normalized object every adapter must produce. */
export interface NormalizedLegalDocument {
  sourceId: string;
  documentType: DocumentType;
  authorityType: AuthorityType;
  verificationStatus: VerificationStatus;
  title: string;
  titleHe: string | null;
  titleEn: string | null;
  caseNumberRaw: string | null;
  caseNumberNormalized: string | null; // searchKey from the case-number lib
  procedureCode: string | null;
  court: string | null;
  legalDomains: string[];
  documentDate: string | null;         // YYYY-MM-DD
  publicationDate: string | null;
  effectiveDate: string | null;
  versionDate: string | null;
  language: "he" | "en" | "ar" | "mixed" | "other";
  canonicalSourceUrl: string | null;
  originalFileUrl: string | null;
  licenseStatus: string;
  storagePolicy: StoragePolicy;
  accessClassification: AccessClassification;
  /** Raw content as retrieved (or fixture body). Present only when the
   * storage policy allows keeping it. */
  rawContent: string | null;
  rawContentType: string | null;
  /** true when the document body is synthetic test data, never real */
  isSynthetic: boolean;
  provenance: FetchProvenance;
  warnings: ExtractionWarning[];
}

export interface AdapterValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DiscoveredItem {
  externalId: string;
  url: string;
  title: string | null;
  hint: Partial<Pick<NormalizedLegalDocument, "documentType" | "documentDate" | "caseNumberRaw">>;
}

/**
 * The provider-neutral adapter contract. Adapters DO NOT persist anything;
 * they discover, fetch, normalize and validate.
 */
export interface LegalSourceAdapter {
  readonly sourceId: string;           // registry code (LSR-###)
  readonly adapterVersion: string;
  /** List available items (bounded; POC adapters are fixture-backed). */
  discover(limit?: number): Promise<DiscoveredItem[]>;
  /** Fetch metadata only (no body) for an item. */
  fetchMetadata(item: DiscoveredItem): Promise<Partial<NormalizedLegalDocument>>;
  /** Fetch the full document payload. */
  fetchDocument(item: DiscoveredItem): Promise<{ content: string; contentType: string; httpStatus: number | null }>;
  /** Map a fetched payload to the unified normalized object. */
  normalize(item: DiscoveredItem, payload: { content: string; contentType: string; httpStatus: number | null }): Promise<NormalizedLegalDocument>;
  /** Validate a normalized object (schema-level + business rules). */
  validate(doc: NormalizedLegalDocument): AdapterValidationResult;
  /** The permanent public URL for an item. */
  getCanonicalUrl(item: DiscoveredItem): string | null;
  /** sha256 of a payload. */
  calculateHash(content: string): string;
  /** Access/license classification for this source (honest, evidence-based). */
  classifyAccess(): AccessClassification;
  /** Convenience: full pipeline for one item (fetch → normalize → validate). */
  mapToUnifiedSchema(item: DiscoveredItem): Promise<{ doc: NormalizedLegalDocument; validation: AdapterValidationResult }>;
}

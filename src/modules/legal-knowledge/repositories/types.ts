/**
 * Repository layer — domain contracts (Epic 2, Phase 8).
 * The ONLY doorway between domain logic and storage. UI components never
 * call Supabase directly. Two implementations: in-memory (deterministic
 * tests / no-DB fallback) and Supabase (development integration).
 *
 * Every method: returns typed Results, never leaks raw DB errors,
 * preserves organization context + provenance + verification status,
 * paginates with deterministic ordering, avoids N+1.
 */
import type { AuthorityType, DocumentType, StoragePolicy, VerificationStatus } from "../ingestion/core/types.ts";

/* ── result & error model ── */

export type RepoErrorCode =
  | "not_found" | "conflict" | "validation" | "forbidden"
  | "unavailable" | "internal";

export interface RepoError {
  code: RepoErrorCode;
  /** Safe, user-showable message — never a raw driver error */
  message: string;
  /** Internal detail for logs only (never rendered to users) */
  detail?: string;
}

export type RepoResult<T> = { ok: true; data: T } | { ok: false; error: RepoError };

export const repoOk = <T>(data: T): RepoResult<T> => ({ ok: true, data });
export const repoErr = <T>(code: RepoErrorCode, message: string, detail?: string): RepoResult<T> =>
  ({ ok: false, error: { code, message, detail } });

/* ── shared context & pagination ── */

/** Organization context — null means "global corpus scope only". */
export interface OrgContext {
  organizationId: string | null;
  actorProfileId: string | null;
  /** correlation id for observability (propagated to audit events) */
  correlationId: string;
}

export interface Page {
  limit: number;   // 1..100
  offset: number;  // >= 0
}
export const DEFAULT_PAGE: Page = { limit: 20, offset: 0 };

/* ── domain rows (storage-neutral) ── */

export interface LegalSourceRow {
  id: string;
  registryCode: string;
  nameEn: string;
  nameHe: string | null;
  url: string | null;
  category: string;
  trustTier: number;
  priority: string;
  ragPermission: string;
  accessPolicy: string;
  isActive: boolean;
}

export interface LegalDocumentRow {
  id: string;
  organizationId: string | null;
  sourceId: string;
  documentType: DocumentType;
  authorityType: AuthorityType;
  verificationStatus: VerificationStatus;
  title: string;
  titleHe: string | null;
  caseNumberRaw: string | null;
  caseNumberNormalized: string | null;
  procedureCode: string | null;
  court: string | null;
  legalDomains: string[];
  documentDate: string | null;
  versionDate: string | null;
  effectiveDate: string | null;
  language: string;
  canonicalSourceUrl: string | null;
  licenseStatus: string;
  storagePolicy: StoragePolicy;
  latestVersion: number;
}

export interface DocumentVersionRow {
  id: string;
  documentId: string;
  version: number;
  contentHash: string;
  parserVersion: string;
}

export interface DocumentFileRow {
  id: string;
  documentId: string;
  versionId: string;
  storageBucket: string;
  storagePath: string;
  contentType: string;
  byteSize: number;
  sha256: string;
}

export interface DocumentTextRow {
  versionId: string;
  extractedText: string | null;
  normalizedText: string | null;
  extractionMethod: string;
  extractionConfidence: number | null;
  ocrStatus: string;
  language: string;
  warnings: string[];
}

export interface SectionRow {
  id: string;
  versionId: string;
  sectionIndex: number;
  kind: "page" | "paragraph" | "heading" | "section";
  anchorKey: string;
  headingPath: string | null;
  pageNumber: number | null;
  charStart: number;
  charEnd: number;
  content: string;
}

export interface EntityRow {
  id: string;
  entityType: string;
  name: string;
  nameHe: string | null;
}

export interface CitationRow {
  id: string;
  citingDocumentId: string;
  citedDocumentId: string | null;
  citedCaseNumberNormalized: string | null;
  citedStatuteRef: string | null;
  citationKind: "case" | "statute" | "regulation" | "other";
  treatment: string;
  anchorKey: string | null;
  confidence: number;
  provenance: string;
  verified: boolean;
  label: "verified_primary" | "inference" | "unverified";
}

export interface ResearchSessionRow {
  id: string;
  organizationId: string;
  createdBy: string;
  matterRef: string | null;
  title: string;
  status: "open" | "archived";
}

export interface ResearchQueryRow {
  id: string;
  sessionId: string;
  queryText: string;
  normalizedQuery: string;
  expansion: string[];
  filters: Record<string, unknown>;
  engineVersion: string;
}

export interface ResearchResultRow {
  queryId: string;
  documentId: string;
  versionId: string | null;
  rank: number;
  score: number;
  scoreBreakdown: Record<string, number | Record<string, number>>;
  passageAnchor: string | null;
  passageText: string | null;
  authorityType: AuthorityType;
  warnings: string[];
}

export interface AnswerClaimRow {
  id: string;
  queryId: string;
  claimIndex: number;
  claimText: string;
  claimLabel: string;
}

export interface ClaimCitationRow {
  claimId: string;
  documentId: string;
  versionId: string | null;
  anchorKey: string;
  quotedText: string | null;
  quoteVerified: boolean;
  citationFormat: string | null;
}

export interface BenchmarkTaskRow {
  id: string;
  taskCode: string;
  category: string;
  difficulty: string;
  domain: string;
  status: string;
}

export interface BenchmarkRunRow {
  id: string;
  runLabel: string;
  engineVersion: string;
  modelProvider: string;
  modelVersion: string;
  parserVersion: string;
}

export interface AuditEventInput {
  organizationId: string | null;
  actor: string | null;
  actorRole: string | null;
  eventType: string;
  objectType: string | null;
  objectId: string | null;
  /** MUST NOT contain secrets or document bodies (enforced by the impl) */
  payload: Record<string, unknown>;
}

export interface AuditEventRow extends AuditEventInput {
  id: string;
  occurredAt: string;
}

/** Section search hit (DB-backed lexical retrieval). */
export interface SectionSearchHit {
  section: SectionRow;
  document: LegalDocumentRow;
  lexicalScore: number;   // ts_rank + trigram similarity, normalized later
}

export interface SectionSearchFilters {
  documentTypes?: DocumentType[];
  legalDomain?: string;
  dateFrom?: string;
  dateTo?: string;
  courtContains?: string[];
}

/* ── repository interfaces (no unrestricted generic CRUD) ── */

export interface LegalSourcesRepository {
  listSources(page?: Page): Promise<RepoResult<LegalSourceRow[]>>;
  getSourceById(id: string): Promise<RepoResult<LegalSourceRow>>;
  getSourceByRegistryCode(code: string): Promise<RepoResult<LegalSourceRow>>;
  /** Ingestion-service only (service credentials). Idempotent by registryCode. */
  upsertSourceAsIngestionService(row: Omit<LegalSourceRow, "id">, ctx: OrgContext): Promise<RepoResult<LegalSourceRow>>;
  updateSourceVerification(id: string, ragPermission: string, ctx: OrgContext): Promise<RepoResult<void>>;
  listSourcesByPriority(priority: string, page?: Page): Promise<RepoResult<LegalSourceRow[]>>;
}

export interface LegalDocumentsRepository {
  /** Ingestion path: create/refresh a canonical document. Idempotent by
   * (canonicalSourceUrl) for global docs when a stable id is provided. */
  createCanonicalDocument(row: LegalDocumentRow, ctx: OrgContext): Promise<RepoResult<LegalDocumentRow>>;
  createDocumentVersion(row: DocumentVersionRow, ctx: OrgContext): Promise<RepoResult<DocumentVersionRow>>;
  attachDocumentFile(row: DocumentFileRow, ctx: OrgContext): Promise<RepoResult<void>>;
  saveExtractedText(row: DocumentTextRow, ctx: OrgContext): Promise<RepoResult<void>>;
  saveSections(versionId: string, sections: SectionRow[], ctx: OrgContext): Promise<RepoResult<number>>;
  saveEmbeddings(versionId: string, embeddings: Array<{ chunkIndex: number; anchorKey: string; model: string; modelVersion: string; dims: number; values: number[]; norm: number }>, ctx: OrgContext): Promise<RepoResult<number>>;
  getDocument(id: string, ctx: OrgContext): Promise<RepoResult<LegalDocumentRow>>;
  getDocumentVersion(versionId: string, ctx: OrgContext): Promise<RepoResult<DocumentVersionRow>>;
  getSections(versionId: string, ctx: OrgContext): Promise<RepoResult<SectionRow[]>>;
  listDocuments(ctx: OrgContext, filters?: SectionSearchFilters, page?: Page): Promise<RepoResult<LegalDocumentRow[]>>;
  findByCanonicalUrl(url: string): Promise<RepoResult<LegalDocumentRow | null>>;
  findByHash(contentHash: string): Promise<RepoResult<DocumentVersionRow | null>>;
  /** Verification pipeline only. */
  markVerificationStatus(documentId: string, status: VerificationStatus, ctx: OrgContext): Promise<RepoResult<void>>;
  /** DB-backed lexical retrieval over stored sections. */
  searchSections(queryTerms: string[], filters: SectionSearchFilters, limit: number, ctx: OrgContext): Promise<RepoResult<SectionSearchHit[]>>;
}

export interface LegalEntitiesRepository {
  upsertEntity(row: Omit<EntityRow, "id">, ctx: OrgContext): Promise<RepoResult<EntityRow>>;
  linkEntityToDocument(documentId: string, entityId: string, role: string, provenance: string, ctx: OrgContext): Promise<RepoResult<void>>;
}

export interface LegalCitationsRepository {
  createCitation(row: Omit<CitationRow, "id">, ctx: OrgContext): Promise<RepoResult<CitationRow>>;
  listCitationsFromDocument(documentId: string, page?: Page): Promise<RepoResult<CitationRow[]>>;
  listCitationsToDocument(documentId: string, page?: Page): Promise<RepoResult<CitationRow[]>>;
  /** Resolve an unresolved citation to an ingested target document. */
  resolveCitationTarget(citationId: string, citedDocumentId: string, ctx: OrgContext): Promise<RepoResult<void>>;
}

export interface LegalResearchRepository {
  createResearchSession(row: Omit<ResearchSessionRow, "id" | "status">, ctx: OrgContext): Promise<RepoResult<ResearchSessionRow>>;
  addResearchQuery(row: Omit<ResearchQueryRow, "id">, ctx: OrgContext): Promise<RepoResult<ResearchQueryRow>>;
  saveResearchResults(rows: ResearchResultRow[], ctx: OrgContext): Promise<RepoResult<number>>;
  saveAnswerClaims(rows: Omit<AnswerClaimRow, "id">[], ctx: OrgContext): Promise<RepoResult<AnswerClaimRow[]>>;
  attachClaimCitations(rows: ClaimCitationRow[], ctx: OrgContext): Promise<RepoResult<number>>;
  getResearchSession(id: string, ctx: OrgContext): Promise<RepoResult<{ session: ResearchSessionRow; queries: ResearchQueryRow[] }>>;
}

export interface BenchmarkRepository {
  listBenchmarkTasks(domain?: string, page?: Page): Promise<RepoResult<BenchmarkTaskRow[]>>;
  createBenchmarkRun(row: Omit<BenchmarkRunRow, "id">, ctx: OrgContext): Promise<RepoResult<BenchmarkRunRow>>;
  saveBenchmarkResult(runId: string, taskId: string, result: { score: number | null; passed: boolean | null; metrics: Record<string, unknown> }, ctx: OrgContext): Promise<RepoResult<void>>;
  getBenchmarkSummary(runId: string): Promise<RepoResult<{ total: number; passed: number; failed: number }>>;
}

export interface AuditRepository {
  appendAuditEvent(event: AuditEventInput, ctx: OrgContext): Promise<RepoResult<void>>;
  /** Authorized admin use only (RLS enforces org scope on real DB). */
  listAuditEvents(organizationId: string, page?: Page): Promise<RepoResult<AuditEventRow[]>>;
}

export interface Repositories {
  kind: "in-memory" | "supabase";
  sources: LegalSourcesRepository;
  documents: LegalDocumentsRepository;
  entities: LegalEntitiesRepository;
  citations: LegalCitationsRepository;
  research: LegalResearchRepository;
  benchmark: BenchmarkRepository;
  audit: AuditRepository;
}

/* ── guards shared by implementations ── */

const SECRET_PATTERN = /(sk-[A-Za-z0-9]{16,}|SERVICE_ROLE|Bearer\s+[A-Za-z0-9._-]{20,}|eyJ[A-Za-z0-9._-]{40,})/;

/** Audit payloads must never contain secrets or full document bodies. */
export function sanitizeAuditPayload(payload: Record<string, unknown>): RepoResult<Record<string, unknown>> {
  const s = JSON.stringify(payload);
  if (SECRET_PATTERN.test(s)) {
    return repoErr("validation", "אירוע ביקורת נדחה", "audit payload matched secret pattern");
  }
  if (s.length > 8_000) {
    return repoErr("validation", "אירוע ביקורת נדחה", "audit payload too large (document bodies are not allowed in audit logs)");
  }
  return repoOk(payload);
}

export function clampPage(page?: Page): Page {
  const limit = Math.min(100, Math.max(1, page?.limit ?? DEFAULT_PAGE.limit));
  const offset = Math.max(0, page?.offset ?? 0);
  return { limit, offset };
}

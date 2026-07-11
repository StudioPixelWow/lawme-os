/**
 * Supabase repository implementation — Development integration (Epic 2).
 * SERVER-SIDE ONLY. The client passed in decides the privilege level:
 *  - service client (SUPABASE_SECRET key, env-only) → ingestion/seed path
 *  - user client (anon key + user JWT)              → tenant-scoped reads,
 *    where RLS is the actual enforcement layer.
 * Raw driver errors never leave this module — they are mapped to RepoError
 * with the detail kept for server logs only (no schema leakage to users).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../../types/database.types.ts";
import {
  clampPage, repoErr, repoOk, sanitizeAuditPayload,
} from "./types.ts";
import type {
  AnswerClaimRow, AuditEventInput, AuditEventRow, AuditRepository,
  BenchmarkRepository, BenchmarkRunRow, BenchmarkTaskRow, CitationRow,
  ClaimCitationRow, DocumentFileRow, DocumentTextRow, DocumentVersionRow,
  EntityRow, LegalCitationsRepository, LegalDocumentRow,
  LegalDocumentsRepository, LegalEntitiesRepository, LegalResearchRepository,
  LegalSourceRow, LegalSourcesRepository, OrgContext, Page, RepoResult,
  Repositories, ResearchQueryRow, ResearchResultRow, ResearchSessionRow,
  SectionRow, SectionSearchFilters, SectionSearchHit,
} from "./types.ts";

type Client = SupabaseClient<Database>;

/** Map any driver error to a safe RepoError (detail stays server-side). */
function mapError<T>(op: string, error: { code?: string; message?: string }): RepoResult<T> {
  const code = error.code ?? "";
  if (code === "PGRST116") return repoErr("not_found", "הרשומה לא נמצאה", `${op}: ${error.message}`);
  if (code === "23505") return repoErr("conflict", "רשומה כפולה", `${op}: ${error.message}`);
  if (code === "42501" || code === "PGRST301") return repoErr("forbidden", "אין הרשאה לפעולה זו", `${op}: ${error.message}`);
  if (code.startsWith("23")) return repoErr("validation", "הנתונים אינם תקינים", `${op}: ${error.message}`);
  return repoErr("internal", "שגיאה פנימית — נסה שוב", `${op}: ${code} ${error.message}`);
}

const docFromDb = (d: Database["public"]["Tables"]["legal_documents"]["Row"]): LegalDocumentRow => ({
  id: d.id,
  organizationId: d.organization_id,
  sourceId: d.source_id,
  documentType: d.document_type as LegalDocumentRow["documentType"],
  authorityType: d.authority_type as LegalDocumentRow["authorityType"],
  verificationStatus: d.verification_status as LegalDocumentRow["verificationStatus"],
  title: d.title,
  titleHe: d.title_he,
  caseNumberRaw: d.case_number_raw,
  caseNumberNormalized: d.case_number_normalized,
  procedureCode: d.procedure_code,
  court: d.court,
  legalDomains: Array.isArray(d.legal_domains) ? (d.legal_domains as string[]) : [],
  documentDate: d.document_date,
  versionDate: d.version_date,
  effectiveDate: d.effective_date,
  language: d.language,
  canonicalSourceUrl: d.canonical_source_url,
  licenseStatus: d.license_status,
  storagePolicy: d.storage_policy as LegalDocumentRow["storagePolicy"],
  latestVersion: d.latest_version,
});

const sourceFromDb = (r: Database["public"]["Tables"]["legal_sources"]["Row"]): LegalSourceRow => ({
  id: r.id, registryCode: r.registry_code, nameEn: r.name_en, nameHe: r.name_he,
  url: r.url, category: r.category, trustTier: r.trust_tier, priority: r.priority,
  ragPermission: r.rag_permission, accessPolicy: r.access_policy, isActive: r.is_active,
});

const sectionFromDb = (r: Database["public"]["Tables"]["legal_document_sections"]["Row"]): SectionRow => ({
  id: r.id, versionId: r.version_id, sectionIndex: r.section_index,
  kind: r.kind as SectionRow["kind"], anchorKey: r.anchor_key,
  headingPath: r.heading_path, pageNumber: r.page_number,
  charStart: r.char_start, charEnd: r.char_end, content: r.content,
});

class Sources implements LegalSourcesRepository {
    private db: Client;
  private audit: Audit;
  constructor(db: Client, audit: Audit) {
    this.db = db;
    this.audit = audit;
  }

  async listSources(page?: Page) {
    const p = clampPage(page);
    const { data, error } = await this.db.from("legal_sources").select("*")
      .order("registry_code").range(p.offset, p.offset + p.limit - 1);
    if (error) return mapError<LegalSourceRow[]>("listSources", error);
    return repoOk((data ?? []).map(sourceFromDb));
  }
  async getSourceById(id: string) {
    const { data, error } = await this.db.from("legal_sources").select("*").eq("id", id).single();
    if (error) return mapError<LegalSourceRow>("getSourceById", error);
    return repoOk(sourceFromDb(data));
  }
  async getSourceByRegistryCode(code: string) {
    const { data, error } = await this.db.from("legal_sources").select("*").eq("registry_code", code).single();
    if (error) return mapError<LegalSourceRow>("getSourceByRegistryCode", error);
    return repoOk(sourceFromDb(data));
  }
  async upsertSourceAsIngestionService(row: Omit<LegalSourceRow, "id">, ctx: OrgContext) {
    const { data, error } = await this.db.from("legal_sources").upsert({
      registry_code: row.registryCode, name_en: row.nameEn, name_he: row.nameHe,
      url: row.url, category: row.category, trust_tier: row.trustTier,
      priority: row.priority, rag_permission: row.ragPermission,
      access_policy: row.accessPolicy, is_active: row.isActive,
    }, { onConflict: "registry_code" }).select().single();
    if (error) return mapError<LegalSourceRow>("upsertSource", error);
    await this.audit.appendAuditEvent({
      organizationId: null, actor: null, actorRole: "service",
      eventType: "legal_source.upserted", objectType: "legal_source", objectId: data.id,
      payload: { registryCode: row.registryCode },
    }, ctx);
    return repoOk(sourceFromDb(data));
  }
  async updateSourceVerification(id: string, ragPermission: string, ctx: OrgContext) {
    const { error } = await this.db.from("legal_sources").update({ rag_permission: ragPermission }).eq("id", id);
    if (error) return mapError<void>("updateSourceVerification", error);
    await this.audit.appendAuditEvent({
      organizationId: null, actor: ctx.actorProfileId, actorRole: "service",
      eventType: "legal_source.verification_updated", objectType: "legal_source", objectId: id,
      payload: { ragPermission },
    }, ctx);
    return repoOk(undefined);
  }
  async listSourcesByPriority(priority: string, page?: Page) {
    const p = clampPage(page);
    const { data, error } = await this.db.from("legal_sources").select("*")
      .eq("priority", priority).order("registry_code").range(p.offset, p.offset + p.limit - 1);
    if (error) return mapError<LegalSourceRow[]>("listSourcesByPriority", error);
    return repoOk((data ?? []).map(sourceFromDb));
  }
}

class Documents implements LegalDocumentsRepository {
    private db: Client;
  private audit: Audit;
  constructor(db: Client, audit: Audit) {
    this.db = db;
    this.audit = audit;
  }

  async createCanonicalDocument(row: LegalDocumentRow, ctx: OrgContext) {
    const { data, error } = await this.db.from("legal_documents").upsert({
      id: row.id,
      organization_id: row.organizationId,
      source_id: row.sourceId,
      document_type: row.documentType,
      authority_type: row.authorityType,
      verification_status: row.verificationStatus,
      title: row.title, title_he: row.titleHe,
      case_number_raw: row.caseNumberRaw,
      case_number_normalized: row.caseNumberNormalized,
      procedure_code: row.procedureCode,
      court: row.court,
      legal_domains: row.legalDomains as unknown as Json,
      document_date: row.documentDate,
      version_date: row.versionDate,
      effective_date: row.effectiveDate,
      language: row.language,
      canonical_source_url: row.canonicalSourceUrl,
      license_status: row.licenseStatus,
      storage_policy: row.storagePolicy,
      latest_version: row.latestVersion,
    }, { onConflict: "id" }).select().single();
    if (error) return mapError<LegalDocumentRow>("createCanonicalDocument", error);
    await this.audit.appendAuditEvent({
      organizationId: row.organizationId, actor: ctx.actorProfileId, actorRole: "service",
      eventType: "legal_document.created", objectType: "legal_document", objectId: row.id,
      payload: { documentType: row.documentType, synthetic: row.licenseStatus === "synthetic_fixture" },
    }, ctx);
    return repoOk(docFromDb(data));
  }
  async createDocumentVersion(row: DocumentVersionRow) {
    const { data, error } = await this.db.from("legal_document_versions").upsert({
      id: row.id, document_id: row.documentId, version: row.version,
      content_hash: row.contentHash, parser_version: row.parserVersion,
    }, { onConflict: "id" }).select().single();
    if (error) return mapError<DocumentVersionRow>("createDocumentVersion", error);
    return repoOk({
      id: data.id, documentId: data.document_id, version: data.version,
      contentHash: data.content_hash, parserVersion: data.parser_version,
    });
  }
  async attachDocumentFile(row: DocumentFileRow) {
    const { error } = await this.db.from("legal_document_files").upsert({
      id: row.id, document_id: row.documentId, version_id: row.versionId,
      storage_bucket: row.storageBucket, storage_path: row.storagePath,
      content_type: row.contentType, byte_size: row.byteSize, sha256: row.sha256,
    }, { onConflict: "id" });
    if (error) return mapError<void>("attachDocumentFile", error);
    return repoOk(undefined);
  }
  async saveExtractedText(row: DocumentTextRow) {
    const { error } = await this.db.from("legal_document_text").upsert({
      version_id: row.versionId,
      extracted_text: row.extractedText,
      normalized_text: row.normalizedText,
      extraction_method: row.extractionMethod,
      extraction_confidence: row.extractionConfidence,
      ocr_status: row.ocrStatus,
      language: row.language,
      warnings: row.warnings as unknown as Json,
    }, { onConflict: "version_id" });
    if (error) return mapError<void>("saveExtractedText", error);
    return repoOk(undefined);
  }
  async saveSections(versionId: string, sections: SectionRow[]) {
    const { error } = await this.db.from("legal_document_sections").upsert(
      sections.map((s) => ({
        id: s.id, version_id: versionId, section_index: s.sectionIndex,
        kind: s.kind, anchor_key: s.anchorKey, heading_path: s.headingPath,
        page_number: s.pageNumber, char_start: s.charStart, char_end: s.charEnd,
        content: s.content,
      })),
      { onConflict: "id" },
    );
    if (error) return mapError<number>("saveSections", error);
    return repoOk(sections.length);
  }
  async saveEmbeddings(versionId: string, embeddings: Array<{ chunkIndex: number; anchorKey: string; model: string; modelVersion: string; dims: number; values: number[]; norm: number }>) {
    const { error } = await this.db.from("legal_embeddings").upsert(
      embeddings.map((e) => ({
        version_id: versionId, chunk_index: e.chunkIndex, anchor_key: e.anchorKey,
        model: e.model, model_version: e.modelVersion, dims: e.dims,
        embedding: `[${e.values.join(",")}]`, embedding_norm: e.norm,
      })),
      { onConflict: "version_id,model,model_version,chunk_index" },
    );
    if (error) return mapError<number>("saveEmbeddings", error);
    return repoOk(embeddings.length);
  }
  async getDocument(id: string) {
    const { data, error } = await this.db.from("legal_documents").select("*")
      .eq("id", id).is("deleted_at", null).single();
    if (error) return mapError<LegalDocumentRow>("getDocument", error);
    return repoOk(docFromDb(data));
  }
  async getDocumentVersion(versionId: string) {
    const { data, error } = await this.db.from("legal_document_versions").select("*").eq("id", versionId).single();
    if (error) return mapError<DocumentVersionRow>("getDocumentVersion", error);
    return repoOk({
      id: data.id, documentId: data.document_id, version: data.version,
      contentHash: data.content_hash, parserVersion: data.parser_version,
    });
  }
  async getSections(versionId: string) {
    const { data, error } = await this.db.from("legal_document_sections").select("*")
      .eq("version_id", versionId).order("section_index");
    if (error) return mapError<SectionRow[]>("getSections", error);
    return repoOk((data ?? []).map(sectionFromDb));
  }
  async listDocuments(_ctx: OrgContext, filters?: SectionSearchFilters, page?: Page) {
    const p = clampPage(page);
    let q = this.db.from("legal_documents").select("*").is("deleted_at", null);
    if (filters?.documentTypes) q = q.in("document_type", filters.documentTypes);
    if (filters?.legalDomain) q = q.contains("legal_domains", JSON.stringify([filters.legalDomain]));
    const { data, error } = await q.order("id").range(p.offset, p.offset + p.limit - 1);
    if (error) return mapError<LegalDocumentRow[]>("listDocuments", error);
    return repoOk((data ?? []).map(docFromDb));
  }
  async findByCanonicalUrl(url: string) {
    const { data, error } = await this.db.from("legal_documents").select("*")
      .eq("canonical_source_url", url).is("deleted_at", null).maybeSingle();
    if (error) return mapError<LegalDocumentRow | null>("findByCanonicalUrl", error);
    return repoOk(data ? docFromDb(data) : null);
  }
  async findByHash(contentHash: string) {
    const { data, error } = await this.db.from("legal_document_versions").select("*")
      .eq("content_hash", contentHash).limit(1).maybeSingle();
    if (error) return mapError<DocumentVersionRow | null>("findByHash", error);
    return repoOk(data ? {
      id: data.id, documentId: data.document_id, version: data.version,
      contentHash: data.content_hash, parserVersion: data.parser_version,
    } : null);
  }
  async markVerificationStatus(documentId: string, status: LegalDocumentRow["verificationStatus"], ctx: OrgContext) {
    const { error } = await this.db.from("legal_documents")
      .update({ verification_status: status, verification_date: new Date().toISOString() })
      .eq("id", documentId);
    if (error) return mapError<void>("markVerificationStatus", error);
    await this.audit.appendAuditEvent({
      organizationId: ctx.organizationId, actor: ctx.actorProfileId, actorRole: "service",
      eventType: "legal_document.verification_changed", objectType: "legal_document", objectId: documentId,
      payload: { status },
    }, ctx);
    return repoOk(undefined);
  }
  /**
   * DB-backed lexical retrieval: one query (no N+1) joining sections →
   * versions → documents, ranked by term hits in section content.
   * Postgres-side filtering; scoring parity with the in-memory impl is
   * handled by the shared hybrid ranker on top.
   */
  async searchSections(queryTerms: string[], filters: SectionSearchFilters, limit: number, ctx: OrgContext) {
    void ctx; // tenancy enforced by RLS on the DB side
    // websearch-style OR query over the normalized terms
    const orTerms = queryTerms
      .flatMap((t) => t.split(/\s+/))
      .filter((t) => t.length >= 2)
      .slice(0, 24);
    if (orTerms.length === 0) return repoOk([]);

    // PostgREST: fetch candidate sections whose content matches any term,
    // embedding document join in the same request (single round-trip).
    const q = this.db
      .from("legal_document_sections")
      .select("*, legal_document_versions!inner(id, document_id, version, content_hash, parser_version, legal_documents!inner(*))")
      .or(orTerms.map((t) => `content.ilike.%${t.replace(/[%_,()]/g, "")}%`).join(","))
      .limit(Math.min(200, limit * 10));
    const { data, error } = await q;
    if (error) return mapError<SectionSearchHit[]>("searchSections", error);

    const hits: SectionSearchHit[] = [];
    for (const row of data ?? []) {
      const version = row.legal_document_versions as unknown as {
        document_id: string;
        legal_documents: Database["public"]["Tables"]["legal_documents"]["Row"];
      };
      const doc = docFromDb(version.legal_documents);
      if (filters.documentTypes && !filters.documentTypes.includes(doc.documentType)) continue;
      if (filters.legalDomain && !doc.legalDomains.includes(filters.legalDomain)) continue;
      if (filters.dateFrom && doc.documentDate && doc.documentDate < filters.dateFrom) continue;
      if (filters.dateTo && doc.documentDate && doc.documentDate > filters.dateTo) continue;
      const content = row.content as string;
      const matched = orTerms.filter((t) => content.includes(t));
      if (matched.length === 0) continue;
      hits.push({
        section: sectionFromDb(row as unknown as Database["public"]["Tables"]["legal_document_sections"]["Row"]),
        document: doc,
        lexicalScore: matched.length / Math.sqrt(content.length / 40 + 1),
      });
    }
    hits.sort((a, b) => b.lexicalScore - a.lexicalScore || a.section.id.localeCompare(b.section.id));
    return repoOk(hits.slice(0, limit));
  }
}

class Entities implements LegalEntitiesRepository {
    private db: Client;
  constructor(db: Client) {
    this.db = db;
  }
  async upsertEntity(row: Omit<EntityRow, "id">) {
    const { data, error } = await this.db.from("legal_entities").upsert({
      entity_type: row.entityType, name: row.name, name_he: row.nameHe,
    }, { onConflict: "entity_type,name" }).select().single();
    if (error) return mapError<EntityRow>("upsertEntity", error);
    return repoOk({ id: data.id, entityType: data.entity_type, name: data.name, nameHe: data.name_he });
  }
  async linkEntityToDocument(documentId: string, entityId: string, role: string, provenance: string) {
    const { error } = await this.db.from("legal_document_entities").upsert({
      document_id: documentId, entity_id: entityId, role, provenance,
    }, { onConflict: "document_id,entity_id,role" });
    if (error) return mapError<void>("linkEntityToDocument", error);
    return repoOk(undefined);
  }
}

class Citations implements LegalCitationsRepository {
    private db: Client;
  constructor(db: Client) {
    this.db = db;
  }
  async createCitation(row: Omit<CitationRow, "id">) {
    const { data, error } = await this.db.from("legal_citations").insert({
      citing_document_id: row.citingDocumentId,
      cited_document_id: row.citedDocumentId,
      cited_case_number_normalized: row.citedCaseNumberNormalized,
      cited_statute_ref: row.citedStatuteRef,
      citation_kind: row.citationKind,
      treatment: row.treatment,
      anchor_key: row.anchorKey,
      confidence: row.confidence,
      provenance: row.provenance,
      verified: row.verified,
      label: row.label,
    }).select().single();
    if (error) return mapError<CitationRow>("createCitation", error);
    return repoOk({
      id: data.id, citingDocumentId: data.citing_document_id,
      citedDocumentId: data.cited_document_id,
      citedCaseNumberNormalized: data.cited_case_number_normalized,
      citedStatuteRef: data.cited_statute_ref,
      citationKind: data.citation_kind as CitationRow["citationKind"],
      treatment: data.treatment, anchorKey: data.anchor_key,
      confidence: data.confidence, provenance: data.provenance,
      verified: data.verified, label: data.label as CitationRow["label"],
    });
  }
  async listCitationsFromDocument(documentId: string, page?: Page) {
    const p = clampPage(page);
    const { data, error } = await this.db.from("legal_citations").select("*")
      .eq("citing_document_id", documentId).order("id").range(p.offset, p.offset + p.limit - 1);
    if (error) return mapError<CitationRow[]>("listCitationsFrom", error);
    return repoOk((data ?? []).map((d) => ({
      id: d.id, citingDocumentId: d.citing_document_id, citedDocumentId: d.cited_document_id,
      citedCaseNumberNormalized: d.cited_case_number_normalized, citedStatuteRef: d.cited_statute_ref,
      citationKind: d.citation_kind as CitationRow["citationKind"], treatment: d.treatment,
      anchorKey: d.anchor_key, confidence: d.confidence, provenance: d.provenance,
      verified: d.verified, label: d.label as CitationRow["label"],
    })));
  }
  async listCitationsToDocument(documentId: string, page?: Page) {
    const p = clampPage(page);
    const { data, error } = await this.db.from("legal_citations").select("*")
      .eq("cited_document_id", documentId).order("id").range(p.offset, p.offset + p.limit - 1);
    if (error) return mapError<CitationRow[]>("listCitationsTo", error);
    return repoOk((data ?? []).map((d) => ({
      id: d.id, citingDocumentId: d.citing_document_id, citedDocumentId: d.cited_document_id,
      citedCaseNumberNormalized: d.cited_case_number_normalized, citedStatuteRef: d.cited_statute_ref,
      citationKind: d.citation_kind as CitationRow["citationKind"], treatment: d.treatment,
      anchorKey: d.anchor_key, confidence: d.confidence, provenance: d.provenance,
      verified: d.verified, label: d.label as CitationRow["label"],
    })));
  }
  async resolveCitationTarget(citationId: string, citedDocumentId: string) {
    const { error } = await this.db.from("legal_citations")
      .update({ cited_document_id: citedDocumentId }).eq("id", citationId);
    if (error) return mapError<void>("resolveCitationTarget", error);
    return repoOk(undefined);
  }
}

class Research implements LegalResearchRepository {
    private db: Client;
  private audit: Audit;
  constructor(db: Client, audit: Audit) {
    this.db = db;
    this.audit = audit;
  }

  async createResearchSession(row: Omit<ResearchSessionRow, "id" | "status">, ctx: OrgContext) {
    if (!ctx.organizationId || row.organizationId !== ctx.organizationId) {
      return repoErr<ResearchSessionRow>("forbidden", "נדרש הקשר ארגוני תואם");
    }
    const { data, error } = await this.db.from("legal_research_sessions").insert({
      organization_id: row.organizationId, created_by: row.createdBy,
      matter_ref: row.matterRef, title: row.title,
    }).select().single();
    if (error) return mapError<ResearchSessionRow>("createResearchSession", error);
    await this.audit.appendAuditEvent({
      organizationId: row.organizationId, actor: ctx.actorProfileId, actorRole: null,
      eventType: "research_session.created", objectType: "legal_research_session", objectId: data.id,
      payload: {},
    }, ctx);
    return repoOk({
      id: data.id, organizationId: data.organization_id, createdBy: data.created_by,
      matterRef: data.matter_ref, title: data.title, status: data.status as ResearchSessionRow["status"],
    });
  }
  async addResearchQuery(row: Omit<ResearchQueryRow, "id">) {
    const { data, error } = await this.db.from("legal_research_queries").insert({
      session_id: row.sessionId, query_text: row.queryText,
      normalized_query: row.normalizedQuery,
      expansion: row.expansion as unknown as Json,
      filters: row.filters as unknown as Json,
      engine_version: row.engineVersion,
    }).select().single();
    if (error) return mapError<ResearchQueryRow>("addResearchQuery", error);
    return repoOk({
      id: data.id, sessionId: data.session_id, queryText: data.query_text,
      normalizedQuery: data.normalized_query,
      expansion: (data.expansion as string[]) ?? [],
      filters: (data.filters as Record<string, unknown>) ?? {},
      engineVersion: data.engine_version,
    });
  }
  async saveResearchResults(rows: ResearchResultRow[]) {
    if (rows.length === 0) return repoOk(0);
    const { error } = await this.db.from("legal_research_results").insert(rows.map((r) => ({
      query_id: r.queryId, document_id: r.documentId, version_id: r.versionId,
      rank: r.rank, score: r.score,
      score_breakdown: r.scoreBreakdown as unknown as Json,
      passage_anchor: r.passageAnchor, passage_text: r.passageText,
      authority_type: r.authorityType,
      warnings: r.warnings as unknown as Json,
    })));
    if (error) return mapError<number>("saveResearchResults", error);
    return repoOk(rows.length);
  }
  async saveAnswerClaims(rows: Omit<AnswerClaimRow, "id">[]) {
    if (rows.length === 0) return repoOk([]);
    const { data, error } = await this.db.from("legal_answer_claims").insert(rows.map((r) => ({
      query_id: r.queryId, claim_index: r.claimIndex,
      claim_text: r.claimText, claim_label: r.claimLabel,
    }))).select();
    if (error) return mapError<AnswerClaimRow[]>("saveAnswerClaims", error);
    return repoOk((data ?? []).map((d) => ({
      id: d.id, queryId: d.query_id, claimIndex: d.claim_index,
      claimText: d.claim_text, claimLabel: d.claim_label,
    })));
  }
  async attachClaimCitations(rows: ClaimCitationRow[]) {
    if (rows.length === 0) return repoOk(0);
    const { error } = await this.db.from("legal_claim_citations").insert(rows.map((r) => ({
      claim_id: r.claimId, document_id: r.documentId, version_id: r.versionId,
      anchor_key: r.anchorKey, quoted_text: r.quotedText,
      quote_verified: r.quoteVerified, citation_format: r.citationFormat,
    })));
    if (error) return mapError<number>("attachClaimCitations", error);
    return repoOk(rows.length);
  }
  async getResearchSession(id: string) {
    const { data, error } = await this.db.from("legal_research_sessions")
      .select("*, legal_research_queries(*)").eq("id", id).is("deleted_at", null).single();
    if (error) return mapError<{ session: ResearchSessionRow; queries: ResearchQueryRow[] }>("getResearchSession", error);
    return repoOk({
      session: {
        id: data.id, organizationId: data.organization_id, createdBy: data.created_by,
        matterRef: data.matter_ref, title: data.title, status: data.status as ResearchSessionRow["status"],
      },
      queries: (data.legal_research_queries ?? []).map((q) => ({
        id: q.id, sessionId: q.session_id, queryText: q.query_text,
        normalizedQuery: q.normalized_query,
        expansion: (q.expansion as string[]) ?? [],
        filters: (q.filters as Record<string, unknown>) ?? {},
        engineVersion: q.engine_version,
      })),
    });
  }
}

class Benchmark implements BenchmarkRepository {
    private db: Client;
  constructor(db: Client) {
    this.db = db;
  }
  async listBenchmarkTasks(domain?: string, page?: Page) {
    const p = clampPage(page);
    let q = this.db.from("benchmark_tasks").select("*");
    if (domain) q = q.eq("domain", domain);
    const { data, error } = await q.order("task_code").range(p.offset, p.offset + p.limit - 1);
    if (error) return mapError<BenchmarkTaskRow[]>("listBenchmarkTasks", error);
    return repoOk((data ?? []).map((d) => ({
      id: d.id, taskCode: d.task_code, category: d.category,
      difficulty: d.difficulty, domain: d.domain, status: d.status,
    })));
  }
  async createBenchmarkRun(row: Omit<BenchmarkRunRow, "id">) {
    const { data, error } = await this.db.from("benchmark_runs").insert({
      run_label: row.runLabel, engine_version: row.engineVersion,
      model_provider: row.modelProvider, model_version: row.modelVersion,
      parser_version: row.parserVersion,
    }).select().single();
    if (error) return mapError<BenchmarkRunRow>("createBenchmarkRun", error);
    return repoOk({
      id: data.id, runLabel: data.run_label, engineVersion: data.engine_version,
      modelProvider: data.model_provider, modelVersion: data.model_version,
      parserVersion: data.parser_version,
    });
  }
  async saveBenchmarkResult(runId: string, taskId: string, result: { score: number | null; passed: boolean | null; metrics: Record<string, unknown> }) {
    const { error } = await this.db.from("benchmark_results").upsert({
      run_id: runId, task_id: taskId, score: result.score,
      passed: result.passed, metrics: result.metrics as unknown as Json,
    }, { onConflict: "run_id,task_id" });
    if (error) return mapError<void>("saveBenchmarkResult", error);
    return repoOk(undefined);
  }
  async getBenchmarkSummary(runId: string) {
    const { data, error } = await this.db.from("benchmark_results").select("passed").eq("run_id", runId);
    if (error) return mapError<{ total: number; passed: number; failed: number }>("getBenchmarkSummary", error);
    const rows = data ?? [];
    return repoOk({
      total: rows.length,
      passed: rows.filter((r) => r.passed === true).length,
      failed: rows.filter((r) => r.passed === false).length,
    });
  }
}

class Audit implements AuditRepository {
    private db: Client;
  constructor(db: Client) {
    this.db = db;
  }
  async appendAuditEvent(event: AuditEventInput, ctx: OrgContext) {
    const sanitized = sanitizeAuditPayload({ ...event.payload, correlationId: ctx.correlationId });
    if (!sanitized.ok) return repoErr<void>(sanitized.error.code, sanitized.error.message, sanitized.error.detail);
    const { error } = await this.db.from("audit_events").insert({
      organization_id: event.organizationId, actor: event.actor,
      actor_role: event.actorRole, event_type: event.eventType,
      object_type: event.objectType, object_id: event.objectId,
      payload: sanitized.data as unknown as Json,
    });
    if (error) return mapError<void>("appendAuditEvent", error);
    return repoOk(undefined);
  }
  async listAuditEvents(organizationId: string, page?: Page) {
    const p = clampPage(page);
    const { data, error } = await this.db.from("audit_events").select("*")
      .eq("organization_id", organizationId)
      .order("occurred_at", { ascending: false })
      .range(p.offset, p.offset + p.limit - 1);
    if (error) return mapError<AuditEventRow[]>("listAuditEvents", error);
    return repoOk((data ?? []).map((d) => ({
      id: d.id, occurredAt: d.occurred_at, organizationId: d.organization_id,
      actor: d.actor, actorRole: d.actor_role, eventType: d.event_type,
      objectType: d.object_type, objectId: d.object_id,
      payload: (d.payload as Record<string, unknown>) ?? {},
    })));
  }
}

export function createSupabaseRepositories(client: Client): Repositories {
  const audit = new Audit(client);
  return {
    kind: "supabase",
    sources: new Sources(client, audit),
    documents: new Documents(client, audit),
    entities: new Entities(client),
    citations: new Citations(client),
    research: new Research(client, audit),
    benchmark: new Benchmark(client),
    audit,
  };
}

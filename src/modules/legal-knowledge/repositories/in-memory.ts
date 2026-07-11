/**
 * In-memory repository implementation — deterministic, for unit tests and
 * as the no-database fallback of the dev interface. Enforces the SAME
 * organization-context rules the RLS policies enforce on the real DB, so
 * cross-tenant tests are meaningful.
 */
import { tokenize } from "../extraction/normalize-text.ts";
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

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${String(++seq).padStart(6, "0")}`;

/** Can this context read the document? (mirror of RLS) */
const canRead = (doc: LegalDocumentRow, ctx: OrgContext) =>
  doc.organizationId === null || doc.organizationId === ctx.organizationId;

export class InMemoryStore {
  sources = new Map<string, LegalSourceRow>();
  documents = new Map<string, LegalDocumentRow>();
  versions = new Map<string, DocumentVersionRow>();
  files = new Map<string, DocumentFileRow>();
  texts = new Map<string, DocumentTextRow>();          // by versionId
  sections = new Map<string, SectionRow[]>();          // by versionId
  embeddings = new Map<string, Array<{ chunkIndex: number; anchorKey: string; model: string; modelVersion: string; dims: number; values: number[]; norm: number }>>();
  entities = new Map<string, EntityRow>();
  entityLinks: Array<{ documentId: string; entityId: string; role: string; provenance: string }> = [];
  citations = new Map<string, CitationRow>();
  sessions = new Map<string, ResearchSessionRow>();
  queries = new Map<string, ResearchQueryRow>();
  results: ResearchResultRow[] = [];
  claims = new Map<string, AnswerClaimRow>();
  claimCitations: ClaimCitationRow[] = [];
  benchmarkTasks = new Map<string, BenchmarkTaskRow>();
  benchmarkRuns = new Map<string, BenchmarkRunRow>();
  benchmarkResults: Array<{ runId: string; taskId: string; score: number | null; passed: boolean | null }> = [];
  auditEvents: AuditEventRow[] = [];
}

class Sources implements LegalSourcesRepository {
    private s: InMemoryStore;
  private audit: Audit;
  constructor(s: InMemoryStore, audit: Audit) {
    this.s = s;
    this.audit = audit;
  }

  async listSources(page?: Page) {
    const p = clampPage(page);
    const rows = [...this.s.sources.values()]
      .sort((a, b) => a.registryCode.localeCompare(b.registryCode))
      .slice(p.offset, p.offset + p.limit);
    return repoOk(rows);
  }
  async getSourceById(id: string) {
    const row = this.s.sources.get(id);
    return row ? repoOk(row) : repoErr<LegalSourceRow>("not_found", "מקור לא נמצא");
  }
  async getSourceByRegistryCode(code: string) {
    const row = [...this.s.sources.values()].find((r) => r.registryCode === code);
    return row ? repoOk(row) : repoErr<LegalSourceRow>("not_found", "מקור לא נמצא");
  }
  async upsertSourceAsIngestionService(row: Omit<LegalSourceRow, "id">, ctx: OrgContext) {
    const existing = [...this.s.sources.values()].find((r) => r.registryCode === row.registryCode);
    const full: LegalSourceRow = { ...row, id: existing?.id ?? nextId("src") };
    this.s.sources.set(full.id, full);
    await this.audit.appendAuditEvent({
      organizationId: null, actor: null, actorRole: "service",
      eventType: "legal_source.upserted", objectType: "legal_source", objectId: full.id,
      payload: { registryCode: full.registryCode, correlationId: ctx.correlationId },
    }, ctx);
    return repoOk(full);
  }
  async updateSourceVerification(id: string, ragPermission: string, ctx: OrgContext) {
    const row = this.s.sources.get(id);
    if (!row) return repoErr<void>("not_found", "מקור לא נמצא");
    this.s.sources.set(id, { ...row, ragPermission });
    await this.audit.appendAuditEvent({
      organizationId: null, actor: ctx.actorProfileId, actorRole: "service",
      eventType: "legal_source.verification_updated", objectType: "legal_source", objectId: id,
      payload: { ragPermission, correlationId: ctx.correlationId },
    }, ctx);
    return repoOk(undefined);
  }
  async listSourcesByPriority(priority: string, page?: Page) {
    const p = clampPage(page);
    return repoOk(
      [...this.s.sources.values()]
        .filter((r) => r.priority === priority)
        .sort((a, b) => a.registryCode.localeCompare(b.registryCode))
        .slice(p.offset, p.offset + p.limit),
    );
  }
}

class Documents implements LegalDocumentsRepository {
    private s: InMemoryStore;
  private audit: Audit;
  constructor(s: InMemoryStore, audit: Audit) {
    this.s = s;
    this.audit = audit;
  }

  async createCanonicalDocument(row: LegalDocumentRow, ctx: OrgContext) {
    if (row.organizationId !== null && row.organizationId !== ctx.organizationId) {
      return repoErr<LegalDocumentRow>("forbidden", "אין הרשאה ליצור מסמך בארגון אחר");
    }
    if (row.canonicalSourceUrl && row.organizationId === null) {
      const dup = [...this.s.documents.values()].find(
        (d) => d.canonicalSourceUrl === row.canonicalSourceUrl && d.id !== row.id,
      );
      if (dup) return repoErr<LegalDocumentRow>("conflict", "מסמך עם כתובת קנונית זהה כבר קיים");
    }
    this.s.documents.set(row.id, row);
    await this.audit.appendAuditEvent({
      organizationId: row.organizationId, actor: ctx.actorProfileId, actorRole: "service",
      eventType: "legal_document.created", objectType: "legal_document", objectId: row.id,
      payload: { documentType: row.documentType, synthetic: row.licenseStatus === "synthetic_fixture", correlationId: ctx.correlationId },
    }, ctx);
    return repoOk(row);
  }
  async createDocumentVersion(row: DocumentVersionRow, ctx: OrgContext) {
    const doc = this.s.documents.get(row.documentId);
    if (!doc) return repoErr<DocumentVersionRow>("not_found", "מסמך לא נמצא");
    if (!canRead(doc, ctx) && ctx.organizationId !== null) return repoErr<DocumentVersionRow>("forbidden", "אין הרשאה");
    this.s.versions.set(row.id, row);
    return repoOk(row);
  }
  async attachDocumentFile(row: DocumentFileRow) {
    this.s.files.set(row.id, row);
    return repoOk(undefined);
  }
  async saveExtractedText(row: DocumentTextRow) {
    this.s.texts.set(row.versionId, row);
    return repoOk(undefined);
  }
  async saveSections(versionId: string, sections: SectionRow[]) {
    const keys = new Set(sections.map((x) => x.anchorKey));
    if (keys.size !== sections.length) return repoErr<number>("validation", "עוגנים כפולים");
    this.s.sections.set(versionId, [...sections].sort((a, b) => a.sectionIndex - b.sectionIndex));
    return repoOk(sections.length);
  }
  async saveEmbeddings(versionId: string, embeddings: Array<{ chunkIndex: number; anchorKey: string; model: string; modelVersion: string; dims: number; values: number[]; norm: number }>) {
    this.s.embeddings.set(versionId, embeddings);
    return repoOk(embeddings.length);
  }
  async getDocument(id: string, ctx: OrgContext) {
    const doc = this.s.documents.get(id);
    if (!doc || !canRead(doc, ctx)) return repoErr<LegalDocumentRow>("not_found", "מסמך לא נמצא");
    return repoOk(doc);
  }
  async getDocumentVersion(versionId: string, ctx: OrgContext) {
    const v = this.s.versions.get(versionId);
    if (!v) return repoErr<DocumentVersionRow>("not_found", "גרסה לא נמצאה");
    const doc = this.s.documents.get(v.documentId);
    if (!doc || !canRead(doc, ctx)) return repoErr<DocumentVersionRow>("not_found", "גרסה לא נמצאה");
    return repoOk(v);
  }
  async getSections(versionId: string, ctx: OrgContext) {
    const v = await this.getDocumentVersion(versionId, ctx);
    if (!v.ok) return repoErr<SectionRow[]>(v.error.code, v.error.message);
    return repoOk(this.s.sections.get(versionId) ?? []);
  }
  async listDocuments(ctx: OrgContext, filters?: SectionSearchFilters, page?: Page) {
    const p = clampPage(page);
    const rows = [...this.s.documents.values()]
      .filter((d) => canRead(d, ctx))
      .filter((d) => !filters?.documentTypes || filters.documentTypes.includes(d.documentType))
      .filter((d) => !filters?.legalDomain || d.legalDomains.includes(filters.legalDomain))
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(p.offset, p.offset + p.limit);
    return repoOk(rows);
  }
  async findByCanonicalUrl(url: string) {
    return repoOk([...this.s.documents.values()].find((d) => d.canonicalSourceUrl === url) ?? null);
  }
  async findByHash(contentHash: string) {
    return repoOk([...this.s.versions.values()].find((v) => v.contentHash === contentHash) ?? null);
  }
  async markVerificationStatus(documentId: string, status: LegalDocumentRow["verificationStatus"], ctx: OrgContext) {
    const doc = this.s.documents.get(documentId);
    if (!doc) return repoErr<void>("not_found", "מסמך לא נמצא");
    this.s.documents.set(documentId, { ...doc, verificationStatus: status });
    await this.audit.appendAuditEvent({
      organizationId: doc.organizationId, actor: ctx.actorProfileId, actorRole: "service",
      eventType: "legal_document.verification_changed", objectType: "legal_document", objectId: documentId,
      payload: { status, correlationId: ctx.correlationId },
    }, ctx);
    return repoOk(undefined);
  }
  async searchSections(queryTerms: string[], filters: SectionSearchFilters, limit: number, ctx: OrgContext) {
    const qTokens = [...new Set(queryTerms.flatMap((t) => tokenize(t)))];
    const hits: SectionSearchHit[] = [];
    for (const [versionId, sections] of this.s.sections) {
      const version = this.s.versions.get(versionId);
      const doc = version ? this.s.documents.get(version.documentId) : undefined;
      if (!version || !doc || !canRead(doc, ctx)) continue;
      if (filters.documentTypes && !filters.documentTypes.includes(doc.documentType)) continue;
      if (filters.legalDomain && !doc.legalDomains.includes(filters.legalDomain)) continue;
      if (filters.dateFrom && doc.documentDate && doc.documentDate < filters.dateFrom) continue;
      if (filters.dateTo && doc.documentDate && doc.documentDate > filters.dateTo) continue;
      for (const section of sections) {
        const sTokens = new Set(tokenize(section.content));
        const matched = qTokens.filter((t) => sTokens.has(t));
        if (matched.length === 0) continue;
        hits.push({ section, document: doc, lexicalScore: matched.length / Math.sqrt(sTokens.size) });
      }
    }
    hits.sort((a, b) => b.lexicalScore - a.lexicalScore || a.section.id.localeCompare(b.section.id));
    return repoOk(hits.slice(0, limit));
  }
}

class Entities implements LegalEntitiesRepository {
    private s: InMemoryStore;
  constructor(s: InMemoryStore) {
    this.s = s;
  }
  async upsertEntity(row: Omit<EntityRow, "id">) {
    const existing = [...this.s.entities.values()].find(
      (e) => e.entityType === row.entityType && e.name === row.name,
    );
    const full: EntityRow = { ...row, id: existing?.id ?? nextId("ent") };
    this.s.entities.set(full.id, full);
    return repoOk(full);
  }
  async linkEntityToDocument(documentId: string, entityId: string, role: string, provenance: string) {
    if (!this.s.entities.get(entityId)) return repoErr<void>("not_found", "ישות לא נמצאה");
    const dup = this.s.entityLinks.find((l) => l.documentId === documentId && l.entityId === entityId && l.role === role);
    if (!dup) this.s.entityLinks.push({ documentId, entityId, role, provenance });
    return repoOk(undefined);
  }
}

class Citations implements LegalCitationsRepository {
    private s: InMemoryStore;
  constructor(s: InMemoryStore) {
    this.s = s;
  }
  async createCitation(row: Omit<CitationRow, "id">) {
    if (!row.citedDocumentId && !row.citedCaseNumberNormalized && !row.citedStatuteRef) {
      return repoErr<CitationRow>("validation", "ציטוט חייב יעד");
    }
    const full: CitationRow = { ...row, id: nextId("cit") };
    this.s.citations.set(full.id, full);
    return repoOk(full);
  }
  async listCitationsFromDocument(documentId: string, page?: Page) {
    const p = clampPage(page);
    return repoOk([...this.s.citations.values()]
      .filter((c) => c.citingDocumentId === documentId)
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(p.offset, p.offset + p.limit));
  }
  async listCitationsToDocument(documentId: string, page?: Page) {
    const p = clampPage(page);
    return repoOk([...this.s.citations.values()]
      .filter((c) => c.citedDocumentId === documentId)
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(p.offset, p.offset + p.limit));
  }
  async resolveCitationTarget(citationId: string, citedDocumentId: string) {
    const c = this.s.citations.get(citationId);
    if (!c) return repoErr<void>("not_found", "ציטוט לא נמצא");
    this.s.citations.set(citationId, { ...c, citedDocumentId });
    return repoOk(undefined);
  }
}

class Research implements LegalResearchRepository {
    private s: InMemoryStore;
  private audit: Audit;
  constructor(s: InMemoryStore, audit: Audit) {
    this.s = s;
    this.audit = audit;
  }

  private assertOrg(ctx: OrgContext): RepoResult<string> {
    if (!ctx.organizationId) return repoErr("forbidden", "נדרש הקשר ארגוני");
    return repoOk(ctx.organizationId);
  }
  async createResearchSession(row: Omit<ResearchSessionRow, "id" | "status">, ctx: OrgContext) {
    const org = this.assertOrg(ctx);
    if (!org.ok) return repoErr<ResearchSessionRow>(org.error.code, org.error.message);
    if (row.organizationId !== org.data) return repoErr<ResearchSessionRow>("forbidden", "אי-התאמה בהקשר הארגוני");
    const full: ResearchSessionRow = { ...row, id: nextId("ses"), status: "open" };
    this.s.sessions.set(full.id, full);
    await this.audit.appendAuditEvent({
      organizationId: org.data, actor: ctx.actorProfileId, actorRole: null,
      eventType: "research_session.created", objectType: "legal_research_session", objectId: full.id,
      payload: { correlationId: ctx.correlationId },
    }, ctx);
    return repoOk(full);
  }
  async addResearchQuery(row: Omit<ResearchQueryRow, "id">, ctx: OrgContext) {
    const session = this.s.sessions.get(row.sessionId);
    if (!session || session.organizationId !== ctx.organizationId) {
      return repoErr<ResearchQueryRow>("not_found", "סשן מחקר לא נמצא");
    }
    const full: ResearchQueryRow = { ...row, id: nextId("qry") };
    this.s.queries.set(full.id, full);
    return repoOk(full);
  }
  async saveResearchResults(rows: ResearchResultRow[], ctx: OrgContext) {
    for (const r of rows) {
      const q = this.s.queries.get(r.queryId);
      const session = q ? this.s.sessions.get(q.sessionId) : undefined;
      if (!session || session.organizationId !== ctx.organizationId) {
        return repoErr<number>("forbidden", "אין הרשאה לשמור תוצאות");
      }
    }
    this.s.results.push(...rows);
    return repoOk(rows.length);
  }
  async saveAnswerClaims(rows: Omit<AnswerClaimRow, "id">[], ctx: OrgContext) {
    const out: AnswerClaimRow[] = [];
    for (const r of rows) {
      const q = this.s.queries.get(r.queryId);
      const session = q ? this.s.sessions.get(q.sessionId) : undefined;
      if (!session || session.organizationId !== ctx.organizationId) {
        return repoErr<AnswerClaimRow[]>("forbidden", "אין הרשאה לשמור טענות");
      }
      const full: AnswerClaimRow = { ...r, id: nextId("clm") };
      this.s.claims.set(full.id, full);
      out.push(full);
    }
    return repoOk(out);
  }
  async attachClaimCitations(rows: ClaimCitationRow[], ctx: OrgContext) {
    for (const r of rows) {
      const claim = this.s.claims.get(r.claimId);
      const q = claim ? this.s.queries.get(claim.queryId) : undefined;
      const session = q ? this.s.sessions.get(q.sessionId) : undefined;
      if (!session || session.organizationId !== ctx.organizationId) {
        return repoErr<number>("forbidden", "אין הרשאה");
      }
    }
    this.s.claimCitations.push(...rows);
    return repoOk(rows.length);
  }
  async getResearchSession(id: string, ctx: OrgContext) {
    const session = this.s.sessions.get(id);
    if (!session || session.organizationId !== ctx.organizationId) {
      return repoErr<{ session: ResearchSessionRow; queries: ResearchQueryRow[] }>("not_found", "סשן מחקר לא נמצא");
    }
    const queries = [...this.s.queries.values()]
      .filter((q) => q.sessionId === id)
      .sort((a, b) => a.id.localeCompare(b.id));
    return repoOk({ session, queries });
  }
}

class Benchmark implements BenchmarkRepository {
    private s: InMemoryStore;
  constructor(s: InMemoryStore) {
    this.s = s;
  }
  async listBenchmarkTasks(domain?: string, page?: Page) {
    const p = clampPage(page);
    return repoOk([...this.s.benchmarkTasks.values()]
      .filter((t) => !domain || t.domain === domain)
      .sort((a, b) => a.taskCode.localeCompare(b.taskCode))
      .slice(p.offset, p.offset + p.limit));
  }
  async createBenchmarkRun(row: Omit<BenchmarkRunRow, "id">) {
    const full: BenchmarkRunRow = { ...row, id: nextId("run") };
    this.s.benchmarkRuns.set(full.id, full);
    return repoOk(full);
  }
  async saveBenchmarkResult(runId: string, taskId: string, result: { score: number | null; passed: boolean | null; metrics: Record<string, unknown> }) {
    if (!this.s.benchmarkRuns.get(runId)) return repoErr<void>("not_found", "ריצה לא נמצאה");
    this.s.benchmarkResults.push({ runId, taskId, score: result.score, passed: result.passed });
    return repoOk(undefined);
  }
  async getBenchmarkSummary(runId: string) {
    const rows = this.s.benchmarkResults.filter((r) => r.runId === runId);
    return repoOk({
      total: rows.length,
      passed: rows.filter((r) => r.passed === true).length,
      failed: rows.filter((r) => r.passed === false).length,
    });
  }
}

class Audit implements AuditRepository {
    private s: InMemoryStore;
  constructor(s: InMemoryStore) {
    this.s = s;
  }
  async appendAuditEvent(event: AuditEventInput, ctx: OrgContext) {
    const sanitized = sanitizeAuditPayload({ ...event.payload, correlationId: ctx.correlationId });
    if (!sanitized.ok) return repoErr<void>(sanitized.error.code, sanitized.error.message, sanitized.error.detail);
    this.s.auditEvents.push({
      ...event,
      payload: sanitized.data,
      id: nextId("aud"),
      occurredAt: new Date().toISOString(),
    });
    return repoOk(undefined);
  }
  async listAuditEvents(organizationId: string, page?: Page) {
    const p = clampPage(page);
    return repoOk(this.s.auditEvents
      .filter((e) => e.organizationId === organizationId)
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(p.offset, p.offset + p.limit));
  }
}

export function createInMemoryRepositories(store = new InMemoryStore()): Repositories & { store: InMemoryStore } {
  const audit = new Audit(store);
  return {
    kind: "in-memory",
    store,
    sources: new Sources(store, audit),
    documents: new Documents(store, audit),
    entities: new Entities(store),
    citations: new Citations(store),
    research: new Research(store, audit),
    benchmark: new Benchmark(store),
    audit,
  };
}

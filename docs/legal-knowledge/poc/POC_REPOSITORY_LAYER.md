# POC Repository Layer (Epic 2, Phase 8)

**The single doorway between domain logic and storage.** UI components
never call Supabase directly; everything goes through typed repositories.

## Structure
```
src/modules/legal-knowledge/repositories/
  types.ts       ← domain rows, RepoResult/RepoError, OrgContext,
                   pagination, 7 repository interfaces, shared guards
  in-memory.ts   ← deterministic impl (unit tests + no-DB fallback);
                   mirrors the RLS rules so cross-tenant tests are real
  supabase.ts    ← Development-project impl over supabase-js (server-only)
  index.ts       ← factory + APPROVED_DEV_PROJECT_REF production-refusal
```

## Repositories & methods (no unrestricted generic CRUD anywhere)
- **sources**: listSources · getSourceById · getSourceByRegistryCode ·
  upsertSourceAsIngestionService · updateSourceVerification ·
  listSourcesByPriority
- **documents**: createCanonicalDocument · createDocumentVersion ·
  attachDocumentFile · saveExtractedText · saveSections · saveEmbeddings ·
  getDocument · getDocumentVersion · getSections · listDocuments ·
  findByCanonicalUrl · findByHash · markVerificationStatus ·
  searchSections (DB-backed lexical retrieval)
- **entities**: upsertEntity · linkEntityToDocument
- **citations**: createCitation · listCitationsFromDocument ·
  listCitationsToDocument · resolveCitationTarget
- **research**: createResearchSession · addResearchQuery ·
  saveResearchResults · saveAnswerClaims · attachClaimCitations ·
  getResearchSession
- **benchmark**: listBenchmarkTasks · createBenchmarkRun ·
  saveBenchmarkResult · getBenchmarkSummary
- **audit**: appendAuditEvent · listAuditEvents (admin, org-scoped)

## Contract guarantees (test-backed)
1. **Typed results** — `RepoResult<T>` union; raw driver errors never
   escape (`mapError` translates PG codes → safe Hebrew messages, detail
   kept for server logs only; no schema leakage).
2. **Organization context** — every mutating call takes `OrgContext`; the
   in-memory impl enforces the same tenancy the RLS enforces remotely
   (cross-tenant tests 4-5 in repositories.test.ts); on Supabase the
   database itself is the enforcement layer.
3. **Provenance & verification preserved** — verification status changes
   only via `markVerificationStatus` (audited); fixtures cannot claim
   verified status (validated at seed build).
4. **Pagination + deterministic ordering** — `clampPage` (1..100), stable
   sort keys on every list method (test 7).
5. **No N+1** — `searchSections` embeds the version→document join in one
   PostgREST request; `getResearchSession` fetches session+queries in one.
6. **Audited mutations** — source upserts/verification, document
   creation/verification, session creation, seeding → audit_events with
   correlationId; payloads sanitized (no secrets, no bodies — test 6).
7. **Production refusal** — the factory throws unless the URL targets the
   approved dev ref (test 12); the service key comes from env only.

## Privilege model
The Supabase impl is privilege-agnostic: hand it a service client → the
ingestion path (RLS bypass, server-side only); hand it a user client
(anon key + JWT) → tenant-scoped, RLS-enforced. Choosing the client IS
the security decision, and it happens only in server code.

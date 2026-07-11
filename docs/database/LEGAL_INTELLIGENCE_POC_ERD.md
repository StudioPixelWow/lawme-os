# LawME — POC Entity-Relationship Diagram

```mermaid
erDiagram
    organizations ||--o{ organization_memberships : "has members"
    profiles      ||--o{ organization_memberships : "belongs via"
    organizations ||--o{ legal_documents : "owns (private only)"
    organizations ||--o{ legal_research_sessions : "owns"
    organizations ||--o{ audit_events : "scoped to"

    legal_sources ||--o{ legal_documents : "publishes"
    legal_sources ||--o{ legal_source_fetches : "fetched from"

    legal_documents ||--o{ legal_document_versions : "versioned as"
    legal_documents ||--o{ legal_document_entities : "linked to"
    legal_documents ||--o{ legal_citations : "cites (citing)"
    legal_documents |o--o{ legal_citations : "cited by (nullable)"
    legal_document_versions ||--o| legal_document_text : "extracted text"
    legal_document_versions ||--o{ legal_document_sections : "anchors"
    legal_document_versions ||--o{ legal_document_files : "stored files"
    legal_document_versions ||--o{ legal_embeddings : "chunk vectors"

    legal_entities ||--o{ legal_document_entities : "appears in"

    legal_research_sessions ||--o{ legal_research_queries : "contains"
    legal_research_queries  ||--o{ legal_research_results : "ranked hits"
    legal_research_queries  ||--o{ legal_answer_claims : "claims"
    legal_answer_claims     ||--o{ legal_claim_citations : "evidence"
    legal_documents         ||--o{ legal_research_results : "retrieved"
    legal_documents         ||--o{ legal_claim_citations : "cited as evidence"

    benchmark_runs  ||--o{ benchmark_results : "produces"
    benchmark_tasks ||--o{ benchmark_results : "evaluated by"

    profiles ||--o{ legal_research_sessions : "created by"
```

## Reading the diagram
- **Tenancy boundary:** `legal_documents.organization_id` is nullable —
  NULL rows are the shared global corpus; the research chain
  (sessions→queries→results→claims→citations) is always
  organization-owned. `audit_events`, `benchmark_*`, `legal_sources`,
  `legal_entities`, `legal_source_fetches` are global infrastructure.
- **Version-centric content:** text, sections (anchors), files and
  embeddings attach to a *version*, never directly to the document —
  re-extraction produces version 2 alongside version 1.
- **Citations are the graph's layer 2** (LEGAL_KNOWLEDGE_GRAPH_ARCHITECTURE.md):
  `legal_citations` may point to an ingested document (resolved) or carry
  only a normalized case number / statute ref (unresolved — resolvable
  later without schema change).
- **Claims → citations** is the drafting/answer provenance chain: every
  answer claim has zero-or-more evidence rows; a claim with zero evidence
  can only carry the labels `unresolved`/`unknown` (application-enforced,
  benchmark-tested).

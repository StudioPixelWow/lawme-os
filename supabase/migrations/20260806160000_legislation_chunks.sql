-- ============================================================================
-- Legislation chunks (ADDITIVE) — legal RAG retrieval units for sections.
-- Additive only; RLS deny-by-default (service-role only). Sections themselves
-- live in legalai.canonical_entities (entity_type='Section'); this table holds
-- the retrieval chunks with FTS + a (deferred) embedding column.
-- NOT auto-applied — remote migrations require founder approval (dev-only here).
-- ============================================================================
create schema if not exists legalai;

create table if not exists legalai.legal_chunks (
  chunk_id             uuid primary key default gen_random_uuid(),
  law_canonical_id     text not null,
  section_canonical_id text not null,
  document_version_id  text,
  section_number       text,
  heading_path         text,
  ordinal              integer not null default 0,
  chunk_index          integer not null default 0,
  text                 text not null,
  text_search          tsvector,
  embedding            vector(1536),
  embedding_model      text,
  source_span_start    integer,
  source_span_end      integer,
  token_count          integer,
  content_hash         text not null,
  language             text default 'he',
  source_url           text,
  license_status       text default 'statutory_exemption',
  published            boolean not null default false,
  created_at           timestamptz not null default now(),
  unique (section_canonical_id, chunk_index)
);
create index if not exists lc_law_idx on legalai.legal_chunks (law_canonical_id, ordinal, chunk_index);
create index if not exists lc_section_idx on legalai.legal_chunks (section_canonical_id);
create index if not exists lc_fts_idx on legalai.legal_chunks using gin (text_search);
create index if not exists lc_hash_idx on legalai.legal_chunks (content_hash);

alter table legalai.legal_chunks enable row level security;
-- no SELECT policy: service-role only (published chunks are exposed via a
-- reviewed read path later, gated by the citation contract).

comment on table legalai.legal_chunks is
  'Legislation RAG chunks (chunk-by-section). Additive; service-role only.';

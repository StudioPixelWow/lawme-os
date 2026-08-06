-- ============================================================================
-- Official legislation publications (ADDITIVE) — current Epic Track A step 18.
--
-- One row per OFFICIAL publication of a law (original enactment + each
-- amendment/correction), sourced from the Knesset National Legislation API and
-- the ספר החוקים PDFs on fs.knesset.gov.il. This is the OFFICIAL PUBLICATION
-- STREAM, NOT a consolidated text: consolidation_status is pinned to
-- 'non_consolidated_publication' by default and a CHECK forbids ever storing a
-- publication row as an authoritative current consolidated text here.
--
-- Additive only; RLS deny-by-default (service-role only). The Law entities
-- themselves live in legalai.canonical_entities (entity_type='Law'); PDF BYTES
-- live in object storage, never in Postgres — only the hash/url/metadata here.
-- NOT auto-applied — remote migrations require founder approval (dev-only here).
-- ============================================================================
create schema if not exists legalai;

create table if not exists legalai.law_publications (
  publication_canonical_id text primary key,           -- knesset:publication:<itemId>
  law_canonical_id         text not null,              -- knesset:<IsraelLawID>
  israel_law_id            text not null,
  publication_item_id      text,                        -- Knesset itemId
  amendment_event_id       text,                        -- knesset:law:<id>:correction:<n> | :pub:<itemId>
  publication_type         text not null,               -- original_enactment | amendment_law | correction | repeal_publication | official_gazette_pdf
  correction_number        text,
  correction_type          text,                        -- ישיר | עקיף
  title                    text,
  publication_series       text,                        -- ספר החוקים
  publication_number       text,                        -- חוברת (magazine number)
  publication_page         text,                        -- עמוד
  publication_date         date,
  chain_index              integer not null default 0,
  -- PDF (bytes live in object storage; only identity/metadata here)
  pdf_url                  text,
  pdf_sha256               text,                        -- 64-hex, null until fetched
  pdf_object_key           text,                        -- object-storage key, null until stored
  pdf_size_bytes           bigint,
  pdf_content_type         text,
  pdf_fetched_at           timestamptz,
  -- Extraction (null until the operator extraction step runs)
  extraction_method        text,
  extraction_version       text,
  raw_text_hash            text,
  normalized_text_hash     text,
  page_count               integer,
  extraction_confidence    numeric,
  ocr_used                 boolean,
  -- Classification (safety-critical labels)
  content_level            text not null default 'metadata_only',   -- metadata_only until text extracted; then full_text
  consolidation_status     text not null default 'non_consolidated_publication',
  authority_level          text not null default 'primary_official',
  effective_date_status    text not null default 'unknown',          -- unknown | explicit | parsed | needs_review
  openbook_status          text not null default 'none',             -- none | community_consolidated | official_consolidated
  license_basis            text not null default 'statutory_exemption_sec6',
  version_status           text not null default 'mapped',           -- mapped | validated | persisted | published | quarantined
  published                boolean not null default false,
  source_url               text,
  first_seen_at            timestamptz not null default now(),
  last_verified_at         timestamptz not null default now(),
  provenance               jsonb not null default '{}'::jsonb,
  constraint law_publications_content_level_chk
    check (content_level in ('metadata_only','full_text')),
  constraint law_publications_pubtype_chk
    check (publication_type in ('original_enactment','amendment_law','correction','repeal_publication','official_gazette_pdf')),
  constraint law_publications_consolidation_chk
    check (consolidation_status in ('non_consolidated_publication','reconstructed_candidate','official_consolidated','verified_consolidated_current')),
  constraint law_publications_authority_chk
    check (authority_level in ('primary_official','secondary_official','unofficial_reference','community_reference')),
  -- A publication row may NEVER be published as an authoritative current text:
  -- publishing requires an explicit verified-consolidated status set elsewhere.
  constraint law_publications_no_publish_as_consolidated_chk
    check (not (published and consolidation_status = 'non_consolidated_publication' and content_level = 'full_text' and authority_level <> 'primary_official')),
  -- PDF sha256, when present, must be 64 hex chars.
  constraint law_publications_sha_chk
    check (pdf_sha256 is null or pdf_sha256 ~ '^[0-9a-f]{64}$')
);

create index if not exists lp_law_idx on legalai.law_publications (law_canonical_id, chain_index);
create index if not exists lp_israel_law_idx on legalai.law_publications (israel_law_id);
create index if not exists lp_pubdate_idx on legalai.law_publications (publication_date);
create index if not exists lp_pubnum_idx on legalai.law_publications (publication_series, publication_number, publication_page);
create index if not exists lp_sha_idx on legalai.law_publications (pdf_sha256);
create index if not exists lp_amendevt_idx on legalai.law_publications (amendment_event_id);

-- Amendment graph edges between publications and laws (additive).
create table if not exists legalai.law_publication_edges (
  edge_id        bigint generated always as identity primary key,
  edge_type      text not null,          -- publishes | amends | follows | repeals | modifies
  from_id        text not null,          -- publication canonical id
  to_id          text not null,          -- law | previous-publication | section canonical id
  evidence       text,
  created_at     timestamptz not null default now(),
  constraint lpe_type_chk check (edge_type in ('publishes','amends','follows','repeals','modifies')),
  constraint lpe_uniq unique (edge_type, from_id, to_id)
);
create index if not exists lpe_from_idx on legalai.law_publication_edges (from_id);
create index if not exists lpe_to_idx on legalai.law_publication_edges (to_id);

alter table legalai.law_publications enable row level security;
alter table legalai.law_publication_edges enable row level security;
-- no SELECT/INSERT policies: service-role only. Serving is gated by the
-- citation contract + legislation-authority-policy (RAG never presents these
-- as consolidated current text).

comment on table legalai.law_publications is
  'Official Knesset law publications (original + amendments). Publication stream, NOT consolidated text. Additive; service-role only.';
comment on table legalai.law_publication_edges is
  'Amendment-graph edges among law publications (publishes/amends/follows/repeals/modifies). Additive; service-role only.';

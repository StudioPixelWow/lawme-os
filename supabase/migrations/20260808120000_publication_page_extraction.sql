-- LAW ME — additive extraction layer for the hybrid router (Phase 3).
--
-- REVIEW-ONLY. DO NOT APPLY until reviewed and approved as additive/non-destructive.
-- This migration is purely ADDITIVE: it creates ONE new table and touches nothing
-- that exists. It does not alter, drop, or rewrite any column, constraint, policy,
-- or row. `raw` extraction is NEVER overwritten — this table holds a separate
-- machine-derived structured layer that REFERENCES the raw/normalized artifacts.
--
-- Invariants baked in: published stays false (publishing is a separate, later,
-- explicitly-gated decision); physical pdf_page_index is required; a missing
-- printed folio is NULL (allowed); RLS is deny-by-default (service-role only).

create table if not exists legalai.publication_page_extraction (
  id                        bigint generated always as identity primary key,
  publication_canonical_id  text not null
    references legalai.law_publications (publication_canonical_id) on delete cascade,

  -- Physical citation anchor (REQUIRED, deterministic — must align 100%).
  pdf_page_index            integer not null check (pdf_page_index >= 1),
  official_pdf_url          text,
  source_span_start         integer check (source_span_start is null or source_span_start >= 0),
  source_span_end           integer check (source_span_end   is null or source_span_end   >= 0),
  -- Printed-citation labels (NULLABLE: absent ⇒ null, never a guessed value).
  printed_page_label        text,
  gazette_page_number       text,

  -- Router decision + provenance (see extraction-router.ts / layout-order-v3.ts).
  route                     text not null check (route in ('A','B1','B2')),
  route_reason              text not null,
  engine                    text not null,
  engine_version            text not null,
  order_version             text,
  router_version            text not null,
  confidence                numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  machine_derived           boolean not null default true,
  needs_review              boolean not null default false,

  -- Layer references — kept SEPARATE and immutable; raw is never overwritten.
  raw_extraction_ref        text,   -- object key / hash of the raw text layer (authoritative-adjacent)
  normalized_extraction_ref text,   -- object key / hash of the normalized layer
  structured_extraction_ref text,   -- object key / hash of the structured reading-order layer

  extraction_status         text not null default 'pending'
    check (extraction_status in ('pending','extracted','needs_review','failed')),

  -- Publishing is NEVER enabled from this layer.
  published                 boolean not null default false,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  provenance                jsonb not null default '{}'::jsonb,

  constraint ppe_machine_derived_chk check (machine_derived = true),
  constraint ppe_never_published_chk check (published = false),
  -- one current structured extraction per (publication, physical page, engine build)
  constraint ppe_unique_page_build unique (publication_canonical_id, pdf_page_index, router_version, engine_version)
);

comment on table legalai.publication_page_extraction is
  'Machine-derived per-page structured extraction (hybrid router A/B1/B2). Additive layer; raw extraction is never overwritten. pdf_page_index is the deterministic physical citation anchor and must align 100%. printed_page_label/gazette_page_number are nullable (absent ⇒ null, never guessed). published is hard-locked false; publishing is a separate gated decision.';

create index if not exists ppe_pub_idx  on legalai.publication_page_extraction (publication_canonical_id, pdf_page_index);
create index if not exists ppe_route_idx on legalai.publication_page_extraction (route);
create index if not exists ppe_review_idx on legalai.publication_page_extraction (needs_review) where needs_review;
create index if not exists ppe_status_idx on legalai.publication_page_extraction (extraction_status);

-- RLS: deny-by-default; service-role only (no anon/authenticated policy), matching
-- the module's RLS-first posture. No SELECT/INSERT/UPDATE policy is created, so
-- only the service role (which bypasses RLS) can touch it.
alter table legalai.publication_page_extraction enable row level security;

-- keep updated_at fresh (additive trigger; function is created if absent).
create or replace function legalai.tg_ppe_touch_updated_at() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists ppe_touch_updated_at on legalai.publication_page_extraction;
create trigger ppe_touch_updated_at before update on legalai.publication_page_extraction
  for each row execute function legalai.tg_ppe_touch_updated_at();

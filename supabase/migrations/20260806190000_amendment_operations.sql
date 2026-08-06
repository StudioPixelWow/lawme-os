-- ============================================================================
-- Amendment operations (ADDITIVE) — parsed mutation assertions from amendment
-- publication text (Epic step 7-8). Rule-based, NO LLM diff. Each row is an
-- ASSERTION with confidence + status (parsed/needs_review/unsupported); nothing
-- here fabricates a consolidated text. Additive; RLS deny-by-default.
-- ============================================================================
create schema if not exists legalai;

create table if not exists legalai.amendment_operations (
  operation_id            bigint generated always as identity primary key,
  publication_canonical_id text not null,       -- source publication
  target_law_id           text not null,        -- knesset:<IsraelLawID>
  target_section          text,                 -- resolved section number (nullable)
  operation_type          text not null,        -- modified_section | replaced_section | added_section | deleted_section | term_change | commencement | transitional
  status                  text not null,        -- parsed | needs_review | unsupported
  confidence              numeric not null default 0,
  evidence                text,                 -- literal matched clause
  source_span_start       integer,
  source_span_end         integer,
  parser_version          text not null,
  created_at              timestamptz not null default now(),
  constraint ao_status_chk check (status in ('parsed','needs_review','unsupported')),
  constraint ao_uniq unique (publication_canonical_id, source_span_start, operation_type)
);
create index if not exists ao_pub_idx on legalai.amendment_operations (publication_canonical_id);
create index if not exists ao_law_idx on legalai.amendment_operations (target_law_id, target_section);

alter table legalai.amendment_operations enable row level security;

comment on table legalai.amendment_operations is
  'Parsed amendment mutation assertions (rule-based, no LLM). Additive; service-role only.';

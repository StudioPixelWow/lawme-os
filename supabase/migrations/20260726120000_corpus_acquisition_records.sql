-- ============================================================================
-- Corpus Acquisition — canonical source records + license register
-- Acquisition Slice 1.  ADDITIVE, RLS deny-by-default, tenant-isolated.
--
-- STATUS: LOCAL ONLY — NOT APPLIED to any remote project by this change.
-- The application does not depend on these tables at runtime yet; they back the
-- acquisition program once an operator begins lawful ingestion. Applying to a
-- remote project is a separate, founder-approved step.
--
-- Design guarantees:
--   * Every record preserves the full canonical provenance field set.
--   * acquisition_mode is constrained to the lawful ladder.
--   * Firm-owned content is tenant-scoped; RLS forbids cross-tenant reads.
--   * Shared official/licensed records (tenant_id IS NULL) are readable by any
--     authenticated member but writable only by the service role (server-
--     controlled ingestion) — never by a browser client.
-- ============================================================================

create schema if not exists corpus;

-- License / reuse-basis register -------------------------------------------
create table if not exists corpus.license_register (
  license_ref        text primary key,
  provider           text not null,
  basis_kind         text not null
                       check (basis_kind in
                         ('statutory_exemption','open_data','provider_license',
                          'firm_ownership')),
  ingestion_allowed  boolean not null default false,
  display_allowed    boolean not null default false,
  redistribute_allowed boolean not null default false,
  confirmed_in_writing boolean not null default false,   -- Gate-A flag
  territory          text,
  notes              text,
  created_at         timestamptz not null default now()
);

-- Canonical acquired-item records ------------------------------------------
create table if not exists corpus.source_records (
  record_id          text primary key,
  source_key         text not null,
  source_owner       text not null,
  source_url         text,
  acquisition_mode   text not null
                       check (acquisition_mode in
                         ('FULL_TEXT','STRUCTURED_METADATA','METADATA_AND_LINK',
                          'DISCOVERY_ONLY','BLOCKED')),
  authority_tier     text not null
                       check (authority_tier in
                         ('binding_primary','persuasive_primary','official_regulatory',
                          'licensed_editorial','academic','professional_commentary',
                          'secondary_explanation','discovery_material','firm_internal')),
  issuing_body       text,
  instrument_number  text,
  title_he           text,
  publication_date   date,
  decision_date      date,
  effective_date     date,
  valid_from         date,
  valid_to           date,
  version            text,
  amendment_of       text references corpus.source_records(record_id),
  currentness        text not null default 'unknown'
                       check (currentness in ('current','historical','superseded','unknown')),
  official_status    text not null
                       check (official_status in ('official','secondary','unofficial')),
  full_text_available boolean not null default false,
  license_ref        text references corpus.license_register(license_ref),
  source_hash        text,
  ingested_at        timestamptz not null default now(),
  last_checked_at    timestamptz not null default now(),
  tenant_id          uuid,                                 -- null = shared corpus
  verification_status text not null default 'ingested_unverified'
                       check (verification_status in ('ingested_unverified','discovery_only','verified')),
  -- A record that holds full text must name the basis under which it is held.
  constraint full_text_requires_basis
    check (full_text_available = false or license_ref is not null)
);

create index if not exists source_records_source_key_idx on corpus.source_records (source_key);
create index if not exists source_records_tenant_idx on corpus.source_records (tenant_id);
create index if not exists source_records_hash_idx on corpus.source_records (source_hash);

-- Row Level Security --------------------------------------------------------
alter table corpus.license_register enable row level security;
alter table corpus.source_records   enable row level security;

-- Deny by default: no policy = no access for anon/authenticated.
-- Shared corpus (tenant_id is null) is readable by authenticated members.
create policy source_records_read_shared
  on corpus.source_records for select
  to authenticated
  using (tenant_id is null);

-- Firm-owned rows are readable ONLY by a member of that tenant's org.
-- Reuses the platform helper app.is_org_member(uuid) (defined in earlier
-- migrations); cross-tenant reads are impossible.
create policy source_records_read_own_tenant
  on corpus.source_records for select
  to authenticated
  using (tenant_id is not null and app.is_org_member(tenant_id));

-- No client INSERT/UPDATE/DELETE: ingestion is server-controlled (service role
-- bypasses RLS after application authorization). No write policy is defined, so
-- authenticated/anon writes are denied by default.

-- License register is readable by authenticated, writable only by service role.
create policy license_register_read
  on corpus.license_register for select
  to authenticated
  using (true);

comment on table corpus.source_records is
  'Canonical acquired-item provenance. RLS: shared rows (tenant_id null) readable by any authenticated member; firm-owned rows readable only within the owning tenant; writes are service-role only. No full text may be held without a license_ref (Copyright Act 2007 §6 / open-data / provider licence / firm ownership).';

-- ============================================================================
-- LEGAL AI ISRAEL — Source Registry + audit-support foundation (Phase 1)
--
-- STATUS: LOCAL ONLY — NOT APPLIED to any remote project by this change.
-- Scope: the Source Registry, source-copy/provenance, discovery windows, and
-- ingestion tracking needed for the Source Audit + Pilot. The full document /
-- section / citation / embedding schema is Phase 2 (see the ADR).
--
-- SAFETY: every seeded source is collector_enabled=false, collector_mode set to
-- the most restrictive lawful default, automated_access_status='unclear', and
-- legal_review_status='pending'. A collector cannot run until an audit changes
-- these explicitly. RLS deny-by-default.
-- ============================================================================

create schema if not exists legalai;

-- Source Registry -----------------------------------------------------------
create table if not exists legalai.legal_sources (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  organization text,
  base_url text not null,
  source_type text not null,
  authority_type text,
  jurisdiction text,
  coverage_description text,
  access_method text,
  robots_status text,
  terms_url text,
  license_name text,
  license_url text,
  commercial_use_status text,
  automated_access_status text default 'unclear'
    check (automated_access_status in ('allowed','apparently_allowed','unclear','prohibited','manual_only')),
  requires_login boolean default false,
  has_captcha boolean default false,
  rate_limit_per_minute integer,
  collector_enabled boolean default false,
  audit_status text default 'pending',
  audit_notes text,
  -- registry-extension columns (folded in from the Phase-1 spec):
  canonical_priority integer,
  collector_mode text default 'disabled'
    check (collector_mode in ('disabled','manual_only','discovery_only','public_search_pilot','metadata_only','official_feed','licensed_full')),
  text_ingestion_allowed boolean default false,
  metadata_ingestion_allowed boolean default false,
  license_verified_by text,
  license_verified_at timestamptz,
  license_document_path text,
  legal_review_status text default 'pending'
    check (legal_review_status in ('pending','technical_review_complete','legal_review_required','approved_metadata_only','approved_public_documents','approved_licensed_use','rejected')),
  last_audited_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- HARD INVARIANT: a collector may only be enabled in a non-restrictive mode
  -- and only when automated access is not unclear/prohibited.
  constraint collector_enable_requires_clearance check (
    collector_enabled = false
    or (collector_mode not in ('disabled','manual_only')
        and automated_access_status in ('allowed','apparently_allowed'))
  )
);

-- Minimal document anchor (full document schema is Phase 2) ------------------
create table if not exists legalai.legal_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references legalai.legal_sources(id),
  source_document_id text,
  source_url text not null,
  document_type text not null default 'unknown',
  case_number_raw text,
  case_number_normalized text,
  court_name text,
  decision_date date,
  publication_status text default 'public',
  publication_restrictions text[],
  anonymization_status text,
  original_sha256 text,
  status text default 'discovered',
  removal_requested_at timestamptz,
  removed_at timestamptz,
  removal_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(source_id, source_document_id),
  unique(source_id, original_sha256)
);

-- Source copies: one legal document, many source origins ---------------------
create table if not exists legalai.legal_document_sources (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references legalai.legal_documents(id),
  source_id uuid not null references legalai.legal_sources(id),
  source_document_id text,
  source_url text not null,
  file_path text,
  sha256 text,
  is_official boolean default false,
  is_canonical boolean default false,
  first_seen_at timestamptz default now(),
  last_verified_at timestamptz,
  source_removed_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  unique(source_id, source_url)
);

-- Field-level provenance -----------------------------------------------------
create table if not exists legalai.document_field_provenance (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references legalai.legal_documents(id),
  field_name text not null,
  field_value jsonb,
  source_id uuid references legalai.legal_sources(id),
  source_url text,
  extraction_method text,
  confidence numeric,
  verified_at timestamptz,
  is_canonical boolean default false
);

-- Discovery windows (chronological, checkpointed) ----------------------------
create table if not exists legalai.source_discovery_windows (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references legalai.legal_sources(id),
  court_name text,
  proceeding_type text,
  date_from date,
  date_to date,
  cursor text,
  page_number integer,
  status text default 'pending',
  results_count integer default 0,
  discovered_count integer default 0,
  downloaded_count integer default 0,
  last_attempt_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  unique(source_id, court_name, proceeding_type, date_from, date_to)
);

-- Third-party discovery (never mixed into the official document tables) -------
create table if not exists legalai.external_case_discoveries (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references legalai.legal_sources(id),
  external_url text not null,
  external_case_id text,
  case_number_raw text,
  case_number_normalized text,
  proceeding_type text,
  court_name text,
  opened_at date,
  closed_at date,
  parties_display text,
  attorneys_display text,
  discovered_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  official_document_id uuid references legalai.legal_documents(id),
  official_source_found boolean default false,
  verification_status text default 'unverified'
    check (verification_status in ('unverified','matched_to_official','metadata_mismatch','official_source_not_found','restricted','removed','manual_review')),
  source_metadata jsonb default '{}'::jsonb,
  unique(source_id, external_url)
);

-- Ingestion run tracking -----------------------------------------------------
create table if not exists legalai.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references legalai.legal_sources(id),
  run_type text not null,
  status text default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  discovered_count integer default 0,
  downloaded_count integer default 0,
  parsed_count integer default 0,
  skipped_count integer default 0,
  failed_count integer default 0,
  warnings jsonb default '[]'::jsonb,
  errors jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb
);

-- Indexes -------------------------------------------------------------------
create index if not exists legal_documents_case_norm_idx on legalai.legal_documents (case_number_normalized);
create index if not exists external_discoveries_case_idx on legalai.external_case_discoveries (case_number_normalized);
create index if not exists document_sources_doc_idx on legalai.legal_document_sources (document_id);

-- RLS: deny-by-default; registry + audit metadata readable by authenticated;
-- all writes are service-role only (server-controlled ingestion).
alter table legalai.legal_sources             enable row level security;
alter table legalai.legal_documents           enable row level security;
alter table legalai.legal_document_sources    enable row level security;
alter table legalai.document_field_provenance enable row level security;
alter table legalai.source_discovery_windows  enable row level security;
alter table legalai.external_case_discoveries enable row level security;
alter table legalai.ingestion_runs            enable row level security;

create policy legal_sources_read on legalai.legal_sources for select to authenticated using (true);
create policy legal_documents_read on legalai.legal_documents for select to authenticated
  using (removed_at is null and publication_status = 'public');

-- Seed: the 8 audited sources — every collector OFF, pending audit -----------
insert into legalai.legal_sources
  (code, name, organization, base_url, source_type, authority_type, jurisdiction,
   coverage_description, access_method, automated_access_status, collector_enabled,
   collector_mode, canonical_priority, audit_status, legal_review_status, audit_notes)
values
  ('supreme_court','בית המשפט העליון','הרשות השופטת','https://supremedecisions.court.gov.il/',
   'official_court','official','IL','פסקי דין והחלטות של העליון','html_search','unclear',false,
   'discovery_only',1,'pending','legal_review_required','טכני לא אומת בסביבה זו — robots/terms/endpoints טרם נבדקו.'),
  ('judiciary_spokesmanship','מאגר הדוברות של הרשות השופטת','הרשות השופטת','https://www.gov.il/he/departments/dynamiccollectors/spokmanship_court',
   'official_selection','official','IL','אוסף נבחר לעניין ציבורי — אינו כלל הפסיקה','html','unclear',false,
   'discovery_only',3,'pending','legal_review_required','coverage_type=selected_public_interest. אין להציג ככלל הפסיקה.'),
  ('land_registrar_verdicts','פסיקת המפקחים על רישום מקרקעין','משרד המשפטים','https://www.gov.il/he/departments/dynamiccollectors/tabu_search_verdict',
   'official_tribunal','official','IL','פסקי דין של המפקחים על רישום מקרקעין','html_search','unclear',false,
   'discovery_only',3,'pending','legal_review_required','מסמכים לפני 2021 בשדות חיפוש מצומצמים — צריך אסטרטגיית Backfill נפרדת.'),
  ('unicourt_tribunals','מערכת בתי הדין (משרד המשפטים)','משרד המשפטים','https://unicourt.justice.gov.il/information',
   'official_tribunal_index','official','IL','מפתח בתי דין וועדות עם חיפוש פסיקה פומבי','html','unclear',false,
   'discovery_only',3,'pending','legal_review_required','לכל קטגוריה נדרש Source Policy נפרד.'),
  ('data_gov_il','data.gov.il — נתונים פתוחים','ממשלת ישראל','https://data.gov.il/',
   'open_data_portal','official','IL','מאגרי מידע פתוחים; לבדוק Datasets משפטיים','api_or_file','unclear',false,
   'discovery_only',4,'pending','legal_review_required','מועמד Pilot מועדף: סביר שקיים רישיון מידע מפורש + API/CSV. טעון אימות.'),
  ('gov_il_legal','מאגרי gov.il משפטיים','ממשלת ישראל','https://www.gov.il',
   'official_publication','official','IL','ועדות ערר, בתי דין, החלטות מנהליות פומביות','html','unclear',false,
   'discovery_only',3,'pending','legal_review_required','חיפוש מבוקר בלבד; כל תת-מקור נכנס למרשם בנפרד.'),
  ('net_hamishpat','מערכת נט המשפט','הרשות השופטת','https://www.court.gov.il/ngcs.web.site/homepage.aspx',
   'official_court_system','official','IL','פסיקת שלום/מחוזי/עבודה — רק גרסה פומבית, ללא Login','html_search','unclear',false,
   'discovery_only',2,'pending','legal_review_required','רק PUBLIC_JUDGMENT/PUBLIC_DECISION. אין Login, אין אזור אישי, אין גישת עו״ד/צד.'),
  ('tolaat_mishpat','תולעת המשפט','צד שלישי','https://xn----8hcborozt8bdd.xn--9dbq2a/',
   'third_party_legal_index','non_official','IL','שכבת הנגשה/אינדוקס של צד שלישי — לא מקור רשמי','html','unclear',false,
   'discovery_only',7,'pending','legal_review_required','לא סמכותי. ברירת מחדל: discovery בלבד, ללא הורדת טקסט/מטא-דאטה עד רישיון מפורש.')
on conflict (code) do nothing;

comment on table legalai.legal_sources is
  'LEGAL AI ISRAEL source registry. Every source starts collector_enabled=false; collector_enable_requires_clearance forbids enabling a collector without an audited non-restrictive mode and non-unclear access status.';

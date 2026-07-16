-- ============================================================================
-- LawME — Capability 2 · Slice 2: Matter Domain Freeze
--   (contacts · matter_participants · matter_facts · matter_deadlines
--    + additive matter-level policy columns)
-- Migration: 20260715120000_capability2_slice2_matter_domain
--
-- STATUS: PREPARED FOR REVIEW — NOT YET APPLIED. NOT COMMITTED.
--   Target (only on explicit founder approval): DEVELOPMENT project
--   udispadsbxqicmawqcuk ONLY. Production is never touched. Per AGENTS.md,
--   applying a remote migration requires explicit per-action founder approval.
--
-- CANONICAL DOMAIN LANGUAGE (frozen — see docs/domain/LAWME_DOMAIN_GLOSSARY.md)
--   * Contact           — a reusable firm-level identity (a person or
--                         organization). Owns identity ONLY. Never owns a matter
--                         role, matter notes, legal position, or a matter's
--                         confidentiality / AI policy. "Client" and "opposing
--                         party" are ROLES, not identity entities: no competing
--                         clients table may ever be created.
--   * Matter Participant — the relationship between a Contact and a specific
--                         Matter: role + matter-specific notes + responsiveness
--                         + involvement state.
--   * Fact              — a statement about what happened, with epistemic status
--                         and provenance. An allegation is never automatically a
--                         Fact; intake cannot create an established Fact.
--   * Deadline          — a time obligation; never invents a date.
--
-- WHAT THIS DOES (purely additive)
--   New tables: contacts, matter_participants, matter_facts, matter_deadlines.
--   Additive columns on public.matters: confidentiality, ai_policy.
--   Reuses the tenant model (organizations / memberships / profiles), the
--   app.* RLS helpers (is_org_member / is_org_admin / touch_updated_at), the
--   Capability 1 matters / matter_members / matter_documents tables, and the
--   canonical epistemic vocabulary (src/modules/intelligence/core/
--   epistemic-status.ts). It renames NOTHING that already exists and touches no
--   implemented engine.
--
-- DELIBERATELY NOT IN THIS SLICE (deferred — do not add here):
--   Claim, Legal Issue, Legal Position, the richer Evidence relationship,
--   Court Decision, Hearing, a generalized Approval domain, contact dedup/merge,
--   conflict-of-interest, client-profile defaults, financials, matter relations.
--
-- INVARIANTS PRESERVED
--   * Persist INPUTS only. Intelligence / Score / Narrative / Posture / Timeline
--     and any conflict result remain DERIVED at load — never stored.
--   * An allegation is never a fact. Intake may create ONLY
--     client_alleged / opposing_alleged / disputed / unknown. The two
--     established statuses (confirmed / document_derived) are UNREACHABLE at
--     INSERT and enter only later through the evidence gate (a server UPDATE).
--   * Tenant isolation on organization_id, RLS-first, deny-by-default.
--   * Prefer ARCHIVE over DELETE: no cascade may destroy a Contact identity or a
--     Matter Participant relationship.
--
-- SINGLE TRANSACTION: any failure during apply rolls back automatically.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Trigger helpers specific to this slice (defined in schema app).
--    The generic app.touch_updated_at / app.is_org_member / app.is_org_admin
--    from 20260711173213 are reused as-is (NOT redefined, NOT renamed).
-- ----------------------------------------------------------------------------

-- Org-consistency for a child that references exactly one matter:
-- the child's organization_id MUST equal its matter's organization_id.
-- SECURITY DEFINER so the check sees the parent row regardless of the caller's
-- RLS visibility (a cross-tenant matter_id must be REJECTED, not silently
-- treated as "invisible / not found").
create or replace function app.enforce_child_matter_org()
returns trigger
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  matter_org uuid;
begin
  select m.organization_id into matter_org
  from public.matters m
  where m.id = new.matter_id;

  if matter_org is null then
    raise exception 'matter % does not exist', new.matter_id
      using errcode = 'foreign_key_violation';
  end if;

  if new.organization_id <> matter_org then
    raise exception
      'organization_id % does not match matter %.organization_id %',
      new.organization_id, new.matter_id, matter_org
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Org-consistency for the Matter Participant join, which references BOTH a
-- matter and a contact: all three organization_ids (row, matter, contact) MUST
-- be identical. This is the hard wall against cross-tenant contact linking.
create or replace function app.enforce_matter_participant_org()
returns trigger
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  matter_org  uuid;
  contact_org uuid;
begin
  select m.organization_id into matter_org  from public.matters  m where m.id = new.matter_id;
  select c.organization_id into contact_org from public.contacts c where c.id = new.contact_id;

  if matter_org is null then
    raise exception 'matter % does not exist', new.matter_id using errcode = 'foreign_key_violation';
  end if;
  if contact_org is null then
    raise exception 'contact % does not exist', new.contact_id using errcode = 'foreign_key_violation';
  end if;

  if new.organization_id <> matter_org or new.organization_id <> contact_org then
    raise exception
      'cross-tenant link rejected: row org %, matter org %, contact org %',
      new.organization_id, matter_org, contact_org
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- An allegation is never a fact: block the two established statuses at INSERT.
-- They are reachable ONLY via a later UPDATE on the trusted evidence path. This
-- makes "intake cannot create a confirmed fact" a DATABASE guarantee.
create or replace function app.forbid_established_fact_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('confirmed', 'document_derived') then
    raise exception
      'intake may not create an established fact (status=%); confirmed/document_derived are reachable only through the evidence gate',
      new.status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. contacts — CONTACT: firm-level reusable identity (a person or
--    organization the firm encounters). Owns identity data ONLY. Holds no
--    matter role, no matter notes, no legal position, no matter confidentiality
--    or AI policy. Reusable across matters; conflict checking is DERIVED later
--    from the matter_participants graph — nothing about conflicts is stored.
-- ----------------------------------------------------------------------------
create table public.contacts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  kind             text not null check (kind in ('person', 'company')),
  name_he          text not null check (char_length(name_he) between 1 and 300),
  -- Israeli ID (Teudat Zehut) or company number. NULLABLE: not always known,
  -- and NOT globally unique (see the partial unique index below, which is
  -- per-organization and ignores NULLs).
  id_number_he     text check (id_number_he is null
                               or char_length(id_number_he) between 1 and 32),
  contact_info     jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz,                       -- org-level archival; NEVER hard-deleted
  created_by       uuid references public.profiles (id),
  updated_by       uuid references public.profiles (id)
);
create index contacts_org_idx on public.contacts (organization_id, archived_at);
-- Fast "does the firm already know this person/company?" lookup (dedup is a
-- DEFERRED feature; this index supports the reuse UX and future work).
create index contacts_org_idnum_idx on public.contacts (organization_id, id_number_he)
  where id_number_he is not null;
-- Soft de-dup guard: at most one ACTIVE contact per (org, id_number). Archived
-- rows and NULL id_numbers are exempt, so this never blocks legitimate intake.
create unique index contacts_org_idnum_active_uq
  on public.contacts (organization_id, id_number_he)
  where id_number_he is not null and archived_at is null;
create trigger contacts_touch before update on public.contacts
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 2. matter_participants — MATTER PARTICIPANT: the relationship between a
--    Contact and a specific Matter (the role a contact plays in one matter).
--    Reuse across matters = another matter_participants row pointing at the same
--    contacts.id. "client" and "opposing_party" are roles here, never identity.
-- ----------------------------------------------------------------------------
create table public.matter_participants (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  matter_id        uuid not null references public.matters (id),    -- NO cascade: preserve history
  contact_id       uuid not null references public.contacts (id),   -- NO cascade: preserve identity
  role             text not null check (role in
                     ('client','opposing_party','related_party','witness',
                      'expert','counsel','mediator','insurer')),
  notes_he         text check (notes_he is null or char_length(notes_he) <= 4000),
  -- how reachable/cooperative this contact is IN THIS matter (nullable = not yet assessed)
  responsiveness   text check (responsiveness is null or responsiveness in
                     ('responsive','slow','unresponsive','hostile','unknown')),
  archived_at      timestamptz,                       -- involvement state: soft-remove a role assignment; preserves history
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references public.profiles (id),
  -- A contact holds a given role in a matter at most once. The SAME contact MAY
  -- hold DIFFERENT roles in the same matter (e.g. witness + related_party),
  -- because role participates in the key. NULL-role is impossible (NOT NULL).
  unique (matter_id, contact_id, role)
);
create index matter_participants_matter_idx  on public.matter_participants (matter_id, role);
create index matter_participants_contact_idx on public.matter_participants (contact_id);
create trigger matter_participants_touch before update on public.matter_participants
  for each row execute function app.touch_updated_at();
create trigger matter_participants_org_consistent
  before insert or update on public.matter_participants
  for each row execute function app.enforce_matter_participant_org();

-- ----------------------------------------------------------------------------
-- 3. matter_facts — FACT: persisted factual statements, each with an epistemic
--    status drawn from the Matter-domain legacy vocabulary (maps losslessly to
--    the canonical EpistemicStatus via fromMatterFactStatus). Intake may create
--    ONLY the four unestablished statuses; the two established ones are blocked
--    at INSERT by app.forbid_established_fact_on_insert.
-- ----------------------------------------------------------------------------
create table public.matter_facts (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id),
  matter_id           uuid not null references public.matters (id) on delete cascade,
  -- machine key for the fact slot (e.g. 'employment_duration', 'salary'); a
  -- matter may hold multiple statements per key over time, so key is NOT unique.
  fact_key            text not null check (char_length(fact_key) between 1 and 120),
  statement_he        text not null check (char_length(statement_he) between 1 and 4000),
  status              text not null check (status in
                        ('confirmed','client_alleged','opposing_alleged',
                         'document_derived','disputed','unknown')),
  -- free provenance envelope (who asserted it, when, via which channel); the
  -- evidence gate populates this when a fact becomes established.
  provenance          jsonb not null default '{}'::jsonb,
  -- OPTIONAL forward hook: when an established fact is derived from a stored
  -- document. NULL for allegations. NOT a many-to-many (deferred).
  linked_document_id  uuid references public.matter_documents (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles (id)
);
create index matter_facts_matter_idx on public.matter_facts (matter_id, fact_key);
create trigger matter_facts_touch before update on public.matter_facts
  for each row execute function app.touch_updated_at();
create trigger matter_facts_org_consistent
  before insert or update on public.matter_facts
  for each row execute function app.enforce_child_matter_org();
create trigger matter_facts_no_confirm_on_insert
  before insert on public.matter_facts
  for each row execute function app.forbid_established_fact_on_insert();

-- ----------------------------------------------------------------------------
-- 4. matter_deadlines — DEADLINE: time obligations. DISTINCT from Hearings and
--    Court Decisions (both deferred). Never invents a date: an unknown deadline
--    stores due_at = NULL; an estimated one carries a date but is labeled.
-- ----------------------------------------------------------------------------
create table public.matter_deadlines (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  matter_id        uuid not null references public.matters (id) on delete cascade,
  label_he         text not null check (char_length(label_he) between 1 and 300),
  due_at           timestamptz,                       -- NULL when confidence='unknown' (no invented dates)
  strict           boolean not null default false,    -- true = hard statutory/court bar; false = soft/target
  basis_he         text check (basis_he is null or char_length(basis_he) <= 2000),
  source           text not null check (source in
                     ('statute','court_order','contract','estimated','user_supplied')),
  confidence       text not null default 'unknown' check (confidence in
                     ('known','estimated','unknown')),
  provenance       jsonb not null default '{}'::jsonb,
  timezone         text not null default 'Asia/Jerusalem',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references public.profiles (id),
  -- Fail safe on missing/contradictory input:
  --   * a 'known' deadline MUST carry a date (no confident-but-dateless bar);
  --   * an 'unknown' deadline MUST NOT carry a date (no invented dates);
  --   * 'estimated' may or may not have a date, but is always labeled estimated.
  constraint matter_deadlines_known_has_date   check (confidence <> 'known'   or due_at is not null),
  constraint matter_deadlines_unknown_no_date  check (confidence <> 'unknown' or due_at is null)
);
create index matter_deadlines_matter_idx on public.matter_deadlines (matter_id, due_at);
create trigger matter_deadlines_touch before update on public.matter_deadlines
  for each row execute function app.touch_updated_at();
create trigger matter_deadlines_org_consistent
  before insert or update on public.matter_deadlines
  for each row execute function app.enforce_child_matter_org();
-- FORWARD HOOK (deferred): when Court Decision exists, a court-sourced deadline
-- will gain an optional court_decision_id FK. Not created now.

-- ----------------------------------------------------------------------------
-- 5. matters — additive policy columns (matter-level authoritative).
--    Backfilled protectively for any existing rows via NOT NULL DEFAULT. A
--    future client-profile default must PROPOSE a value; it must never silently
--    override the matter-level column recorded here.
-- ----------------------------------------------------------------------------
alter table public.matters
  add column confidentiality text not null default 'client_confidential'
    check (confidentiality in ('internal','client_confidential','privileged')),
  add column ai_policy       text not null default 'allowed_with_review'
    check (ai_policy in ('allowed','allowed_with_review','prohibited'));

-- ============================================================================
-- ROW LEVEL SECURITY — every new table ON, deny-by-default, org-scoped.
-- Read = any active org member. Write path is the trusted server (service_role
-- bypasses RLS); the authenticated policies below are defense in depth. Matter
-- Participant WRITES are admin-gated, matching the Capability 1 treatment of
-- matter_members (who-is-in-this-case is sensitive).
-- ============================================================================

alter table public.contacts             enable row level security;
alter table public.matter_participants  enable row level security;
alter table public.matter_facts         enable row level security;
alter table public.matter_deadlines     enable row level security;

-- contacts: org members read active + archived (history stays resolvable);
-- create/update by members; NO delete policy (archive only).
create policy contacts_select on public.contacts
  for select to authenticated
  using (app.is_org_member(organization_id));
create policy contacts_insert on public.contacts
  for insert to authenticated
  with check (app.is_org_member(organization_id));
create policy contacts_update on public.contacts
  for update to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

-- matter_participants: reading a role assignment requires org membership;
-- creating and updating assignments is admin-gated. NO delete policy — archive
-- via archived_at to preserve history.
create policy matter_participants_select on public.matter_participants
  for select to authenticated
  using (app.is_org_member(organization_id));
create policy matter_participants_insert on public.matter_participants
  for insert to authenticated
  with check (app.is_org_admin(organization_id));
create policy matter_participants_update on public.matter_participants
  for update to authenticated
  using (app.is_org_admin(organization_id))
  with check (app.is_org_admin(organization_id));

-- matter_facts: org members read/create/update. The insert trigger blocks
-- established statuses regardless of policy.
create policy matter_facts_select on public.matter_facts
  for select to authenticated
  using (app.is_org_member(organization_id));
create policy matter_facts_insert on public.matter_facts
  for insert to authenticated
  with check (app.is_org_member(organization_id));
create policy matter_facts_update on public.matter_facts
  for update to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

-- matter_deadlines: org members read/create/update.
create policy matter_deadlines_select on public.matter_deadlines
  for select to authenticated
  using (app.is_org_member(organization_id));
create policy matter_deadlines_insert on public.matter_deadlines
  for insert to authenticated
  with check (app.is_org_member(organization_id));
create policy matter_deadlines_update on public.matter_deadlines
  for update to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

commit;

-- ============================================================================
-- ROLLBACK GUIDANCE (do not run blindly; take a backup first).
-- Safe on a database holding NO real Slice-2 data. Reverse of apply:
--
--   begin;
--   drop table if exists public.matter_deadlines    cascade;
--   drop table if exists public.matter_facts        cascade;
--   drop table if exists public.matter_participants  cascade;
--   drop table if exists public.contacts            cascade;
--   alter table public.matters
--     drop column if exists ai_policy,
--     drop column if exists confidentiality;
--   drop function if exists app.forbid_established_fact_on_insert();
--   drop function if exists app.enforce_matter_participant_org();
--   drop function if exists app.enforce_child_matter_org();
--   commit;
--
-- Capability 1 tables (matters + matter_*), the tenant model, legal_*,
-- audit_events and all storage buckets are untouched by this migration.
-- ============================================================================

> **Canonical naming note.** This review was written before the domain-language freeze and uses the pre-freeze table names. The **frozen canonical names** (see `docs/domain/LAWME_DOMAIN_GLOSSARY.md`, which is authoritative) map as follows — read every occurrence below through this table:
>
> | this document says | canonical (frozen) name |
> |---|---|
> | `parties` (the table) | `contacts` |
> | `matter_parties` | `matter_participants` |
> | `party_id` | `contact_id` |
> | `contact` (jsonb column) | `contact_info` |
> | role `opposing` / `related` | `opposing_party` / `related_party` |
> | `enforce_matter_party_org()` | `enforce_matter_participant_org()` |
> | index prefixes `parties_*` / `matter_parties_*` | `contacts_*` / `matter_participants_*` |
>
> The migration file reflects the canonical names; where prose below uses the word "party/parties" it means a **Contact** (identity) or a **Matter Participant** (involvement) per the glossary. The reasoning and structure are unchanged by the rename.

# Capability 2 · Slice 2 — Rich Matter Intake: Schema Deliverable (for founder review)

**Status:** PREPARED — nothing applied, committed, or pushed. No intake UI written.
**Migration file:** `supabase/migrations/20260715120000_capability2_slice2_matter_domain.sql`
**Target on approval:** Development project `udispadsbxqicmawqcuk` only. Production untouched.
**Scope guard:** implements exactly the frozen Domain Model Review decision (recommendation B + the one structural adjustment — parties are firm-level). Everything on the deferred roadmap stays out.

This document answers all 16 required review items. Read item 16 first if you only want the delta from the previous single-table proposal.

---

## 1. Exact migration proposal

One additive migration in a single transaction. It creates four tables (`parties`, `matter_parties`, `matter_facts`, `matter_deadlines`), two additive columns on `matters` (`confidentiality`, `ai_policy`), three trigger helper functions in schema `app`, the indexes, the `touch_updated_at`/org-consistency/no-confirm triggers, and RLS policies. It reuses — and does not touch — the tenant model, the `app.is_org_member` / `app.is_org_admin` / `app.touch_updated_at` helpers, and the Capability 1 `matters` / `matter_members` / `matter_documents` tables. No table is dropped or altered destructively. The full rollback block is embedded at the bottom of the file.

Nothing about conflicts, scoring, narrative, posture, or the timeline is stored — those remain derived at load. The migration adds *inputs*, never *outputs*.

## 2. Table definitions

**`parties`** — firm-level identity (a person or company the firm encounters), reusable across matters.
`id, organization_id→organizations, kind(person|company), name_he, id_number_he (nullable), contact jsonb, created_at, updated_at, archived_at (nullable), created_by (nullable), updated_by (nullable)`.
Holds no role, no client notes, no conflict/legal result. "Who someone is," never "what they do in a case."

**`matter_parties`** — the role a party plays in one matter (the relationship).
`id, organization_id, matter_id→matters, party_id→parties, role(client|opposing|related|witness|expert|counsel|mediator|insurer), notes_he (nullable), responsiveness (nullable), archived_at (nullable), created_at, updated_at, created_by (nullable)`.
Reuse across matters = another `matter_parties` row pointing at the same `parties.id`.

**`matter_facts`** — persisted factual statements, each with an epistemic status.
`id, organization_id, matter_id→matters, fact_key, statement_he, status, provenance jsonb, linked_document_id→matter_documents (nullable), created_at, updated_at, created_by (nullable)`.
`status ∈ {confirmed, client_alleged, opposing_alleged, document_derived, disputed, unknown}` — the Matter-domain legacy vocabulary that maps losslessly to canonical `EpistemicStatus`.

**`matter_deadlines`** — time obligations, distinct from hearings/court orders.
`id, organization_id, matter_id→matters, label_he, due_at (nullable), strict bool, basis_he (nullable), source(statute|court_order|contract|estimated|user_supplied), confidence(known|estimated|unknown), provenance jsonb, timezone, created_at, updated_at, created_by (nullable)`.

**`matters` additive columns** — `confidentiality(internal|client_confidential|privileged)` and `ai_policy(allowed|allowed_with_review|prohibited)`, both matter-level authoritative.

## 3. Constraints

- **Enums** via `CHECK` on `kind`, `role`, `status`, `source`, `confidence`, `responsiveness`, `confidentiality`, `ai_policy` — no free-text status columns anywhere.
- **Length bounds** on every Hebrew text field (`name_he ≤300`, `statement_he ≤4000`, `notes_he ≤4000`, `basis_he ≤2000`, `label_he ≤300`, `id_number_he ≤32`).
- **Party duplicate-role guard:** `unique (matter_id, party_id, role)` on `matter_parties`. A party may hold *different* roles in the same matter (role is in the key) but not the *same* role twice.
- **Party soft-dedup:** partial unique index `parties_org_idnum_active_uq` on `(organization_id, id_number_he)` where `id_number_he is not null and archived_at is null`. Because `id_number_he` is nullable and not globally unique, the guard only applies to *active* rows *with* an ID — never blocking legitimate intake of an ID-less party or a re-created archived one.
- **Deadline honesty:** `known ⇒ due_at not null` and `unknown ⇒ due_at is null`. No invented dates; no confident-but-dateless bar.
- **No destructive cascades on identity/relationships:** `matter_parties.party_id` and `matter_parties.matter_id` are plain FKs (no `on delete cascade`); `parties` has no delete policy at all. History is preserved by archiving, per the frozen rule. (`matter_facts`/`matter_deadlines` do cascade on `matter_id` — they belong to the matter's own lifecycle, not to a shared identity.)
- **Intake cannot confirm:** a `BEFORE INSERT` trigger rejects `status ∈ {confirmed, document_derived}` on `matter_facts`.

## 4. Indexes

`parties_org_idx (organization_id, archived_at)`; `parties_org_idnum_idx (organization_id, id_number_he) where not null`; the partial-unique dedup index above. `matter_parties_matter_idx (matter_id, role)` and `matter_parties_party_idx (party_id)` (the latter powers "every matter this party touches" — the reuse and future-conflict query). `matter_facts_matter_idx (matter_id, fact_key)`. `matter_deadlines_matter_idx (matter_id, due_at)`. All matter-scoped reads are covered by a leading-`matter_id` index.

## 5. RLS policies

All four tables: `enable row level security`, deny-by-default. `SELECT` = any active org member (`app.is_org_member(organization_id)`), so archived parties and archived assignments stay historically resolvable. `parties`, `matter_facts`, `matter_deadlines`: member `INSERT`/`UPDATE`. `matter_parties`: `INSERT`/`UPDATE` are **admin-gated** (`app.is_org_admin`) because who-is-in-a-case is sensitive — mirroring the Capability 1 treatment of `matter_members`. No table has a `DELETE` policy: removal is archive-only. The trusted write path is the server (`service_role` bypasses RLS); these policies are defense in depth.

## 6. Organization-consistency enforcement

Two `SECURITY DEFINER` `BEFORE INSERT OR UPDATE` triggers, so a cross-tenant parent id is *rejected* rather than silently read as "invisible":

- `app.enforce_child_matter_org()` on `matter_facts` and `matter_deadlines`: `row.organization_id` must equal `matters.organization_id`, and the matter must exist.
- `app.enforce_matter_party_org()` on `matter_parties`: all three org ids (row, matter, party) must be identical — the hard wall against cross-tenant party linking.

## 7. Ownership matrix (who is the single writer of each column)

| Data | Owner / write path |
|---|---|
| Party identity (`name_he`, `kind`, `id_number_he`, `contact`) | `parties` row only |
| Party ↔ matter role, `responsiveness`, per-matter `notes_he` | `matter_parties` row only |
| A factual statement + its epistemic `status` | `matter_facts` row only |
| Established status (`confirmed`/`document_derived`) | evidence gate (server), via UPDATE — never intake |
| Deadline date/confidence/source | `matter_deadlines` row only |
| Matter sensitivity + AI posture | `matters.confidentiality` / `matters.ai_policy` (authoritative) |
| Conflict result, score, narrative, posture, timeline | **nobody** — derived at load, never stored |

## 8. Source-of-truth matrix

Identity lives once in `parties`; a matter never re-describes a person. Role/notes/responsiveness live once in `matter_parties`; the party row never carries case context. A fact's truth-value lives once in `matter_facts.status`, expressed in the Matter vocabulary and converted to canonical `EpistemicStatus` at read time (no second copy). A deadline's date lives once in `matter_deadlines`; hearings and court orders (deferred) will reference — not duplicate — it. Matter-level `confidentiality`/`ai_policy` are authoritative; any future client-profile default must *propose* and never silently overwrite them.

## 9. Progressive intake flow (frozen sequence, informational — no UI in this slice)

Seven independently-saveable, resumable, permission-aware, fail-explicit, refresh-safe steps, each writing only its own table: (1) Parties, (2) Forum/procedure confirmation, (3) Material facts, (4) Deadlines, (5) Team & matter policy, (6) Initial evidence requirements, (7) Initial documents. Each step persists inputs immediately and never blocks on later steps; derived intelligence recomputes after any substantive input. It is deliberately not one giant form. This slice ships the *schema* those steps write to; the UI is a later slice.

## 10. Hydration mapping (DB row → app `Matter`)

`hydrateMatter` (in `matter-repository.ts`) gains four honest sources, replacing today's empty defaults:
- `matter_parties ⋈ parties (archived_at is null)` → the matter's client/opposing/other parties; if no `client` role exists, the honest "לקוח (טרם הוזן)" default stays.
- `matter_facts` → facts, each `status` passed through `fromMatterFactStatus` to canonical `EpistemicStatus` before the engines see it.
- `matter_deadlines` → deadlines; `due_at is null` renders as "מועד לא ידוע", never a fabricated date; `estimated` is labeled.
- `matters.confidentiality` / `ai_policy` → matter posture flags.
Intelligence/Score/Narrative/Posture/Timeline remain **derived** from these inputs at load. No stored derived state.

## 11. Validation rules

Enum/length/honesty constraints from §3 are enforced in the database. The server/API layer adds: `id_number_he` validated and formatted via the `israeli-id-validator` skill before insert (Teudat Zehut / company number); intake `status` restricted to the four unestablished values (DB trigger is the backstop); `due_at` only set when the user supplies or a rule derives a real date; `role`/`kind`/`source`/`confidence` checked against the same enums client-side for good UX, server-side for safety. Empty/whitespace Hebrew strings rejected (`char_length ≥ 1`).

## 12. Concurrency model

Every table carries `updated_at` maintained by a `BEFORE UPDATE` `app.touch_updated_at` trigger; the server uses optimistic concurrency (read `updated_at`, write conditionally) exactly as Capability 1 does. The party soft-dedup partial-unique index makes a duplicate active `(org, id_number)` a clean unique-violation rather than a race-created twin. `matter_parties`'s `unique (matter_id, party_id, role)` makes double role-assignment a unique-violation, not a duplicate row. Inserts are single-row and independent; there is no cross-row invariant that needs table locking.

## 13. Rollback plan

Embedded at the bottom of the migration: drop the four tables (`cascade`), drop the two `matters` columns (`drop column if exists`), drop the three `app.*` helper functions. Safe on a database holding no real Slice-2 data; take a backup first regardless. Capability 1 tables, the tenant model, `legal_*`, `audit_events`, and all storage buckets are untouched, so rollback cannot affect anything shipped earlier.

## 14. Security review

No secrets appear anywhere in the migration, and none are needed to author it. RLS is on for all four tables, deny-by-default, org-scoped. Cross-tenant writes are impossible on three independent layers: the org-consistency triggers, the FK targets, and the RLS `with check`. `matter_parties` writes are admin-gated. `SECURITY DEFINER` is used only on the two consistency triggers and set `search_path = public` (no injection surface; they only compare uuids). The intake-cannot-confirm trigger makes the epistemic wall a database guarantee. `contact`/`provenance` are `jsonb` inputs — the app must treat them as untrusted on render (no HTML execution), consistent with existing note handling. Israeli-ID handling routes through the `israeli-id-validator` skill; privacy posture (Amendment 13, PPL) is unchanged since parties are org-private and RLS-isolated — a fuller DPIA belongs with the intake-UI slice, not the schema.

Required RLS/behavior tests (to run on the Development project *after* approval to apply):
1. cross-tenant party `SELECT` denied; 2. cross-tenant `matter_parties` link rejected by the org-consistency trigger; 3. a member without matter access still cannot infer assignments beyond org scope; 4. org member can read permitted org parties (active and archived); 5. only an org admin can create/update a role assignment; 6. an archived party remains historically resolvable through its `matter_parties` rows; 7. intake `INSERT` with `status='confirmed'` (and `='document_derived'`) is rejected; 8. deadline provenance retained and `known⇒date` / `unknown⇒no-date` enforced; 9. anonymous role denied on every table; 10. child `organization_id` mismatch rejected on `matter_facts` and `matter_deadlines`.

## 15. Performance review

Every hot path is matter-scoped and index-covered (`matter_id` leads each child index). Party reuse and the future conflict query are served by `matter_parties_party_idx`. The partial unique/dedup indexes are small (only active, only ID-bearing rows). No trigger does more than one or two point lookups by primary key. No full-table scans on any expected query. `jsonb` columns are stored inline and never indexed in this slice (no GIN needed yet). Write amplification is one trigger chain per row, matching Capability 1. At the firm scale in the 10-year model (tens of thousands of matters, low-hundreds of parties per firm) these access patterns stay index-bound.

## 16. Exact diff from the previous Slice 2 proposal

The earlier draft modeled parties as a **single `matter_parties` table** carrying identity *and* role together. The Domain Model Review (recommendation B) changed exactly one structural thing: **identity must be firm-level.** The delta:

- **Split into two tables.** Identity fields (`kind`, `name_he`, `id_number_he`, `contact`) move out of `matter_parties` into a new org-level **`parties`** table. `matter_parties` keeps only the relationship (`party_id`, `role`, `notes_he`, `responsiveness`) plus a new `party_id` FK.
- **Reuse across matters** becomes possible (multiple `matter_parties` rows → one `parties.id`) — the whole point of the adjustment; conflict-of-interest and cross-matter reuse no longer force a later redesign.
- **New org-consistency trigger** `enforce_matter_party_org` checks *three* org ids (row/matter/party) instead of two, because a second parent (party) now exists.
- **Party dedup guard** (`parties_org_idnum_active_uq`) and `archived_at` on `parties` are new — identity is long-lived and archived, never deleted.
- **Everything else is unchanged** from the previously-approved direction: `matter_facts`, `matter_deadlines`, the additive `matters` columns, the epistemic vocabulary and the intake-cannot-confirm rule, the progressive-intake sequence, and the deferred roadmap all stand exactly as approved.

---

### One decision I made that I want you to confirm or override

The frozen field list did not fix the **defaults** for the two additive `matters` columns or add `archived_at` to `matter_parties`. I chose protective, reversible defaults and one small rule-driven addition; each is a one-line change if you disagree:

1. `matters.confidentiality` defaults to **`client_confidential`** (not `internal`) — the safer default for a law firm, and it backfills existing rows protectively.
2. `matters.ai_policy` defaults to **`allowed_with_review`** — AI usable but human-reviewed by default.
3. I added **`archived_at` to `matter_parties`** (it was not in the enumerated field list) so a wrongly-assigned role can be *archived* rather than deleted — honoring the "prefer archive over delete / no history destruction" rule at the relationship level, not only the identity level.

Awaiting your review. I will not apply, commit, or push until you approve.

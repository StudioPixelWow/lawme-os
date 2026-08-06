# Canonical Legal Data Model (CLDM) — Overview

> **Status: planning-only architecture.** This document set defines the target
> data model that every future LawME collector maps *into*. It creates no code,
> no migrations, no tables, and no schema changes. It is the contract that keeps
> collectors from each inventing their own shape. Nothing here is implemented.

Prior work this builds on (do not repeat): Legal Source Registry, National
Platform Registry, CKAN Qualification, Knowledge Coverage Map, Gap Analysis,
Collector Prioritization. No further discovery, audit, or collector work is part
of this Epic.

## Documents in this set

| # | Document | Contents |
|---|---|---|
| 00 | `00-overview.md` | Principles, the Canonical Envelope, identifier scheme, cross-cutting decisions. |
| 01 | `01-entity-catalog.md` | Every entity across the 7 domains: purpose, fields, relationships, search, AI. |
| 02 | `02-relationship-catalog.md` | Every edge, cardinality, direction, versioning behavior. |
| 03 | `03-identity-resolution.md` | How the same real-world thing from many sources is unified. |
| 04 | `04-provenance.md` | The provenance block carried by every record and assertion. |
| 05 | `05-versioning.md` | When a new version / update / snapshot / diff is created. |
| 06 | `06-search-and-ai.md` | Full-text, structured, vector search per entity; AI-derived metadata. |
| 07 | `07-collector-mapping.md` | How CKAN / Knesset OData / Court feed / Regulatory APIs normalize in. |
| 08 | `08-risks-and-open-decisions.md` | Architectural risks and decisions required before implementation. |

## Design principles (binding on the whole model)

1. **Source-agnostic.** No entity has a field that exists only because one source
   provides it. Source-specific data lives in provenance and in a typed
   `source_extras` bag (see below), never as first-class canonical columns.
2. **Versionable.** Every substantive entity is an *immutable version chain*: a
   stable canonical identity plus an ordered series of immutable versions. The
   "current" view is a pointer, not a mutable row.
3. **Extensible.** New domains, entity types, relationship types, and AI
   derivations can be added without altering existing entities. Enumerations are
   modeled as controlled reference entities (see the Reference domain), not as
   hard-coded database enums.
4. **Immutable where appropriate.** Primary-source facts (the text of a judgment,
   the wording of a law section as published) are write-once. Derived and
   resolved data (identity links, AI summaries, topic tags) are mutable but
   versioned and always attributed.
5. **PostgreSQL-compatible.** Every construct maps to Postgres primitives:
   `uuid`, `jsonb`, `tstzrange`, `text`, arrays, foreign keys, partial indexes.
   No feature assumed that Postgres cannot express.
6. **Vector-search-compatible.** Each entity nominates *vector candidate fields*;
   embeddings live in a separate `embedding` companion keyed by (entity, version,
   field, model) so re-embedding never mutates the source record.
7. **Graph-traversal-compatible.** All relationships are first-class, directional,
   typed edges with their own identity and provenance — so the model is a
   property graph over relational storage, traversable without schema surgery.
8. **AI-pipeline-compatible.** Every AI-derived artifact is a separate,
   attributed, versioned record pointing at the exact source version it was
   derived from — never written back onto the primary entity.
9. **Full-text-search-compatible.** Each entity declares its FTS fields and
   language (Hebrew-first, `tsvector` with a Hebrew configuration; Arabic and
   English secondary), separate from structured filter fields.

**Do not model to a specific source.** CKAN, Knesset OData, court feeds and
regulator APIs are *inputs*; they map onto this model, never the reverse.

## The three layers

The model separates three concerns that are frequently (and wrongly) merged:

- **Identity layer** — the stable, source-agnostic *thing* (a Case, a Judge, a
  Law). Bears the canonical identifier. Never carries content directly.
- **Version/content layer** — immutable snapshots of that thing's state as
  asserted at a point in time, each with its own provenance.
- **Assertion/derivation layer** — everything *said about* the thing:
  relationships, identity links, AI outputs, classifications. Each assertion is
  independently attributed and revisable without touching identity or content.

This separation is what makes the model simultaneously immutable (content),
mutable (assertions), versionable (all layers), and multi-source (many
provenances per identity).

## The Canonical Envelope (carried by every entity)

Every canonical entity — in every domain — shares one common envelope. Defining
it once keeps the per-entity catalog focused on what is *distinctive*. When the
catalog says an entity "carries the Envelope," it means all of the following,
without restating them:

### Identity block
- `canonical_id` — **canonical identifier**: an opaque, system-minted UUID.
  Stable for the life of the real-world entity. Never derived from source data,
  so no source can "own" or collide on it.
- `entity_type` — the entity's type within its domain (e.g. `judicial.case`).
- `external_ids[]` — **external identifiers**: an ordered set of
  `{scheme, value, source_ref, confidence, asserted_at}` tuples. Examples of
  schemes: `net_hamishpat_case_no`, `knesset_law_id`, `ckan_dataset:resource`,
  `company_registrar_no`, `isa_decision_no`, `doi`, `ecli`-style national
  citation. This is how one canonical entity binds to its many source keys.
- `slug` — optional human-stable handle for URLs/citation (derived, versioned).

### Provenance block (detailed in `04-provenance.md`)
Every entity **and every version and every assertion** carries: `source_platform`,
`source_publisher`, `source_dataset`, `source_resource`, `source_url`,
`first_seen`, `last_verified`, `extraction_method`, `parser_version`,
`confidence`. Provenance is per-assertion, not per-entity, because a single
canonical entity is typically assembled from multiple sources.

### Versioning block (detailed in `05-versioning.md`)
- `version_no` — monotonic integer per canonical identity.
- `valid_time` — `tstzrange` for when the asserted state is *true in the world*
  (bitemporal: distinct from when we *recorded* it).
- `system_time` — `tstzrange` for when the record was believed by the system.
- `supersedes` / `superseded_by` — links along the immutable version chain.
- `is_current` — computed pointer to the head version.
- `change_kind` — `new_version | correction | snapshot | diff` (see 05).

### Quality block
- `confidence` — 0..1, the model's confidence in *this record's* correctness,
  distinct from the source's authority.
- `verification_status` — `unverified | machine_verified | human_verified |
  disputed`. **Default is `unverified`; nothing is presented as authoritative
  legal content until verified** (LawME rule: every legal claim needs a primary
  or licensed source).
- `lifecycle_state` — `draft | active | superseded | retracted | deleted_tombstone`.

### Extension block
- `source_extras` — a typed, namespaced `jsonb` bag for source-specific fields
  that have no canonical home. **Read-only to the canonical layer**; it exists so
  collectors never have to widen the canonical schema. Promotion of a field from
  `source_extras` to a canonical field is a deliberate, reviewed model change.

## Identifier scheme

- **Canonical IDs** are UUIDv4/v7, minted by LawME, never by a source.
- **External IDs** are namespaced `scheme:value`. The scheme registry lives in
  the Reference domain (`document_source` / a controlled `id_scheme` list) so new
  schemes are added as data, not as code.
- **Citations** (a first-class Judicial entity) are *not* identifiers; a citation
  string resolves *to* a canonical entity via `external_ids` + identity
  resolution, and unresolved citations are retained as dangling references (see
  `03-identity-resolution.md`).

## Entity domains (full catalog in `01`)

Judicial · Legislation · Regulatory · Registry · Government · Academic ·
Reference. The Reference domain is cross-cutting: its entities (Topic, Keyword,
Legal Domain, Organization, Person, Location, Document Source) are referenced by
every other domain and are where controlled vocabularies live.

## What is deliberately NOT in this model

- No source-specific tables or columns (only `source_extras` + provenance).
- No physical storage decisions (partitioning, index DDL) — those belong to the
  implementation Epic, guided by the Search Strategy.
- No AI outputs themselves — only the *shape* of where they will live.
- No migrations, no code. This is the map, not the territory.

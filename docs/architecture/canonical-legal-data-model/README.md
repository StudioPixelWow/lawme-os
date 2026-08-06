# Canonical Legal Data Model (CLDM) — LawME

The unified, source-agnostic data model that **every future LawME collector maps
into**. Planning-only architecture: no code, no migrations, no tables, no schema
changes, no collectors. This is the contract all collectors build against.

## Read in order

1. [`00-overview.md`](00-overview.md) — principles, the Canonical Envelope,
   identifier scheme, the three layers (identity / version / assertion).
2. [`01-entity-catalog.md`](01-entity-catalog.md) — **47 entities** across 7
   domains: purpose, fields, relationships, search, AI, validation.
3. [`02-relationship-catalog.md`](02-relationship-catalog.md) — every typed edge,
   cardinality, versioning behavior; the judicial spine.
4. [`03-identity-resolution.md`](03-identity-resolution.md) — unifying the same
   judge/law/court/company/person/case across sources.
5. [`04-provenance.md`](04-provenance.md) — per-assertion provenance, license/rights
   propagation, verification lineage, reproducibility.
6. [`05-versioning.md`](05-versioning.md) — bitemporal version chains;
   new_version / correction / snapshot / diff.
7. [`06-search-and-ai.md`](06-search-and-ai.md) — FTS/structured/vector search;
   the separate AI-derivation layer.
8. [`07-collector-mapping.md`](07-collector-mapping.md) — CKAN / Knesset OData /
   Court feed / Regulatory → canonical; conformance checklist.
9. [`08-risks-and-open-decisions.md`](08-risks-and-open-decisions.md) —
   architectural risks and decisions required before implementation.

## The model in one breath

A stable **canonical identity** (system-minted UUID) + an ordered chain of
**immutable versions** (bitemporal) + a mutable, attributed **assertion layer**
(relationships, identity links, AI outputs). Everything carries the **Canonical
Envelope** (identity, provenance, versioning, quality, extension). Source-specific
data lives only in provenance and a typed `source_extras` bag — never as canonical
columns. Primary legal text is write-once; corrections append; AI is a separate,
grounded, unverified-by-default layer that never overwrites the source.

## Entity count by domain

| Domain | Entities |
|---|---|
| Judicial | Case, Decision, Proceeding, Court, Judge, Panel, Party, Attorney, Citation, Opinion, Holding (11) |
| Legislation | Law, Section, Chapter, Amendment, Regulation, Order, Bill (7) |
| Regulatory | Authority, Regulatory Decision, Circular, Guideline, Enforcement Action (5) |
| Registry | Company, Nonprofit, Partnership, Patent, Trademark, Trust, Estate (7) |
| Government | Ministry, Government Decision, Committee, Procedure, Directive (5) |
| Academic | Article, Commentary, Thesis, Journal, Opinion (5) |
| Reference | Topic, Keyword, Legal Domain, Organization, Person, Location, Document Source (7) |
| **Total** | **47** |

The Reference domain is cross-cutting: Organization and Person are identity
**hubs** that Company/Nonprofit/Ministry/Authority/Court/Journal and
Judge/Attorney/author/officer specialize, so identity resolution has a single
place to unify.

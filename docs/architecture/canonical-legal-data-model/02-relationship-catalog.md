# CLDM — Relationship Catalog

Relationships are **first-class, typed, directional edges**, each with its own
identity, provenance, versioning, and confidence (they carry a reduced Envelope).
This makes the model a property graph over relational storage: an edge can be
asserted by one source, corrected by another, retracted, or time-bounded, without
touching the entities it connects.

## Edge record shape (planning)

Every edge conceptually holds: `edge_id` (canonical), `type` (from the registry
below), `from` ref, `to` ref, `valid_time` range, `provenance` block,
`confidence`, `assertion_status` (`asserted | resolved | inferred | disputed |
retracted`), and optional `qualifiers` jsonb (e.g. citation `treatment`, party
`role`, panel `presiding`). Edge *types* live in the Reference domain as
controlled values, so new relationship types are added as data.

**Inference provenance rule.** An edge produced by AI/heuristics is
`assertion_status = inferred` with the model/parser in provenance and confidence
< 1; it never masquerades as a source-asserted fact. Human review promotes it to
`resolved`.

## Core relationship types

### Judicial spine (the founder's example path)
```
Case ──hasDecision──▶ Decision ──appliesLaw──▶ Section ──partOf──▶ Law
  │                      │  └─cites──▶ Citation ──to──▶ Decision | Section
  │                      ├─decidedBy──▶ Panel ──composedOf──▶ Judge ──isA──▶ Person
  │                      ├─containsOpinion──▶ Opinion ──authoredBy──▶ Judge
  │                      └─hasHolding──▶ Holding ──interpretsSection──▶ Section
  ├─heardBy──▶ Court ──partOf──▶ Court(parent) ──locatedIn──▶ Location
  ├─hasParty──▶ Party ──isEntity──▶ Person | Organization | Company
  │                └─representedBy──▶ Attorney ──worksAt──▶ Organization
  └─aboutTopic──▶ Topic ──inDomain──▶ Legal Domain
```

### Full edge table

| Type | From → To | Card. | Versioned? | Qualifiers |
|---|---|---|---|---|
| hasDecision | Case → Decision | 1:N | append | — |
| hasProceeding | Case → Proceeding | 1:N | append | event_type |
| heardBy | Case → Court | N:1 | mutable | — |
| onAppeal | Case → Case | N:M | append | direction(from/to) |
| hasParty | Case → Party | 1:N | append | role |
| isEntity | Party → Person/Org/Company | N:1 | resolved | — |
| representedBy | Party → Attorney | N:M | append | — |
| decidedBy | Decision → Panel/Judge | N:1 | fixed | — |
| composedOf | Panel → Judge | 1:N | fixed | presiding |
| appliesLaw | Decision → Section | N:M | append | pinpoint |
| cites | Decision/Opinion → Citation | 1:N | append | — |
| citationTarget | Citation → Decision/Section/Regulation/Article | N:1 | resolved | treatment |
| containsOpinion | Decision → Opinion | 1:N | fixed | opinion_type |
| authoredBy | Opinion/Decision → Judge | N:1 | fixed | — |
| hasHolding | Decision → Holding | 1:N | append | holding_type |
| interpretsSection | Holding → Section | N:M | append | — |
| sitsOn | Judge → Court | N:M | mutable | valid_time |
| isA (person-role) | Judge/Attorney → Person | N:1 | resolved | — |
| hasSection | Law → Section | 1:N | versioned | — |
| hasChapter | Law → Chapter | 1:N | versioned | — |
| amendedBy | Law/Section → Amendment | N:M | append | — |
| producesVersion | Amendment → Section | 1:N | append | change_kind |
| originatedFrom | Law → Bill | N:1 | fixed | — |
| becameLaw | Bill → Law | 1:1 | fixed | — |
| underLaw | Regulation/Order → Law | N:1 | mutable | — |
| administeredBy | Law → Ministry | N:1 | mutable | valid_time |
| issues | Authority/Ministry → Reg.Decision/Circular/Guideline/Directive/Gov.Decision | 1:N | append | — |
| basedOn | Reg.Decision/Enforcement → Law/Section | N:M | append | — |
| affects | Reg.Decision/Enforcement → Company/Person/Org | N:M | append | — |
| appealedIn | Reg.Decision/Enforcement → Case | N:1 | append | — |
| supersedes | (self, many types) → same type | N:1 | append | — |
| hasOfficer | Company/Nonprofit → Person | 1:N | mutable | role, valid_time |
| hasPartner | Partnership → Person/Company | 1:N | mutable | valid_time |
| ownedBy | Patent/Trademark → Company/Person | N:1 | mutable | valid_time |
| concernsPerson | Estate → Person | N:1 | resolved | role(deceased/heir) |
| specializedBy | Organization → Company/Nonprofit/Ministry/Authority/Court/Journal | 1:1 | resolved | — |
| partOf | (Org/Court/Ministry/Committee/Topic/Location/Legal Domain) → same | N:1 | mutable | — |
| hasMember | Committee → Person | 1:N | mutable | valid_time |
| reviews | Committee → Bill | N:M | append | — |
| writtenBy | Article/Thesis/Commentary/Ac.Opinion → Person | N:M | fixed | order |
| inJournal | Article → Journal | N:1 | fixed | — |
| annotates | Commentary → Law/Section/Decision | N:1 | append | — |
| discusses | Article/Ac.Opinion → Decision/Law | N:M | inferred/append | — |
| aboutTopic | (many) → Topic | N:M | append/inferred | confidence |
| taggedKeyword | (any) → Keyword | N:M | inferred | frequency |
| inDomain | Topic/Law/Authority → Legal Domain | N:M | mutable | — |
| backs | Document Source → (content entity) | 1:N | fixed | — |
| locatedIn | (Org/Court/…) → Location | N:1 | mutable | — |

Cardinality legend: `fixed` = set at creation, immutable; `append` = new edges
added over time, old ones retained; `mutable` = current value changes but history
kept via valid_time; `resolved` = created/updated by identity resolution;
`versioned` = follows the version chain of the parent content.

## Traversal guarantees (for the future graph layer)

- **Point-in-time traversal.** Because every edge carries `valid_time`, the graph
  can be walked "as of" any date (e.g. which sections a Law had, and which
  minister administered it, on the decision date).
- **Provenance-filtered traversal.** A query can restrict to edges of a minimum
  confidence or to `verification_status ≥ machine_verified` — so an AI pipeline
  can reason only over trusted edges.
- **No orphan deletes.** Retiring an entity tombstones it and marks incident edges
  `retracted`; edges are never hard-deleted (audit + reproducibility).

## Anti-patterns (explicitly disallowed)

- No untyped/generic "related_to" edge except the curated `Topic.relatedTo`.
- No relationship encoded as a string field on an entity (always an edge record).
- No cross-domain foreign key that bypasses the Person/Organization hubs (party
  persons, officers, judges all resolve through the hubs, never point-to-point).

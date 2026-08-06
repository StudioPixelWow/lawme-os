# Knesset Publication → Canonical Model Mapping

How a validated `GetLegislationLawItem` maps into the Canonical Legal Data Model
as a Law plus its official publication documents and amendment graph
(`publication-model.ts`), and how those persist to `legalai` on dev.

## Entities

| Source | Canonical entity | Key |
|---|---|---|
| Law | `Law` (canonical_entities, entity_type='Law') | `knesset:<IsraelLawID>` |
| Each publication row | `GovernmentDocument` → `legalai.law_publications` | `knesset:publication:<itemId>` |
| Amendment relationships | `legalai.law_publication_edges` | `(edge_type, from_id, to_id)` |

Each publication is modeled as `DocumentSource` / `DocumentVersion` /
`GovernmentDocument`. Every publication document is labelled, invariantly:

```
content_level        = full_text        (metadata_only until the PDF is extracted)
consolidation_status = non_consolidated_publication
authority_level      = primary_official
```

The consolidation label is safety-critical: **a publication row is never marked
`consolidated_current_text`**. A DB CHECK
(`law_publications_no_publish_as_consolidated_chk`) plus a pinned
`consolidation_status` default enforce this; the RAG authority policy
(`docs/rag/legislation-authority-policy.md`) enforces it at serving time.

## Classification (`classifyCorrection`)

```
original_enactment   the earliest direct (ישיר/unmarked) publication whose date
                     matches the law's first publication date
amendment_law        an indirect (עקיף) amendment via another (omnibus) law
correction           a direct (ישיר) correction of this law
repeal_publication    name indicates ביטול / repeal
official_gazette_pdf  a gazette PDF that fits no narrower class
```

Because the API returns publications **newest-first**, the model sorts the chain
chronologically before assigning `chain_index` and detecting the original
enactment (never an עקיף omnibus row).

## Amendment graph (`buildAmendmentGraph`)

```
Publication          --publishes--> Law           (original enactment)
AmendmentPublication --amends-----> Law
AmendmentPublication --follows----> PreviousPublication   (chronological chain)
RepealPublication    --repeals----> Law
```

- `follows` self-loops are skipped (guards the duplicate-itemId edge case).
- `--modifies--> Section` edges are **intentionally not emitted here**: they
  require textual evidence from the amendment-operation parser run over the
  extracted PDF text (see `knesset-amendment-parser.md`), never an LLM diff.
- **Omnibus / many-to-one:** an עקיף publication that amends several laws is one
  `law_publications` row (its `law_canonical_id` column shows the first-linked
  law) with an `amends` edge to **each** law. For multi-law questions the
  **edges are the source of truth**, not the denormalized `law_canonical_id`
  column. Verified live: ס״ח 3016 (itemId 2199304) → `amends` both חוק שמאי
  מקרקעין (2000015) and חוק תרומת ביציות (2000031).

## Additive schema

`supabase/migrations/20260806180000_law_publications.sql` adds
`legalai.law_publications` and `legalai.law_publication_edges` (additive; RLS
deny-by-default, service-role only; applied to dev 2026-08-06). New additive
fields requested by the Epic are all present: `publication_type`,
`publication_number`, `publication_page`, `correction_number`,
`consolidation_status`, `authority_level`, `effective_date_status`,
`openbook_status`. The Canonical Model itself was **not** altered.

## Persistence & idempotency

All inserts are `ON CONFLICT DO NOTHING` on the deterministic keys, so re-runs
are no-ops. Verified on dev: re-inserting existing rows left counts unchanged
(33 publications / 60 edges / 8 laws). The two real key collisions in the pilot
(omnibus itemId 2199304 across two laws; error-correction itemId 147021) collapse
to a single stored publication each — expected, and surfaced in the pilot's
`dataQuality` block rather than hidden.

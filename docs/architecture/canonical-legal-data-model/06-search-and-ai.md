# CLDM — Search Strategy & AI Metadata Strategy

Two companion layers that sit *beside* the canonical entities, never inside them:
a search-projection layer and an AI-derivation layer. Both point at exact source
versions and both are rebuildable from the canonical + provenance data.

## Part A — Search Strategy

Each entity (see `01`) declares four field roles. They are modeled separately so
that free-text, filtering, ranking, and semantic search never contend on the same
column.

| Role | Purpose | Postgres realization (planning) |
|---|---|---|
| **Full-text fields** | Human language to match on. Hebrew-first. | `tsvector` with a Hebrew text-search configuration; Arabic + English secondary configs; per-language columns. |
| **Structured fields** | Typed values displayed/returned. | Native columns / `jsonb`. |
| **Filterable fields** | Narrowing predicates. | B-tree / GIN indexes; `valid_time` via GiST range indexes. |
| **Sortable fields** | Ranking keys (date, court level, confidence). | B-tree indexes. |
| **Vector candidate fields** | Text worth embedding for semantic search. | See embeddings companion below. |

### Full-text principles
- **Hebrew-first tokenization** with normalization for niqqud, final letters,
  and prefix particles (ו/ה/ב/ל/כ/מ/ש). Arabic for Sharia-court/relevant content;
  English for academic/international.
- FTS operates on the **current version by default**, with an option to search
  historical versions (point-in-time) via `valid_time` filters.
- Long documents (Decisions, Articles) are FTS-indexed at the document level and
  **chunk-indexed** for retrieval granularity (chunk = section/paragraph, keyed
  to the parent version).

### Vector / semantic search
- Embeddings live in a **separate `embedding` companion**, keyed by
  `(entity_type, canonical_id, version_no, field, chunk_no, model, model_version)`.
- Re-embedding with a new model appends rows; it never mutates the source entity
  and never invalidates old vectors (needed for reproducibility of past results).
- Vector candidate fields per entity are named in `01` (typically title + summary
  + body chunks). Registry/structured entities usually have *no* vector fields.
- Hybrid retrieval (BM25/FTS + vector) is expected; the model supplies both
  projections so the retrieval layer can fuse them.

### Cross-entity search surface
A unified search view projects heterogeneous entities into a common shape
(`canonical_id`, `entity_type`, `display_title`, `snippet`, `date`, `domain`,
`confidence`, `verification_status`) so one query can span judgments, laws, and
regulatory decisions, then drill into the typed entity. Results are filterable by
`verification_status` so unverified content can be excluded from authoritative
answers.

## Part B — AI Metadata Strategy

Every AI-derived artifact is a **separate, attributed, versioned record** that
references the exact source entity version it was derived from. **AI output is
never written back onto the primary entity** and is `unverified` until reviewed.

### The derivation record (planning shape)
`derivation_id` (canonical), `derived_from` ref(entity + version), `kind` (below),
`payload` (jsonb / text / structured), `model`, `model_version`, `prompt_version`,
`generated_at`, `confidence`, `verification_status`, provenance. Superseding a
derivation appends a new one (versioned like everything else).

### Derivation kinds by entity

| Entity class | Likely AI derivations |
|---|---|
| Decision / Opinion | Summary, holdings, key issues, disposition, cited-authorities graph, legal-topic tags, timeline, risk indicators. |
| Case / Proceeding | Procedural timeline, posture label, outcome prediction *(clearly non-authoritative)*. |
| Law / Section / Amendment | Plain-language summary, defined-terms, cross-references, amendment-diff summary, impact analysis. |
| Regulatory / Government decision | Summary, obligation & deadline extraction, sanction/penalty severity, risk indicators. |
| Registry entities | Entity-resolution candidates, litigation/enforcement risk flags. |
| Academic | Summary, topic tags, cited-authorities extraction. |
| Reference (Person/Org) | Disambiguation/merge candidates. |

### Hard rules for the AI layer
1. **Attribution.** Every derivation names its model, version, and source version.
2. **No authority laundering.** AI summaries/holdings are `unverified` and labeled
   as machine-generated until human review; they never become the primary text.
3. **Grounding.** Derivations must cite the source spans they rest on (offsets
   into the immutable content) so claims are checkable — matches the LawME rule
   that every legal claim needs a primary/licensed source.
4. **Reproducibility.** Because source content is immutable and hashed, and the
   derivation records model+prompt versions, any AI output is reproducible and
   diffable across model upgrades.
5. **Separation.** Embeddings (Part A) and semantic derivations (Part B) are
   distinct companions; neither is a canonical field.

# POC Retrieval Design

## Hybrid formula (deterministic, explainable, key-free)

```
final = 0.40·lexical + 0.25·vector + 0.18·authority + 0.10·trust + 0.07·freshness
```
Every result ships its full `score_breakdown` — a ranking that cannot be
explained cannot be trusted by a lawyer.

### Components
1. **Lexical (BM25)** — k1=1.4, b=0.75, over paragraph-window chunks;
   Hebrew final-letter folding (ץ→צ …); same tokenizer at index and query
   time; mirrors the future Postgres FTS('simple') + pg_trgm plan.
2. **Vector (mock)** — 256-d trigram-hash embeddings, deterministic,
   L2-normalized cosine. Honest framing: lexical-similarity proxy, NOT
   semantics. Capped at 25% weight, and results require lexical>0 or
   cosine>0.18 (relevance gate) so vector noise can't hallucinate hits.
3. **Authority** — rule-derived from court hierarchy: legislation 1.0 ·
   Supreme 1.0 · National Labor 0.85 · District/Regional 0.6 · guidance
   0.55 · secondary 0.3 · unknown 0.4 (never rewarded).
4. **Trust** — source-tier weight from the trust model (tier 1-2 → 1.0,
   explanatory 0.5).
5. **Freshness** — age decay with a floor of 0.4: old precedent may be
   the binding one — authority carries that, freshness only nudges.

### Then
Metadata filters (type/domain/date/court) → relevance gate → sort →
**diversification** (max 2 passages per document) → optional
`binding_first` stable re-sort.

## Controlled Hebrew expansion
A closed 17-entry employment dictionary (`research/expansion.ts`) — every
expansion is reviewable code, logged per run (`matchedNotes`). No model
rewrites the user's query. Extending the dictionary is benchmark-driven
(two benchmark failures → two dictionary entries in this very task).

## EmbeddingProvider abstraction
`MockEmbeddingProvider` (shipped) · `UnapprovedProviderPlaceholder`
(throws — no code path can silently call paid APIs). Real-model selection
is a founder decision informed by hebrew-llm-eval-suite; vectors are
model+version stamped and marked stale on model change (re-embedding is a
tracked migration).

## Chunking
`paragraph-window-v1`: ≤1200 chars, 1-block overlap, chunk inherits its
first block's anchor → every retrieved passage is pinpoint-citable.

## Migration to Postgres (applied later)
BM25 → `ts_rank` over the generated `fts` column + `pg_trgm` similarity;
vector → pgvector cosine (ANN index when a real model fixes dimensions);
weights/gates/diversification stay in the application ranker — same
formula, same breakdown, same tests.

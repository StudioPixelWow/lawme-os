# LawME — Legal Knowledge Graph Architecture

**Status: architecture only (Epic 0, Phase 10). No storage provisioned.**
Machine-readable definitions: `legal-graph-entities.json` (22 entity
types) and `legal-graph-relations.json` (24 relation types + mandatory
edge metadata).

## Purpose
The graph is LawME's connective tissue: it turns isolated documents into
precedent networks, statutes into version chains, and firm matters into
subscribers of legal change. It powers the citator (Phase 11), graph
retrieval (research pipeline step 8), contradiction surfacing, and
matter-impact notification.

## Layered design

```
Layer 4  MATTER LAYER (firm-private, RLS)     matter ← affects_matter — judgments/statutes
Layer 3  INFERENCE LAYER (labeled inference)  applies/distinguishes/limits/conflicts_with…
Layer 2  CITATION LAYER (rule-derived)        cites/cited_by, amends/repeals, version chains
Layer 1  DOCUMENT LAYER (unified schema)      judgments, legislation, guidance, firm docs
Layer 0  REFERENCE LAYER (curated)            courts, procedures, judges, practice areas
```

- **Layer 2 is deterministic**: citation parsing + legislation-DB
  metadata. High confidence, no model in the loop.
- **Layer 3 is model-assisted**: treatment classification (follows/
  distinguishes/overturns…), issue linking, similarity. Every edge is
  `inference`-labeled until verified; `overturns` and `conflicts_with`
  require human review before being surfaced as fact (trust model rules).
- **Layer 4 never leaves the firm tenancy** and is the only layer joined
  to clients/matters.

## Edge governance (the non-negotiables)
Every edge carries: `confidence` (0–1), `provenance` (parser version /
model version / human reviewer / licensed metadata source), an
`evidence_anchor` into the source document, `created_at`, `verified`
boolean and a trust-model `label`. Consequences:
1. No edge without provenance — an unattributable edge is deleted, not
   trusted.
2. Confidence 1.0 is reserved for rule-derived or human-verified edges.
3. `related_to` (embedding similarity) is confidence-capped at 0.7 and
   can never be the sole path justifying an authority claim.
4. Licensed metadata (e.g. future Nevo citator data) is tagged as such
   and physically separable — license termination = clean removal.

## Entity resolution
- **Cases**: normalized case-number grammar (procedure code + serial +
  year + court) is the join key; the normalizer is a deterministic
  library with a golden test set (benchmark category: citation tasks).
- **Judges/lawyers/parties**: conservative resolution — merge only on
  strong signals (same court + same spelling variants); otherwise keep
  distinct nodes with `related_to`. Anonymized parties (פלוני/פלונית) are
  never resolved.
- **Organizations**: resolved against companies/amutot registries
  (data.gov.il, daily refresh) by registry number when present.
- **Statutes/sections**: resolved against the National Legislation DB
  identity + version date.

## Storage strategy (decision deferred, options assessed)
| Option | Fit |
|---|---|
| **Postgres (Supabase) relational edges** — `graph_edges(from_id, to_id, type, metadata jsonb)` + recursive CTEs | ✅ Recommended start: same RLS story as the rest of LawME, zero new infra; citation graphs are shallow (2–3 hops) |
| pgvector for `related_to` similarity | ✅ pairs with the same Postgres |
| Dedicated graph DB (Neo4j/Memgraph) | Later, only if hop-depth/scale demands it; adds infra + RLS impedance |

The graph works on the SAME rows as `document_citations` in the unified
schema — the citation layer is not a copy, it is a view over document
data. Inference edges live in their own table with the metadata contract.

## Scale expectations (from registry research)
~751k Supreme Court verdicts exist in open form; millions of lower-court
decisions in commercial DBs. POC scope (Phase 19) targets one domain
(~10⁴ documents, ~10⁵ edges) — comfortably relational.

## Query patterns the design must serve
1. "Cases citing X, by treatment, newest first" (citator core)
2. "Is section Y still in force at date D?" (version chain walk)
3. "Authorities for issue Z in labor courts since 2020, binding first"
4. "Which of OUR matters are affected by this new judgment?" (Layer 4)
5. "Contradictions inside my retrieved source set" (conflicts_with)
6. "What does this draft rely on, and is every reliance verified?"
   (derived_from + verified_against provenance walk)

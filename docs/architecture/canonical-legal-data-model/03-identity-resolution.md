# CLDM — Identity Resolution Design

The problem: the same real-world thing — a judge, a law, a court, a company, a
person, a case — arrives from multiple sources under different keys, spellings,
and granularities. Identity resolution unifies them onto **one canonical
identity** without destroying the source assertions. This is design only; nothing
here is implemented.

## Governing principles

1. **Canonical identity is minted, never borrowed.** A resolution links source
   records to a system UUID; it never elevates a source key to the canonical key.
2. **Resolution is an assertion, not a fact.** Every link (`same_as`) is a
   versioned, attributed, confidence-scored assertion that can be split or merged
   later. Merges are reversible.
3. **Non-destructive.** Merging two candidates does not delete either source
   record; both keep their provenance and both point at the surviving canonical
   identity via `external_ids`.
4. **Fail-safe.** When confidence is below the auto-merge threshold, the system
   creates a **review candidate**, not a merge. Uncertain identity never silently
   collapses two distinct entities.
5. **Blocking before matching.** Candidate generation uses cheap blocking keys
   (normalized name + type + jurisdiction) to avoid all-pairs comparison at scale.

## Resolution pipeline (per entity type)

```
raw source record
  → normalize (names, dates, numbers, Hebrew niqqud/spelling, org suffixes)
  → derive blocking key(s)
  → gather candidates sharing a blocking key
  → score each candidate pair (deterministic + probabilistic features)
  → decide: auto-link | review-candidate | new-identity
  → record same_as assertion with confidence + provenance
```

## Match strategy by entity

| Entity | Strong keys (auto-link) | Fuzzy features (scored) | Notes |
|---|---|---|---|
| **Person** (judge/attorney/author/officer) | bar number, ORCID, appointment ID | normalized name, name variants, co-occurrence (same court/firm/case), active-date overlap | **Never** use national ID. High false-merge risk on common names → conservative threshold + review. |
| **Organization / Company** | registrar number, gov unit ID, ROR | normalized name minus legal suffix (בע״מ/עמותה), address, officers overlap | Registrar number is authoritative when present. |
| **Court** | official court code | name + type + location, alias table | Small closed set → mostly a curated crosswalk. |
| **Law** | knesset_law_id, official number | title similarity, enactment date, initiating bill | Watch title drift across amendments; anchor on law_id. |
| **Section** | law_id + section number + valid_time | text similarity | Resolve *within* a resolved Law only. |
| **Case** | court + docket number + year | party sets, dates, appeal linkage | Same docket reused across instances → include instance_level. |
| **Regulatory Decision / Gov Decision** | authority + decision number + date | subject similarity | Numbers are per-authority namespaced. |
| **Topic / Legal Domain** | curated code | label + alias | Controlled vocab — resolution is mostly manual curation. |

## Scoring and thresholds (design targets, tunable)

A composite score in [0,1] from weighted features. Three bands:

- **≥ auto-merge threshold** → create/confirm `same_as`, `assertion_status =
  resolved`, confidence = score.
- **review band** → create a *review candidate* pair for human adjudication;
  entities stay separate meanwhile.
- **< lower bound** → treat as distinct; mint a new canonical identity.

Thresholds differ per entity (strict for Person, looser for Court). Thresholds
are configuration, not code constants — stored so they can be tuned without a
release.

## Merge and split mechanics

- **Merge.** Choose/mint a surviving canonical_id; repoint the losing entity's
  `external_ids` and incident edges to it; record a `merge_event` (who/what/when,
  provenance, reversible pointer to pre-merge state).
- **Split.** If a merge is later found wrong, a `split_event` restores distinct
  identities using the retained pre-merge snapshots; edges are re-attributed by
  their original provenance.
- **Survivorship rules.** For each field, the surviving value is chosen by a
  precedence policy (authoritative source > higher confidence > most recent
  `last_verified`), recorded per field so survivorship is explainable.

## Dangling references

Citations and cross-references that cannot yet be resolved are **retained as
dangling** (`citationTarget → null`, with the raw `citation_text`). A background
resolution pass re-attempts linking as new entities arrive. Dangling references
are never dropped and never fabricated into a target.

## Guardrails

- Identity resolution runs over the assertion layer only; it never mutates
  immutable content or provenance of the source records.
- Every automated link is explainable (which features fired, what score).
- PII minimization applies throughout: resolve persons on the least sensitive
  keys that work; do not accumulate identifiers beyond what resolution needs.

# Knesset Legislation Backfill — Results (2026-08-06)

**Full-text backfill did NOT run — because it cannot from the specified source.**
`KNS_DocumentIsraelLaw` is empty (`@odata.count 0`); Knesset OData exposes no
full law text. No files were downloaded, no laws' full text ingested. This is
the correct, evidence-based outcome, not a failure to execute — we verified
before building a fetch pipeline against an empty set. Full numbers:
`artifacts/knesset-backfill-results.json`.

## What was delivered instead (all real, on dev)

- Section parser + chunker + citation contract + retrieval-eval — built, 14
  tests pass.
- Additive migration `20260806160000_legislation_chunks` applied to dev
  (RLS deny-by-default).
- A structural-demonstration statute run through the real parser → **4 Section
  canonical entities + 4 legal_chunks** persisted to dev, FTS-indexed, provenance
  100%, citation contract complete. This proves the Section→chunk→FTS→retrieval
  pipeline on the real schema (it is a demonstration, not an authoritative corpus).

## Controlled backfill

Not started — there is no full-text source to backfill. The gating dependency is
a lawful Knesset **legislation-web collector** (main.knesset.gov.il) to fetch
consolidated law text with a recorded license basis.

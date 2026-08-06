# First Production Slice — Pilot Results

Two pilot modes exist. This document reports the one that actually ran, and
states plainly what the other requires.

## Important: where the pilot ran

This session's container has **no network egress** (verified repeatedly — control
probes return 403), and applying remote migrations / remote DB writes requires
explicit founder approval per the repo guardrails. Therefore:

- The **offline fixture pilot** ran here, end-to-end, with the real pipeline
  (collectors → mappers → validation → dedup/versioning → persistence →
  indexing → metrics) against bundled fixtures and the in-memory store. Its
  output is real and shown below.
- The **live pilot** (real Knesset OData / data.gov.il + Supabase) is the
  founder-gated step. It runs the *identical* code with `--live` on an unblocked
  network with `SUPABASE_*` set and the migration applied. No live record counts
  are reported here because they cannot be produced from this container — and
  this slice does not claim a pilot succeeded without real output.

## Offline fixture pilot — actual output (this session)

Command: `npm run legal:ingest:knesset -- --pilot` and
`npm run legal:ingest:data-gov -- --dataset=<ds> --pilot`.

| Source / dataset | fetched | mapped | validated | persisted | full_text | summary | metadata_only | quarantined | stopped |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| knesset_odata | 9 | 9 | 9 | 9 | 0 | 0 | 9 | 0 | false |
| data_gov_il / ararim | 3 | 15 | 15 | 15 | 3 | 0 | 12 | 0 | false |
| data_gov_il / mishmoret | 1 | 6 | 6 | 6 | 1 | 0 | 5 | 0 | false |
| data_gov_il / judgments | 2 | 6 | 6 | 6 | 0 | 2 | 4 | 0 | false |

Reading the numbers: one CSV row fans out into several canonical entities
(Decision + Case + Authority/Court + Party + Topic + DocumentSource), which is
why `mapped > fetched`. Crucially, **judgments produced `summary` decisions and
zero `full_text`** — the content-level guarantee holds — while ararim/mishmoret
produced `full_text` decisions carrying immutable primary text. Knesset produced
legislation **metadata** (Law/Bill/Topic/Party) at `metadata_only`, as expected.

## Pilot verification checks (Step 17) — all pass via the test suite

The 10 required verifications are covered by
`src/modules/legal-ai-israel/ingestion/__tests__/pipeline.test.ts` (24 tests,
all green):

1. **Same run twice → no duplicates** — `idempotency` test: re-run persists 0,
   detects duplicates, store size unchanged.
2. **Source change → new version** — `update detection` test: changed decision
   text increments `version_number` to ≥ 2.
3. **Invalid record → quarantine** — `quarantine` test: unlicensed full-text /
   restricted rows quarantined with reasons.
4. **Every document traceable to source** — `attribution` test: provenance
   (platform, url, raw hash, external id) present on every persisted record.
5. **Case numbers normalized** — `identity` test + the Phase-1 case-number
   parser.
6. **Law + sections in correct order** — segmentation/chunk tests preserve
   section order; Knesset Law/Bill ordering by entity set.
7. **Summary-only never marked full-text** — `judgments` test asserts
   `documentsWithFullText === 0`.
8. **Search returns source + citation** — records carry `external_identifiers`
   + provenance; FTS/structured fields declared (see search strategy).
9. **Restart resumes from checkpoint** — `checkpoint resume` test.
10. **One collector fails without stopping the other** — `two collectors are
    independent` test (403 on one, the other completes).

## To run the live pilot (operator machine)

```bash
# 1) Apply the additive migration to the DEV project (founder approval required):
#    supabase/migrations/20260806120000_canonical_ingestion_v1.sql
# 2) Export dev credentials + CKAN resource ids:
export SUPABASE_URL=...            # DEV project only (udispadsbxqicmawqcuk)
export SUPABASE_SERVICE_ROLE_KEY=...
export CKAN_RESOURCE_ARARIM=...    # datastore resource id per dataset
export CKAN_RESOURCE_MISHMORET=...
export CKAN_RESOURCE_JUDGMENTS=...
# 3) Run the capped pilot (500 records/source):
npm run legal:ingest:knesset -- --live
npm run legal:ingest:data-gov -- --dataset=ararim --live
npm run legal:ingest:data-gov -- --dataset=mishmoret --live
npm run legal:ingest:data-gov -- --dataset=judgments --live
```

Paste the printed metrics back and they become the live pilot record; the
backfill decision (see `backfill-decision.md`) is then made per source.

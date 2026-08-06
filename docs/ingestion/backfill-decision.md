# Full Backfill Decision Gate (Step 18)

Full backfill is **not** automatic. After the *live* pilot runs, each source
gets an independent decision: `GO` / `GO_WITH_FIXES` / `NO_GO`, against the
Step-18 criteria. Until the live pilot runs (founder-gated — see
`pilot-results.md`), the harness verdict is **PENDING (harness-ready)**: the
code, tests, and offline pilot pass, but the live thresholds cannot be measured
from a network-blocked container.

## GO criteria (all must hold, per source)

- validation success ≥ 98%
- duplicate rate explained
- provenance coverage = 100%
- indexing success ≥ 99%
- quarantine rate reasonable and analyzed
- incremental sync works
- license verified
- no data corruption

## Decisions (post-live, 2026-08-06 — evidence in artifacts/live-pilot-results.json)

| Source | Live pilot | Validation | Provenance | License | Decision |
|---|---|---|---|---|---|
| knesset_odata (legislation) | 11 ingested, 0 quarantine | 100% | 100% | open (legislation, no §6 copyright), no auth | **GO** |
| data_gov_il / judgments | 8 entities, 1 quarantined (restriction), summary-only | 91%* | 100% | other-open, ContainPrivateData=No | **GO_WITH_FIXES** (display source/attribution) |
| data_gov_il / ararim | 8 entities, metadata-only | 100% | 100% | cc-by (attribution) | **GO_WITH_FIXES** (record+display cc-by) |
| data_gov_il / mishmoret | 7 entities, metadata-only + PII + cross-domain doc | 100% | 100% | cc-by (attribution) | **GO_WITH_FIXES** (PII minimization + cc-by + cross-domain doc license) |

\* judgments validation 91% because 1 of 11 mapped records was correctly
quarantined (publication_restricted) — a *correct* rejection, not a defect.

Only **knesset_odata is GO**. The three CKAN datasets are **GO_WITH_FIXES**: their
structure/provenance/idempotency all pass, but each needs a specific, bounded fix
before user-facing exposure (attribution display; PII minimization for mishmoret;
cross-domain document license for mishmoret). Full backfill of a GO_WITH_FIXES
source waits until its fix lands and is re-verified.

## What each verdict would require

- **GO** — the live pilot meets every threshold above. Recommended first for
  **knesset_odata** (highest ROI, cleanest open API) and **judgments**
  (summary-only, lowest license risk).
- **GO_WITH_FIXES** — e.g. ararim/mishmoret if the cc-by full-text storage
  permission needs to be recorded in `source_permissions` first, or if a small
  quarantine cluster needs a mapper tweak. Backfill proceeds once the specific
  fix lands.
- **NO_GO** — validation < 98%, unexplained duplicates, provenance gaps, or any
  data corruption. Fix and re-pilot before any backfill.

## Backfill preconditions (independent of verdict)

Before removing the 500-record pilot cap:

1. Migration `20260806120000_canonical_ingestion_v1.sql` applied to DEV (founder
   approval).
2. cc-by attribution recorded for ararim/mishmoret (full-text storage gate).
3. Incremental sync confirmed on a second live run (update detection + no
   duplicates).
4. Metrics from the live pilot pasted into `pilot-results.md`.

Backfill is then run per source, still capped and monitored, with the same
idempotent/resumable collector — never a full reload.

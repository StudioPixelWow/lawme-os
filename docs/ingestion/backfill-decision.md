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

## Current status (pre-live)

| Source | Harness | Offline pilot | License | Live thresholds | Decision |
|---|---|---|---|---|---|
| knesset_odata (legislation) | ready | pass (9/9, 100% provenance) | open, no §6 copyright, no auth | not yet measured | **PENDING → run live** |
| data_gov_il / ararim | ready | pass (full_text, 100% provenance) | cc-by (attribution) — confirm before full-text storage | not yet measured | **PENDING → run live** |
| data_gov_il / mishmoret | ready | pass (full_text) | cc-by (attribution) — confirm | not yet measured | **PENDING → run live** |
| data_gov_il / judgments | ready | pass (summary-only) | other-open | not yet measured | **PENDING → run live** |

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

# Phase 3 — B2 eval + 50-pub reprocess: CI runbook (DEV, manual)

Runs ONLY the already-built gates from secrets. No new architecture/extraction.
Nothing publishes; `published = 0`. DEV project only.

Workflow: `.github/workflows/phase3-b2-eval.yml` (manual `workflow_dispatch`).

## 1. Configure secrets (GitHub → Settings → Environments → `dev` → secrets)

The workflow binds to a `dev` environment; create it and add these secrets there
(or as repo secrets if you prefer, and drop the `environment: dev` line). Secrets
are read from the environment at run time and never echoed.

| secret | value |
|---|---|
| `AZURE_DI_ENDPOINT` | `https://<resource>.cognitiveservices.azure.com` |
| `AZURE_DI_KEY` | Azure Document Intelligence key |
| `GCP_PROJECT` | GCP project id |
| `GCP_LOCATION` | Document AI location, e.g. `us` or `eu` |
| `GCP_DOCAI_PROCESSOR` | Document AI processor id |
| `GCP_SA_KEY` | the **entire** service-account JSON (pasted as the secret value) |
| `SUPABASE_URL` | DEV project URL (`https://udispadsbxqicmawqcuk.supabase.co`) |
| `SUPABASE_SECRET_KEY` | DEV service-role key (Object-Storage read) |

The Google key is written to a 0600 temp file at run time and referenced via
`GOOGLE_APPLICATION_CREDENTIALS`; it is never printed or uploaded.

## 2. Trigger

GitHub → Actions → "Phase 3 — B2 eval + 50-pub hybrid reprocess (DEV, manual)" →
Run workflow. Inputs:

- `confirm`: type **DEV** (required guard; the job refuses otherwise).
- `run_b2_eval`: true → Azure + Google + compare on the 10 residual pages.
- `run_reprocess`: true → fetch a 50-publication cohort from Object Storage and
  run the hybrid reprocess dry-run.
- `cohort_size`: default `50`.

## 3. What it does

1. Pulls the 10 residual pages' PDFs from Object Storage.
2. `eng-azure.ts` and `eng-google.ts` OCR exactly those 10 pages.
3. `eng-b2-compare.ts` scores both (Hebrew fidelity, reading-order stability,
   duplication, section markers, page alignment, latency, cost) and writes
   `recommended_b2_provider` — fidelity/citation weighted above cost.
4. Pulls a deterministic 50-publication cohort from Object Storage.
5. `reprocess-hybrid.ts` (dry-run, `--commit` refused) routes every page A/B1/B2
   and writes `_reprocess-metrics.json`: pages, routing %, needs_review,
   unresolved, physical-page alignment, provenance, glyph-loss/dup/Hebrew,
   extraction failures, `raw_overwritten:false`, `published:0`.

## 4. Artifacts returned

One artifact bundle `phase3-b2-eval-json` (JSON only — no PDFs, no secrets):

```
b2-comparison.json          # Azure vs Google + selected provider
azure-di/*.json             # per-page Azure output (10)
google-docai/*.json         # per-page Google output (10)
_reprocess-metrics.json     # 50-publication routing + gate metrics
```

Download the artifact and send me those JSON files (or point me at the run).
I will then return: Azure metrics, Google metrics, selected provider, the
50-publication routing A/B1/B2, needs_review, unresolved, provenance,
physical-page alignment, glyph/duplication/Hebrew metrics, extraction failures,
regression findings, and the **GO / GO_WITH_FIXES / NO_GO for the 250 phase**.

## Guarantees

- DEV-only (confirm guard + `environment: dev`).
- Secrets from env only; never logged or uploaded.
- Reads PDFs only from Object Storage; no Knesset re-download.
- No DB writes (dry-run; `--commit` refuses); raw never overwritten; `published=0`.
- No architecture or extraction-logic change — only the fetch plumbing + the
  reprocess metrics report were added to make the existing gates runnable in CI.

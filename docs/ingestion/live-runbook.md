# LAW ME — Live Ingestion Runbook

How the live pilot was run, and how to run it (and the full backfill) again.

## What ran on 2026-08-06

1. **Migration applied to dev** (`udispadsbxqicmawqcuk`, verified not production):
   `20260806120000_canonical_ingestion_v1` → success. Verified: 4 canonical +
   4 ingestion tables, 25 indexes, RLS deny-by-default on all 8, CHECK
   constraints active.
2. **Connection tests** (one request/source, no retries, no bypass): all four
   `connected` (Knesset OData; data.gov.il ararim/mishmoret/judgments).
3. **Live fetch** over the operator network via the browser (public JSON APIs,
   no auth). Real rows captured per source.
4. **Real pipeline** (mappers → validation → dedup/versioning → metrics) run in
   the container on the real rows; results **persisted to dev** via Supabase MCP.
5. **Verified on dev**: provenance 100%, content-level correct, structured +
   FTS + graph search, idempotency, version chain, quarantine.

## Environment constraint (why the fetch is browser-mediated)

The container's network egress is blocked; the Supabase MCP reaches dev but the
container cannot reach public sites. So live source data is fetched over the
operator's network (browser) and the pipeline runs offline in the container. The
`--live` CLI path below is the unblocked-network equivalent for the full run.

## Full live run (operator machine, unblocked network)

```bash
# 1) Apply the migration (done for dev; re-run is idempotent)
#    supabase/migrations/20260806120000_canonical_ingestion_v1.sql   (founder approval)

# 2) Export dev creds + CKAN resource ids (verified live 2026-08-06):
export SUPABASE_URL=...              # DEV only (udispadsbxqicmawqcuk)
export SUPABASE_SERVICE_ROLE_KEY=...
export CKAN_RESOURCE_ARARIM=b9580b33-6b41-4ca3-b6e1-eb4bbf96a318
export CKAN_RESOURCE_MISHMORET=ee9cc077-763f-44da-aea6-235ffaf72d3a
export CKAN_RESOURCE_JUDGMENTS=6a469006-3844-476f-84e8-960a8fd9df22

# 3) Run each source separately (capped 500), NOT in parallel:
npm run legal:ingest:knesset -- --live
npm run legal:ingest:data-gov -- --dataset=judgments --live
npm run legal:ingest:data-gov -- --dataset=ararim --live
npm run legal:ingest:data-gov -- --dataset=mishmoret --live
```

## Reproduce the dev-load offline (from captured rows)

```bash
PILOT_CKAN_CAP=2 node tools/legal-ingest/live-emit.ts   # → artifacts/live-pilot-*.sql
# apply the generated SQL to dev via the Supabase MCP (entities → external_ids →
# versions → relationships → quarantine/metrics, FK-safe order)
```

## Stop / safety rules honored

One request per source for connection tests; no WAF/CAPTCHA bypass; no retry on
403; blocked → mark blocked and skip. Cross-domain document links
(rfa.justice.gov.il) are recorded but their documents are NOT fetched/stored (the
data.gov.il cc-by license does not extend to them). PII (mishmoret detainee
numbers) is flagged for minimization before any wider load.

## Rollback

The migration is additive; to roll back the pilot data (dev only):
`truncate legalai.canonical_entities cascade;` plus the ingestion_* tables. The
tables themselves can be dropped if the model is revised (dev only, with
approval).

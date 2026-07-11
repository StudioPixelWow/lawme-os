# POC Runbook

Everything runs locally — no credentials, no network, no database.
Node ≥ 22.18 (native TypeScript execution; the repo runs 22.22).

## Commands

| Command | What it does | Expected |
|---|---|---|
| `npm run legal:case-number:test` | normalizer golden set (57 tests) | all pass |
| `npm run legal:poc:test` | full POC suite: ingestion, extraction, anchors, retrieval, engine, answer, observability (73 tests) | all pass |
| `npm run legal:fixtures:validate` | every fixture → unified schema + validation gate | 13/13 valid |
| `npm run legal:sources:validate` | source-registry records structural check | 134/134 valid |
| `npm run legal:benchmark:run` | machinery benchmark, 28 draft questions | 28/28; writes a run record |

Run telemetry lands in `.poc-runs/poc-runs-YYYY-MM-DD.jsonl` (gitignored).

## Trying a research query by hand
```bash
node -e '
import("./src/modules/legal-knowledge/corpus/load.ts").then(async ({loadPocCorpus}) => {
  const {runResearch} = await import("./src/modules/legal-knowledge/research/engine.ts");
  const {buildStructuredAnswer} = await import("./src/modules/legal-knowledge/research/answer.ts");
  const corpus = await loadPocCorpus();
  const r = await runResearch(corpus, { question: "עובדת פוטרה בהיריון ללא שימוע — מה זכויותיה?", legalDomain: "labor", authorityPreference: "binding_first" });
  console.log(JSON.stringify(buildStructuredAnswer(r), null, 2));
});'
```

## Migration validation (local only — NEVER against the remote project)
```bash
# a scratch PG16 cluster with pgvector + a Supabase-compatible auth stub:
initdb -D /tmp/pgpoc -U postgres --auth=trust
pg_ctl -D /tmp/pgpoc -o "-k /tmp/pgsock -c listen_addresses=" start
psql -h /tmp/pgsock -U postgres -c "create database lawme_poc"
#   stub: create schema auth; auth.users; auth.uid(); roles authenticated/service_role
psql -h /tmp/pgsock -U postgres -d lawme_poc -f supabase/migrations/20260711155956_legal_intelligence_poc_foundation.sql
#   Supabase-default grants for the local run:
psql -h /tmp/pgsock -U postgres -d lawme_poc -c "grant select, insert, update, delete on all tables in schema public to authenticated; grant usage on schema app to authenticated; grant execute on all functions in schema app to authenticated;"
psql -h /tmp/pgsock -U postgres -d lawme_poc -f supabase/tests/rls_validation.sql
# expect: RLS VALIDATION: ALL TESTS PASSED
```

## Troubleshooting
- `ERR_MODULE_NOT_FOUND` on `.ts` imports → Node < 22.18; upgrade.
- Benchmark below 100% after changing fixtures/dictionary → run
  `npm run legal:benchmark:run | grep FAIL` and check which machinery
  column broke; retrieval misses usually mean a dictionary gap.
- `node --test <dir>` fails while glob passes → known Node quirk; use the
  npm scripts (they glob `*.test.ts`).

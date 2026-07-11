# POC Observability (Epic 2, Phase 13)

## What every research run records
Two sinks, one correlation id:

1. **Local JSONL** (`.poc-runs/poc-runs-YYYY-MM-DD.jsonl`, gitignored) —
   every `runDbResearch` call appends: kind, timestamp, engineVersion,
   modelProvider (mock/trigram-hash@1.0.0), parserVersion, query,
   repository kind (adapters), documentsRetrieved, rankScores,
   citationsReturned, verificationStatus set, warnings, failures,
   benchmarkResult (when relevant), **correlationId**, durationMs.
2. **Development database** (when org context exists) —
   `legal_research_sessions` → `legal_research_queries` (query text,
   normalized query, expansion, filters, engine version) →
   `legal_research_results` (rank, score, full score_breakdown JSON,
   passage anchor + text, warnings) + `audit_events`
   (research_session.created / poc_fixtures.seeded /
   legal_document.verification_changed …) — each carrying the
   correlationId inside the payload.

## Correlation IDs
`runDbResearch` mints a `randomUUID()` per run; it flows into the
OrgContext → repository audit events → run record → the dev interface
(displayed as מזהה ריצה). One id answers "what happened in this run?"
across UI output, JSONL and database rows.

## Never logged (enforced, not aspirational)
- Secrets/tokens — the JSONL recorder AND the audit repository both
  reject payloads matching secret patterns (tested: run-log test #16,
  repositories test #6).
- Full private documents — audit payloads are size-capped (8KB) precisely
  so document bodies cannot ride along; research passages persist only in
  the org-scoped `legal_research_results` table (RLS-guarded), never in
  audit or local logs beyond the query text itself.
- Schema details in user-facing errors — `mapError` returns generic
  Hebrew messages; driver detail stays server-side.

## Failure recording
Search failures return an explicit degraded result (evidence=[], warning,
"שגיאת אחזור" notice) and the failure lands in the run record's
`failures`/`warnings`; observability itself is wrapped in try/catch so a
logging failure can never break research.

## Future traceability (documented for the next epic)
When real users exist: correlation id becomes a response header of the
research API; benchmark_runs/benchmark_results rows link engine versions
to scores over time; per-source fetch telemetry (legal_source_fetches)
feeds the freshness dashboards designed in CONTINUOUS_LEGAL_UPDATE_PIPELINE.md.

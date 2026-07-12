# Dino Persistence Decision (Epic 3A, Phase 27)

**Decision: do NOT create Dino tables now. No migration is applied. The
existing `research_*` and `audit_events` tables cover what the POC needs
to persist; anything richer is deferred until the pipeline stabilises and
the founder approves a schema.**

## Principle

Persist only what is safe, auditable and useful. Never persist model
chain-of-thought. Minimise private matter context. Prefer the existing
schema over new tables while the pipeline is still evolving.

## What each artifact is, and where it belongs

| Artifact | Nature | POC handling | Future home |
|---|---|---|---|
| Run header (runId, outcome, engine version, timings) | auditable | in-memory result; loggable via existing `audit_events` | `dino_runs` |
| Stage records (status, provenance, durations, safe summaries) | auditable | in-memory | `dino_stage_runs` (JSONB per stage) |
| Intent / question classification | derived, non-sensitive | in-memory | JSONB on `dino_runs` |
| Matter context items | **sensitive** (may contain client facts) | in-memory only; NOT persisted in POC | tenant-private `dino_matter_context` with RLS |
| Research plan | derived | in-memory | `dino_research_plans` (JSONB) |
| Issue graph | derived | in-memory | `dino_legal_issues` + edges |
| Source plan | derived | in-memory | `dino_source_requirements` |
| Evidence ledger | references existing docs/sections | already persisted via `research_results` shape | reuse `research_results` |
| Claims | derived | in-memory | `dino_claims` |
| Contradictions | derived | in-memory | `dino_contradictions` |
| QA / Red Team findings | auditable | in-memory | `dino_qa_findings`, `dino_red_team_findings` |
| Confidence factors | derived | in-memory | JSONB on `dino_runs` |
| Review route | auditable | in-memory | `dino_review_routes` |

## What MUST NEVER be logged or persisted

- Model chain-of-thought / raw reasoning tokens (none are produced or held).
- Full raw private documents.
- Secrets or service-role credentials (never reach a provider).
- Provider prompts containing more matter context than a stage requires.
- Cross-tenant context (RLS + per-stage minimisation enforce this).

## Ephemeral vs auditable

- **Ephemeral** (recompute cheaply, no need to store): query strategies,
  intermediate scored candidates, per-issue retrieval bundles.
- **Auditable** (should be storable when schema lands): run header, stage
  records, coverage decision, contradiction records, QA/Red-Team findings,
  review route, confidence factors — the "what Dino did and why" trail.

## If/when a migration is written (NOT in this phase)

Requirements, to be honoured from the first line:

1. RLS on every table from creation. Global/derived artifacts
   (classification, plan) are authenticated-read; matter-context and
   any tenant-private artifact are `organization_id`-scoped with the same
   `app.is_org_member` helpers used by the Epic 1/2 schema.
2. Separate global-corpus artifacts from tenant-private artifacts —
   never mix in one row.
3. Audit immutability trigger on `dino_runs` / finding tables.
4. Service-role is the only writer for global/derived rows; clients never
   write Dino artifacts directly.
5. Rollback guidance in the migration header (drop order, no data loss on
   reversal because artifacts are recomputable).
6. Prepared but NOT applied; founder review before any remote apply.

## Retention

- Auditable run records: retain per firm policy (default 7 years for legal
  work product), tenant-scoped, deletable on matter closure.
- Ephemeral artifacts: not retained.
- Matter context: retained only as long as the matter, honouring the
  client's confidentiality and AI-policy settings.

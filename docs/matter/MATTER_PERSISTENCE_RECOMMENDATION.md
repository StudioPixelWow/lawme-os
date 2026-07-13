# Matter Persistence Recommendation (Epic 4 Architecture Review)

Recommendation only. **No migration is created.** Consistent with the Dino
persistence decision (defer tables until the model stabilizes; persist only what
is safe, auditable and useful; minimize private context; never persist
chain-of-thought).

## Decision: do NOT create Matter tables now

Epic 4 engines are pure in-memory functions. Nothing needs a table to be correct
or tested. Persistence lands when (a) a real matter datastore exists and (b) the
Score/snapshot contracts below are approved. Creating tables now would freeze a
schema against an engine set that is one review away from gaining shared
primitives.

## Artifact classification

| Artifact | Nature | POC handling | Future home |
|---|---|---|---|
| Matter record (facts, docs, evidence, deadlines, client, team, finance) | **source of truth**, sensitive | in-memory `Matter` fixtures | canonical `matters` + sub-tables, RLS per tenant |
| `matter_assessments` (per engine run: status, score, findings, actions, versions) | auditable/derived | in-memory `EngineAssessment` | JSONB per engine on a run row |
| `matter_health_snapshots` | derived, **trend-bearing** | in-memory | immutable snapshot per recompute |
| `matter_score_dimensions` | derived, trend-bearing | in-memory | one row per dimension per recompute (dashboard read model) |
| `matter_findings` | auditable | in-memory | rows linked to a run (searchable) |
| `matter_recommended_actions` | auditable | in-memory | rows linked to a run; task-system integration later |
| `matter_blockers` | auditable | in-memory | current-state + history |
| `matter_narratives` | derived | not built yet | snapshot per generation, `sourceAssessmentIds` retained |
| `matter_engine_runs` | auditable (telemetry) | in-memory | run header: engineVersion, inputsHash, event trigger, timings |
| `matter_state_transitions` | **event, immutable** | in-memory | append-only stage-change log |

## Current state vs immutable snapshot vs audit event

- **Ephemeral** (recompute cheaply, never store): Timeline, Communication
  intermediate views, per-read derived strings.
- **Current-state rows** (last known value, overwritten on recompute): Readiness,
  Missing-Info, Evidence, Document, Client, Team, Financial, Strategy,
  Next-Action plan.
- **Immutable snapshots** (append, for trend/audit): Health, Score dimensions,
  Risk, Legal coverage, Outcome band, Progress, and every state transition.
- **Audit events**: engine runs (telemetry), stage transitions, and any
  human-review routing decision.

## Cross-cutting requirements

- **Multi-tenant RLS.** Every matter table is tenant-scoped with row-level
  security, matching the Legal-Intelligence POC RLS model already documented.
  Recompute workers run under a tenant context; no query spans tenants.
- **Retention.** Snapshots are retained for trend/audit; a retention policy
  (e.g. keep all transitions, downsample health snapshots after N months) is a
  founder decision at schema time.
- **Data correction & replay.** Because engines are deterministic pure functions
  of `(Matter, asOf)`, any historical assessment can be **replayed** from the
  matter record + the engine version + asOf. Store `inputsHash` + `engineVersion`
  so a snapshot is reproducible and a correction is auditable (old snapshot kept,
  new one appended — never edited in place).
- **Idempotency.** Recompute is keyed by `(matterId, engine, inputsHash)`; the
  same inputs never produce duplicate snapshots.
- **Event sourcing vs snapshotting.** Use **snapshotting for engine outputs**
  (cheap to recompute, expensive to event-source) and **append-only events for
  state transitions and human-review decisions** (the audit spine). Not full
  event-sourcing of the matter — that is unnecessary given deterministic replay.
- **Sensitive data.** Facts/evidence/communications are client-confidential or
  privileged. Persist the *structured assessment* (statuses, counts, coded
  findings) freely; persist *raw private content* only in the tenant-private
  matter store, never in telemetry or logs. Findings' Hebrew messages must not
  embed privileged narrative beyond what the UI needs.
- **Auditability.** Every persisted assessment carries `engine`, `engineVersion`,
  `inputsHash`, `computedAt` (= asOf), and the triggering event — the same audit
  discipline Dino applies.

## Bottom line

The persistence story is a *recommendation*, not a build. The engines are already
snapshot-friendly (pure, versioned, deterministic, replayable). When a datastore
lands, snapshot the trend-bearing outputs, keep current-state rows for the rest,
append-only the transitions and review decisions, and scope everything with RLS.
No migration is created in this review.

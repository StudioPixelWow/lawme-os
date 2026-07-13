# Shared Intelligence Core (Epic 4.1)

`src/modules/intelligence/core/` · version `intelligence-core-1.0.0`

## Purpose

A neutral module holding the foundational concepts every LawME intelligence
domain shares — Dino, Matter, and the future Client / Document / Office / Team /
Finance domains. It exists to eliminate the duplicated definitions the Epic 4
architecture review found (most importantly the *fact / epistemic status* and the
*AI policy*), so that "a confirmed fact" and "what the client authorized" mean the
same thing everywhere.

It is deliberately **small**. It contains shapes and contracts, not business
logic, and it is not a framework.

## The hard rule of the dependency graph

```
Application Layer
  ↓
Domain Orchestrators (Dino, Matter, future Client/Document/Office/Team/Finance)
  ↓
Shared Intelligence Core   ← this module
  ↓
Legal Knowledge / Procedure / Data Repositories
```

- Domains import the core. The core imports **no** domain.
- Dino never imports Matter; Matter never imports Dino.
- These are enforced by an automated boundary test
  (`src/modules/intelligence/__tests__/boundaries.test.ts`).

## What lives here

| File | Provides | Consumed by |
|---|---|---|
| `severity.ts` | `Severity` scale + `worstSeverity` | Matter (adopted), findings/actions/warnings |
| `epistemic-status.ts` | canonical `EpistemicStatus` + legacy mappings | Matter & Dino fact models |
| `provenance.ts` | `Provenance` contract + legacy adapters | all |
| `ai-policy.ts` | `AiPolicy` + helpers | Dino & Matter (adopted) |
| `confidentiality.ts` | `Confidentiality` + helper | Dino & Matter (adopted) |
| `confidence.ts` | `ConfidenceReport` contract + Dino band adapter | forward-looking + Dino adapter |
| `review-route.ts` | `ReviewRoute` contract + adapters | forward-looking + Dino/Matter adapters |
| `finding.ts` | neutral `Finding` contract | forward-looking / future domains |
| `recommended-action.ts` | neutral `RecommendedAction` contract | forward-looking / future domains |
| `warning.ts` | `Warning` contract | Matter failure isolation, all |
| `blocking-condition.ts` | neutral `BlockingCondition` contract | forward-looking |
| `assessment.ts` | generic `AssessmentEnvelope<TData>` + `EngineStatus` + `ExecutionState` | Matter (adopted `EngineStatus`) |
| `result.ts` | generic `DomainResult<TPayload>` envelope | application-layer composition |

## Adoption model (this epic vs incremental)

Two levels of adoption were applied, matching the review's guidance that only the
value-primitives were *urgent*:

**Adopted now (lossless, zero behavior change):**
- `AiPolicy`, `Confidentiality` — both Dino and Matter import them (values were
  byte-identical).
- `Severity`, `EngineStatus` — Matter imports them (identical values).
- `EpistemicStatus` — canonical model + tested legacy mappings; Dino and Matter
  keep their existing enum values, now provably reconciled.

**Provided as contracts, adopted incrementally (documented, not forced):**
- `ConfidenceReport`, `ReviewRoute`, `Finding`, `RecommendedAction`, `Warning`,
  `BlockingCondition`, `AssessmentEnvelope`, `DomainResult`. These are the
  canonical shapes future domains build against and that Dino/Matter converge to
  over time. Adapters (e.g. `dinoConfidenceBandToShared`,
  `dinoReviewTargetToShared`, `reviewRouteFromFlag`) let a domain emit the shared
  shape today without rewriting its internal calculation.

This keeps Epic 4.1 a small, isolated refactor while laying the permanent
contracts. See `MIGRATION_GUIDE.md` for the exact edits and the remaining
convergence work.

## Non-goals

- No domain business logic (no scoring, no legal reasoning, no pipeline).
- No framework, no dependency-injection layer, no runtime registry.
- No `data: any` — the assessment envelope is generic over a typed payload.

# Epic 4.1 Migration Guide

Exact edits made to adopt the shared intelligence core, the compatibility
strategy, and the remaining (incremental) convergence work.

## Files created

Shared core — `src/modules/intelligence/core/`:
`severity.ts`, `epistemic-status.ts`, `provenance.ts`, `ai-policy.ts`,
`confidentiality.ts`, `confidence.ts`, `review-route.ts`, `finding.ts`,
`recommended-action.ts`, `warning.ts`, `blocking-condition.ts`, `assessment.ts`,
`result.ts`, `index.ts`.

Tests:
`src/modules/intelligence/core/__tests__/primitives.test.ts`,
`src/modules/intelligence/__tests__/boundaries.test.ts`,
`src/modules/matter/__tests__/failure-isolation.test.ts`.

## Files modified (lossless)

| File | Change | Behavior impact |
|---|---|---|
| `dino/core/request.ts` | `DinoAiPolicy = AiPolicy`, `DinoConfidentiality = Confidentiality` (aliases importing shared) | none — identical values, public names kept |
| `dino/context/matter-context-assembler.ts` | `SyntheticMatterFixture.aiPolicy: AiPolicy` | none |
| `matter/types.ts` | import + re-export shared `Severity`/`EngineStatus`; `aiPolicy: AiPolicy`; `confidentiality: Confidentiality`; removed local `Severity`/`EngineStatus` defs | none — identical values, re-exported so all consumers keep importing from `../types.ts` |
| `matter/intelligence.ts` | failure isolation: `safeAssess`, degraded assessments, `MatterState.degraded` + `.requiresHumanReview`, optional `AssessMatterOptions.engines` | additive — existing outputs unchanged; new fields added |
| `matter/index.ts` | export new failure-isolation types | additive |
| `package.json` | add `intelligence:test` script | none |

## Compatibility strategy

- **Aliases** (`DinoAiPolicy`, `DinoConfidentiality`) are kept and marked
  `@deprecated` pointing to the canonical type. They preserve the public API and
  can be removed once callers import the shared names directly.
- **Re-exports** (`Severity`, `EngineStatus` from `matter/types.ts`) mean no
  Matter engine import path changed.
- **Legacy enums** (`FactStatus`, `ContextItemStatus`, Dino confidence bands,
  Dino review targets) are unchanged; the core provides tested mapping functions.

## No behavior change — how it's proven

- `npm run typecheck` clean; `npm run lint` clean.
- Existing suites unchanged and green: matter (16 pre-existing), dino (12),
  triad (24), poc (97 + 1 pre-existing skip).
- Benchmarks green: `dino:benchmark` PASSED, `legal:benchmark:run` 100%.
- New tests: intelligence (19), matter failure-isolation (7) — additive.

## Remaining convergence (incremental, NOT in this epic)

These are deliberately deferred to keep Epic 4.1 small; each is guarded by the
mappings/contracts already in place:

1. Matter `FactStatus` value convergence to canonical `EpistemicStatus` (mechanical;
   guarded by `epistemic-status` tests).
2. Matter `MatterFact.source` → structured `Provenance` (when the datastore lands).
3. Matter per-engine `confidence: number` → decomposed `ConfidenceReport`.
4. Matter/Dino emitting full `ReviewRoute` objects instead of boolean/legacy route.
5. Domain `Finding`/`RecommendedAction`/`AssessmentEnvelope` convergence onto the
   neutral contracts.
6. Removing the `@deprecated` Dino policy aliases once callers use shared names.

Each is additive and reversible; none blocks building the next intelligence domain,
because the canonical shapes and the fact/policy unification — the parts a new
domain would otherwise copy wrong — are already in place.

# Matter Posture Model (Epic 4.2)

`src/modules/matter/score/posture.ts`

## Not an average

The overall Matter Posture is derived by **transparent precedence over the
required dimensions**, never by averaging. A single critical blocked dimension
dominates the whole posture; healthy dimensions cannot mask it.

## Posture states

`on_track · needs_attention · at_risk · blocked · degraded · requires_review ·
insufficient_data`.

## Derivation (first matching rule wins)

Over the 12 **required** dimensions:

1. any dimension `blocked` → **blocked**
2. else any dimension `unavailable` (a failed required engine) → **degraded**
3. else any dimension `requires_review` → **requires_review**
4. else any dimension `at_risk` → **at_risk**
5. else assessment coverage < 0.6 (too many `unknown`/`unavailable`) → **insufficient_data**
6. else any dimension `attention` / `stale` / `unknown` → **needs_attention**
7. else (all healthy/strong, no blockers) → **on_track**

This directly encodes the required behaviours: a failed required engine degrades
the matter; insufficient legal coverage (a `requires_review` dimension) prevents
`on_track`; a stale required dimension prevents `on_track`; and a blocked legal or
deadline dimension forces `blocked` regardless of the rest.

## Summary payload

Alongside the posture, `MatterScoreSummary` returns:

- `dominantConcernHe` — the weakest dimension's top finding (or the top blocker).
- `strongestDimension` / `weakestDimension` — by state precedence.
- `topBlockers` — up to 3 global blocking conditions, ranked by kind
  (policy > deadline > evidence/document > fact).
- `topOpportunitiesHe` — strong dimensions and a clear advance option when unblocked.
- `unavailableDimensions` / `staleDimensions` — coverage transparency.
- `assessmentCoverage` — fraction of required dimensions with a usable state.
- `requiresHumanReview` — any dimension routes to review, or the state itself does.

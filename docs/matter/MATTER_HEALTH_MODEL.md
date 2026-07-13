# Matter Health Model (Epic 4)

Engine: `matter-health` · `src/modules/matter/engines/health.ts`

## Role

Health is the only **meta-engine**. It produces the matter's overall vitality by
rolling up the 16 component engines. It is a *summary*, never a substitute for
the component findings — a partner reads Health first, then drills into the
engine that raised the flag.

## Two modes

**Roll-up mode** (used by the orchestrator): given the component assessments,
- `status` = the worst component status (`blocked > at_risk > attention >
  healthy`; `unknown` is treated as `attention`).
- `score` = a weighted mean of the component scores. Weights emphasize the
  engines a partner treats as existential: Readiness and Deadline (1.4), Risk
  (1.2), Evidence and Missing-Information (1.0), Financial and Client (0.6),
  others default 0.5. Engines returning `score: null` (planners) are excluded
  from the mean.
- `data.statusByEngine` / `data.scoreByEngine` expose the full breakdown.

**Standalone mode** (Health called alone, no components): computes a direct
vitality from primary signals — active blocks, strict overdue deadlines, and
client unreachability — so the engine is usable in isolation and in tests.

## Human review

Health requires human review whenever the worst status is `blocked` or
`at_risk`. It never closes a flag on its own.

# Founder Review — Epic 5: Matter Workspace Product Architecture

Status: complete, awaiting founder review. **No code, no UI, no commit.**

Epic 5 is the product architecture of the Matter Workspace — the single most
important screen in LawME — defined completely enough to build without making
further product decisions. It binds every surface to the intelligence already
shipped (`MatterProfile` = state + score + prioritizedActions + narrative), the
Procedure Graph, the Triad, and Dino.

## Documents produced (docs/product/)

1. `MATTER_WORKSPACE_PRODUCT_ARCHITECTURE.md` — master: the six product questions
   answered, product principles, the nine-region model, layout intent (RTL),
   build-readiness, non-goals.
2. `MATTER_WORKSPACE_INFORMATION_HIERARCHY.md` — the five-second test, above-fold
   decision core, progressive disclosure, on-request, never-shown, density &
   deterministic ordering.
3. `MATTER_WORKSPACE_SECTIONS.md` — every region/panel with data source, default
   collapse state, expand behavior, and drill-down targets (Regions A–I).
4. `MATTER_WORKSPACE_INTERACTIONS.md` — interaction model, the five action classes
   with gating, RTL-aware keyboard shortcuts, IS 5568 accessibility constraints,
   and empty/loading/degraded/stale interactions.
5. `MATTER_WORKSPACE_AI_SURFACES.md` — the two intelligence tiers (ambient
   deterministic vs on-request Dino), every AI surface, fail-closed behavior,
   human-review surface, AI-policy/confidentiality gating, and what AI never does.
6. `MATTER_WORKSPACE_DATA_BINDING.md` — the authoritative surface→field map, the
   screen state machine, refresh/freshness, performance expectations, and the UI
   definition-of-done.

## The answers, in brief

- **Immediately on open:** the briefing (narrative headline + current state) and
  the decision state — identity/stage, posture badge, nearest hard deadline, top
  blockers, top next action (owner/due/approval), review flag.
- **Obvious in five seconds:** on-track-or-not, the single most urgent thing, the
  nearest deadline, what's blocking, what's next + who + when, and whether review
  is needed.
- **Never scroll:** the decision core (Regions A–D + the Score summary).
- **Progressive disclosure:** the 12-dimension grid, per-dimension detail, the
  intelligence panels, trend, and provenance — each ≤ one interaction away.
- **Dino surfaces automatically:** only deterministic flags (coverage
  insufficiency, specialist routing, contradictions, deadline risk, missing
  mandatory items, policy blocks). Its pipeline never auto-runs.
- **Never shown:** chain-of-thought, outcome probability, unverified case numbers
  as fact, private context beyond task need, any blended overall percentage.

## Design guarantees carried from the engines

Categorical-before-numeric; fail-closed and visible; every claim sourced (drill to
provenance); human-in-the-loop explicit; AI-policy/confidentiality respected on
every surface; Hebrew-first RTL; no false certainty. The Workspace is a pure
function of `MatterProfile` — it computes nothing the engines don't already
provide, so correctness and safety are inherited, not re-implemented.

## Scope honored

No UI, no components, no routes, no Design-Language change, no persistence, no new
engines, no LLM narrative, no code at all. Product architecture only.

## Founder decisions required

1. Approve the nine-region model and the always-visible decision core (Regions A–D
   + Score summary).
2. Approve the two-tier AI model (ambient deterministic vs on-request Dino) and the
   five action-gating classes.
3. Approve the finance panel being role/confidentiality-gated.
4. Confirm the Morning-Workspace (portfolio) surface is a separate epic that reuses
   these same snapshots (out of Epic 5 scope).

## Recommended immediate next step

On approval, hand this set to the Design Bible for the visual system, then scope
the build epic (Epic 6) against `MATTER_WORKSPACE_DATA_BINDING.md`'s definition of
done. Do not start the build until this architecture is approved.

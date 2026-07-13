# Matter Intelligence Engine (Epic 4)

## What this is

LawME is not a legal research engine with a case folder bolted on. The **Matter**
is the product. A Matter is a *living object*: it continuously understands its
own legal, procedural, factual, evidentiary, documentary, financial, team and
client state, and from that understanding it computes — deterministically —
what is happening, what is missing, what to do next, who should do it, when,
why, and what is blocking progress.

This is the mindset of a senior partner reviewing a file, not a search box.

## The seven questions

Every assessment answers the seven questions a partner asks about any matter:

1. **What is happening?** — `what_is_happening`
2. **What is missing?** — `what_is_missing`
3. **What should happen next?** — `what_next`
4. **Who should do it?** — `who`
5. **When?** — `when`
6. **Why?** — `why`
7. **What is blocking progress?** — `blocking`

The orchestrator (`src/modules/matter/intelligence.ts`, `assessMatter`) composes
these from the engines' structured output. It never invents content beyond what
the engines produced.

## Structured output only — never free text alone

Every engine returns an `EngineAssessment`:

- `engine`, `engineVersion` — identity + version
- `status` — `healthy | attention | at_risk | blocked | unknown`
- `score` — `0..1` (or `null` for planners that are not health scores)
- `findings[]` — each tagged with a `severity` and one of the seven `dimension`s
- `actions[]` — each with `ownerRole`, `dueHint`, `whyHe`, `priority`, and a
  `requiresHumanApproval` flag
- `data` — engine-specific structured payload (the machine-readable substance)
- `confidence`, `requiresHumanReview`

A message string is never the whole answer; it is always attached to a coded,
typed finding or action.

## The 17 engines

The orchestrator runs 16 component engines and then a health roll-up engine
(17 total). Component engines never depend on each other's ordering — each reads
the Matter (and the state machine / triad) directly and is independently
testable. Health is the only meta-engine: it summarizes the components.

| Engine | Answers | Doc |
|---|---|---|
| Health (roll-up) | overall vitality | MATTER_HEALTH_MODEL |
| Timeline | what_is_happening / when | (this doc) |
| Readiness | blocking / what_is_missing | MATTER_READINESS_MODEL |
| Missing-Information | what_is_missing | (this doc) |
| Evidence | what_is_missing | MATTER_EVIDENCE_MODEL |
| Document | what_is_missing | MATTER_DOCUMENT_INTELLIGENCE |
| Deadline | when | (this doc) |
| Risk | why | MATTER_RISK_MODEL |
| Legal | why / what_is_happening | (bridges the Triad) |
| Strategy | what_next | MATTER_STRATEGY_MODEL |
| Next-Action | what_next / who / when | MATTER_NEXT_ACTION_MODEL |
| Progress | what_is_happening | (this doc) |
| Client | who / why | MATTER_CLIENT_MODEL |
| Team | who | MATTER_TEAM_MODEL |
| Financial | why | MATTER_FINANCIAL_MODEL |
| Communication | what_is_missing | MATTER_COMMUNICATION_MODEL |
| Outcome Predictor | why | (rule-based only; see below) |

## Determinism and safety

- **Deterministic**: given the same Matter (including its `asOf` reference date)
  `assessMatter` returns byte-identical output. No wall clock (`Date.now` is
  never called); everything is relative to `asOf`. No `Math.random`.
- **No model calls, no chain-of-thought retained.** Engines are rule-based
  TypeScript. Only safe, auditable artifacts (findings, actions, structured
  data) are produced.
- **Fails closed.** Where legal coverage is insufficient (see the Legal engine
  and the Triad), the Matter says so and routes to specialist review rather
  than manufacturing confidence.
- **Human-in-the-loop.** Every externally-effective action carries
  `requiresHumanApproval: true`. The Matter proposes; a lawyer decides.
- **No UI.** This epic is intelligence only — no pages, no Design-Language
  changes. The output is a typed `MatterState` object.

## Where it connects

The Legal engine bridges each Matter to the **Legal Knowledge Triad**
(Legislation + Case Law + Procedure) via `evaluateTriad`. A Matter therefore
answers both "what is the law?" and "what should the lawyer do next?" — the
knowledge layer is one capability the Matter consumes, not the product itself.

## Files

- `src/modules/matter/types.ts` — the living Matter object + engine framework
- `src/modules/matter/state-machine.ts` — the Matter State Machine
- `src/modules/matter/engines/*.ts` — the 17 engines + shared helpers
- `src/modules/matter/intelligence.ts` — the orchestrator (`assessMatter`)
- `src/modules/matter/__tests__/*` — deterministic tests + fixtures

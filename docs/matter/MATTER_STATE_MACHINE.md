# Matter State Machine (Epic 4)

`src/modules/matter/state-machine.ts` · version `matter-state-machine-1.0.0`

## Purpose

Every legal procedure maps into a single state machine so that "where is this
matter, and what stops it from moving forward" is one deterministic, auditable
computation — not a human's mental model.

The state machine does **not** re-implement procedure knowledge. It derives
everything from the **Procedure Graph** (Triad Pillar C,
`src/modules/legal-knowledge/procedure/`). The procedure graph is the single
source of truth for stages, transitions, required facts, mandatory evidence,
documents and deadlines; the state machine reads it and combines it with the
matter's actual facts/evidence/deadlines/client policy.

## Core functions

- `procedureFor(matter)` — resolves the matter's `procedureType` to a
  `Procedure` in the graph (or `null`).
- `currentStage(matter)` — the matter's current `ProcedureStage` (falls back to
  the procedure's root stage).
- `blockingConditions(matter)` — the list of things preventing advancement out
  of the current stage. Each is a typed `BlockingCondition`:
  - `missing_fact` — a stage-required fact is not known (status `unknown` or no
    record). Alleged/disputed facts are *not* treated as known.
  - `missing_evidence` — a mandatory evidence item for the stage is not
    collected.
  - `missing_document` — a stage-required document is absent.
  - `deadline` — a deadline-based bar.
  - `policy` — the client's `aiPolicy` is `prohibited` (a hard stop).
- `stateSnapshot(matter)` — a `StateSnapshot` with the current stage title/kind,
  the stage index and total, `canAdvance` (no blocks **and** a next stage
  exists), the blocking list, and the next-stage options (with their
  transition conditions) drawn from the graph.

## What "known" means

Facts have an epistemic status (`FactStatus`). Only `confirmed` and
`document_derived` count as *known* for advancement. `client_alleged`,
`opposing_alleged`, `disputed` and `unknown` are surfaced as gaps. This is the
"an allegation is never a fact" rule, enforced at the state-machine layer so
every engine inherits it.

## Advancement rule

A matter `canAdvance` only when:

1. `blockingConditions(matter)` is empty, **and**
2. the current stage has at least one outgoing transition in the graph.

A terminal stage (no outgoing transition) with no blocks is *complete*, not
*advanceable*; the Next-Action engine reports this distinctly.

## Why derive from the graph

Because procedural rules carry provenance and distinguish mandatory law from
best practice, deriving the state machine from the graph means the matter can
never present a best-practice convention as a legal bar, and every block is
traceable to a cited source in the procedure catalog.

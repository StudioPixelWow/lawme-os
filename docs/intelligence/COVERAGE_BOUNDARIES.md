# Coverage Boundaries (Epic 4.1)

Three coverage concepts exist in LawME. They are **not** merged into one universal
coverage engine. Each answers a different question at a different scope, and no
domain's coverage state may become another domain's source of truth.

## The three coverages

| Coverage | Module | Question | Scope |
|---|---|---|---|
| **Dino Coverage** | `dino/coverage` (`evaluateCoverage`, `CoverageState`) | Does *this research request* have enough knowledge + evidence to answer? | one Dino run / issue graph |
| **Triad Coverage** | `legal-knowledge/triad` (`evaluateTriad`, `TriadState`) | Is there enough Legislation + Case-Law + Procedure knowledge on a topic? | a legal topic |
| **Matter Coverage** | `matter` (Legal engine + state machine) | Does *this specific matter* have enough legal, factual, evidentiary and operational coverage? | one matter |

## Why they stay separate

- They operate on different inputs (an issue graph vs a topic vs a live matter).
- Merging them would let, say, a research-request's coverage verdict silently
  decide whether a *matter* can proceed — a source-of-truth violation the review
  (ADR-0008) explicitly forbids.
- The Matter Legal engine already consumes **Triad** coverage (the correct
  direction: matter → legal knowledge). It does **not** consume Dino coverage.

## What IS shared

Only low-level *sub-state vocabulary* overlaps, and only where identical in
meaning: `insufficient_case_law`, `insufficient_facts`. These appear in both Dino
`CoverageState` and Triad `TriadState`. The boundary rule:

- Each coverage keeps its own state enum (they are not interchangeable).
- Where a sub-state name is shared, it must mean the same thing (an evidentiary
  gap of the same nature), so the application layer can reason about "insufficient
  case law" consistently without conflating the three verdicts.

## The enforced invariant

> Triad owns *topic* coverage. Dino owns *answer* coverage. Matter owns *matter*
> coverage. A domain may **read** another's coverage through an explicit,
> typed boundary (Matter reads Triad), but no coverage state is silently promoted
> into another domain's decision. There is no universal Coverage Engine.

This document is the coverage half of ADR-0008 (source-of-truth ownership),
recorded here so future domains (e.g. Document coverage) slot in as further
distinct scopes rather than collapsing into one.

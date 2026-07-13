# ADR-0001 — Dino vs Matter Intelligence ownership

Status: Proposed (Epic 4 review) · Date: 2026-07 · Owner: founder decision

## Context

LawME has two intelligence orchestrators: Dino (26-stage legal-answer pipeline)
and Matter Intelligence (17-engine living-matter assessment). They currently
share only `legal-knowledge` and do not import each other. We must fix the
permanent relationship before more domains (Client/Document/Office) appear.

## Decision

Dino and Matter are **peer domain orchestrators**. Neither imports the other.
Dino owns "what is the law / what does this question require"; Matter owns "what
is the state of this file and what happens next". Cross-domain flows are composed
by the application layer as typed, minimized packages — never by one module
reaching into the other. Both stand on shared intelligence primitives (ADR-0002)
and the Legal Knowledge base.

## Alternatives

1. **Dino orchestrates Matter** — rejected: makes Matter a sub-routine of a
   legal-answer pipeline, when the Matter is the product and Dino is one
   capability it uses.
2. **Matter calls Dino stages** — rejected: couples Matter to Dino internals and
   creates a cycle risk.
3. **Merge into one mega-orchestrator** — rejected: destroys separation of
   concerns and testability; blocks adding new domains as peers.

## Consequences

- The dependency graph stays acyclic; new domains attach as further peers.
- Any Matter↔Dino data flow is explicit and reviewable at the application layer.
- Some composition logic (run Matter, hand a bounded context to Dino) lives above
  both modules.

## Risks

- Drift: a future PR wires a direct import. Mitigation: a lint/import-boundary
  rule forbidding `matter → dino` and `dino → matter` edges.

## Revisit trigger

If a product flow genuinely needs tight Matter↔Dino coupling that the application
layer cannot express cleanly, or when the third domain orchestrator lands.

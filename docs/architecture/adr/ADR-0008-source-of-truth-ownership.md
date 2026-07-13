# ADR-0008 — Source-of-truth ownership

Status: Proposed (Epic 4 review) · Date: 2026-07 · Owner: founder decision

## Context

For a permanent product foundation, every concept must have exactly one
authoritative owner; derived engines consume but never overwrite it. The audit
found three concepts with two owners (facts, AI policy, legal coverage).

## Decision

Adopt the Source-of-Truth Matrix as the ownership contract. Key rulings:

- **Facts + epistemic status** → the **matter record**, via one shared
  `EpistemicStatus` enum + `Provenance` shape (Dino's assembler becomes a
  projection, not a second truth).
- **AI policy / confidentiality** → one shared primitive imported by both Dino
  and Matter.
- **Legal authorities** → **Legal Knowledge (Triad)**, single owner.
- **Legal coverage** → Triad owns *matter* coverage; Dino owns *answer* coverage;
  the boundary is documented and the overlapping sub-state vocabulary is shared
  (not merged).
- **Confidence / review routing** → shared primitive owns the shape; each engine
  owns values.
- **Audit / persistence** → data-application layer; engines emit, never own.

## Alternatives

1. **Let facts have two owners** — rejected: "is this fact confirmed?" gets two
   answers; unsafe for legal work.
2. **Merge Dino and Triad coverage into one** — rejected for now: different
   scopes (answer vs matter); merging risks over-generalizing. Documented
   boundary + shared sub-states is safer.

## Consequences

- One meaning per concept across all domains.
- The three duplications become the concrete pre-commit / near-term work items.

## Risks

- Reconciling the fact enum touches both modules. Mitigation: type-level,
  additive, test-guarded (ADR-0002).

## Revisit trigger

Any time a concept gains a second writer, or when a real matter is first routed
through Dino end-to-end.

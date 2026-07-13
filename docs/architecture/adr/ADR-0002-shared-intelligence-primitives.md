# ADR-0002 — Shared intelligence primitives

Status: Proposed (Epic 4 review) · Date: 2026-07 · Owner: founder decision

## Context

Dino and Matter independently model the same core concepts with divergent types:

- **Facts + epistemic status**: Dino `ContextItemStatus` vs Matter `FactStatus`
  (same "allegations are never facts" rule, different enum values).
- **AI policy / confidentiality**: `DinoAiPolicy`/`DinoConfidentiality` vs
  `MatterClient.aiPolicy`/`confidentiality` — **byte-identical unions defined
  twice**.
- **Confidence**: Dino `ConfidenceReport` (decomposed) vs Matter bare
  `confidence: number`.
- **Human review**: Dino `ReviewRoute` vs Matter bare `requiresHumanReview:
  boolean`.
- **Provenance**: Dino `ContextProvenance` vs Matter bare `source: string`.

Left unreconciled, every future domain copies one of the two shapes and the
divergence compounds.

## Decision

Extract a small **shared intelligence primitives** module (proposed
`src/modules/intelligence/core/`) owning the *shapes* (not the values) of:
`EpistemicStatus` (fact status), `AiPolicy`, `Confidentiality`, `Provenance`,
`ConfidenceReport`, `ReviewRoute`, and `Finding`/`Severity`. Dino and Matter both
import these; each engine still owns its *values*.

The **minimum safe pre-commit slice** is the four value-primitives that are
already duplicated and would freeze into the foundation: `EpistemicStatus`,
`AiPolicy`, `Confidentiality`, `Provenance`. `ConfidenceReport`/`ReviewRoute`
adoption by Matter can follow post-commit (additive enrichment, not a divergence
risk).

## Alternatives

1. **Do nothing** — rejected: freezes two fact models + two policy definitions.
2. **Make Matter depend on Dino's types** — rejected: creates a `matter → dino`
   edge, violating ADR-0001.
3. **Full shared library up front** (all primitives, both modules refactored) —
   deferred: larger change; only the four value-primitives are urgent.

## Consequences

- One meaning of "confirmed fact", one definition of the client's AI policy,
  across every domain.
- A neutral module both orchestrators depend on (no cross-domain edge).
- Matter's confidence/review models get richer over time by adopting the shared
  shapes.

## Risks

- The refactor touches type imports in both modules. Mitigation: it is
  type-level and additive (alias old names to shared types); no logic changes;
  full test suite guards it.

## Revisit trigger

Before the third intelligence domain is built, or if any duplicated primitive
diverges in a PR.

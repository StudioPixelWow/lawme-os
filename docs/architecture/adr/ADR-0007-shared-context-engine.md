# ADR-0007 — Shared Context Engine

Status: Proposed (Epic 4 review) · Date: 2026-07 · Owner: founder decision

## Context

Dino already assembles matter context (`MatterContextPackage`, stage 3); Matter
has its own `Matter` object. These are two representations of the same reality
with divergent fact/status shapes. Future domains (Client/Document/Office) would
each grow their own. The opposite failure — one giant context object passed
everywhere — is equally bad (coupling, over-sharing, broken privacy boundaries).

## Decision

Adopt **one canonical RLS-scoped source of truth per entity**, plus a **Shared
Context Engine** that assembles **bounded, per-engine context packages**
containing only the fields each consumer needs. Enforce AI-policy and tenant
minimization *inside* the assembler, uniformly for every consumer. Reconcile the
shared fact/policy/provenance primitives (ADR-0002) **first** — without that, the
SCE only formalizes the divergence.

## Alternatives

1. **One giant shared context object** — rejected: maximal coupling, over-shares
   private data, unenforceable privacy boundaries.
2. **Let each domain keep its own context** — rejected: N divergent fact models;
   the current 2-way divergence becomes N-way.

## Consequences

- Each engine gets a minimal typed package; no god object.
- AI policy and tenant isolation enforced in one place.
- Dino's stage-3 assembler and Matter converge onto the canonical store,
  deleting the duplicate fact representation.

## Risks

- Non-trivial future build. Mitigation: it is future work; only the primitive
  reconciliation is urgent now.

## Revisit trigger

When the second consumer of matter facts beyond Dino+Matter appears, or when the
canonical matter datastore is built.

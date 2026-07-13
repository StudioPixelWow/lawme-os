# Epistemic Status Model (Epic 4.1)

`src/modules/intelligence/core/epistemic-status.ts`

## The one rule

An allegation is never a fact. LawME encodes "how true is this statement" once,
so every domain applies that rule identically.

## Canonical `EpistemicStatus`

```
confirmed_fact            — established / verified
document_derived_fact     — derived from a document (a fact, with provenance)
client_allegation         — asserted by our client        (NOT a fact)
opposing_party_allegation — asserted by the other side     (NOT a fact)
disputed_fact             — contested between parties      (NOT established)
inference                 — reasoned, not directly asserted
assumption                — working assumption pending confirmation
unknown                   — not known
```

Two sets drive every gating decision:

- `FACT_STATUSES = { confirmed_fact, document_derived_fact }` — the only statuses
  that count as an established fact.
- `ALLEGATION_STATUSES = { client_allegation, opposing_party_allegation }`.

Helpers: `isConfirmedFact`, `isAllegation`, `isUnestablished`.

## Legacy reconciliation (why nothing broke)

Both domains keep their existing enum values for backward compatibility; the core
provides explicit, tested conversions.

**Matter** (`FactStatus`) → canonical:

| Matter legacy | canonical |
|---|---|
| `confirmed` | `confirmed_fact` |
| `document_derived` | `document_derived_fact` |
| `client_alleged` | `client_allegation` |
| `opposing_alleged` | `opposing_party_allegation` |
| `disputed` | `disputed_fact` |
| `unknown` | `unknown` |

`fromMatterFactStatus` / `toMatterFactStatus` round-trip losslessly.
`inference` and `assumption` have **no** Matter legacy value —
`toMatterFactStatus` returns `null` rather than coercing them, so nothing is
silently flattened.

**Dino** (`ContextItemStatus`) already uses the canonical names (a 7-value subset,
missing only `assumption`), so `fromDinoContextStatus` is a typed identity.

## Tested invariants

`src/modules/intelligence/core/__tests__/primitives.test.ts` asserts:

- every Matter legacy value maps to a canonical status;
- **no allegation ever maps to a confirmed fact** (the core safety property),
  for both Matter and Dino legacy inputs;
- only `confirmed_fact` / `document_derived_fact` are "established";
- Matter round-trips without meaning change;
- canonical-only statuses (`inference`, `assumption`) do not coerce into a Matter
  value.

## Why keep legacy enums instead of rewriting values

Rewriting Matter's stored string values (`"confirmed"` → `"confirmed_fact"`) would
have been a representation change touching every fixture, engine guard, and test
— higher risk with no behavioral benefit for this isolated refactor. The canonical
model + tested mappings achieve unification of the *concept* while preserving all
existing values and behavior. Full value convergence, if ever desired, is a
separate, mechanical follow-up guarded by these mapping tests.

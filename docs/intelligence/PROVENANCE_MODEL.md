# Provenance Model (Epic 4.1)

`src/modules/intelligence/core/provenance.ts`

## Purpose

One contract for "where did this come from", replacing Dino's `ContextProvenance`
and Matter's bare `source: string`. Consumers populate only the fields relevant to
them — safe optionality, no forced boilerplate.

## Contract

```ts
interface Provenance {
  origin: ProvenanceOrigin;      // required
  reference: string;             // required — loggable id / "user message"
  sourceType?: string;           // "statute" | "judgment" | "email" | "testimony" | ...
  sourceId?: string | null;
  documentId?: string | null;
  matterId?: string | null;
  userId?: string | null;
  recordedAt?: string | null;    // ISO
  verification?: VerificationState;   // verified | unverified | disputed | not_applicable
  confidence?: number | null;    // 0..1
  extractionMethod?: string | null;
  sourceUrl?: string | null;     // only where the source permits linking
  version?: string | null;
  reviewer?: string | null;
}

type ProvenanceOrigin =
  | "user_supplied" | "document" | "lawme_record"
  | "legal_knowledge" | "synthetic_fixture" | "derived" | "external";
```

## Design choices

- **Required minimum**: only `origin` + `reference`. Everything else is optional,
  so a Matter fact (`source: "תלוש שכר"`) and a Dino legal source (statute id +
  URL + version + verification) both fit without empty-field noise.
- **`sourceUrl` is permission-gated by convention**: populate it only for sources
  that may be linked (public/primary law). Private documents carry `documentId`,
  never a URL.
- **`verification`** carries the same honesty LawME applies everywhere — an
  unverified candidate is labelled `unverified`, never silently trusted.

## Adapters (migration)

- `provenanceFromSource(source, origin?)` — lift Matter's legacy string into the
  contract.
- `fromDinoContextProvenance({origin, reference, recordedAt})` — lift Dino's
  `ContextProvenance` losslessly (tested).

## Adoption

The contract is defined and adapter-tested now. Matter's `MatterFact.source`
remains a string in this epic (changing it touches every fixture); it upgrades to
structured `Provenance` when the matter datastore lands, using
`provenanceFromSource` as the bridge. Dino's `ContextProvenance` stays its local
shape with a tested adapter to the shared contract. This is deliberate incremental
adoption, not divergence — there is one canonical provenance contract.

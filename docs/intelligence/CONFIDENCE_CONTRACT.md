# Confidence Contract (Epic 4.1)

`src/modules/intelligence/core/confidence.ts`

## Two invariants, shared by every domain

1. Confidence is **decomposed** — never one unexplained number. `overallScore` is
   derived from `factors`, not asserted alone.
2. Confidence is **never a legal-outcome probability**. No "chance of winning".

The core shares the **output shape**; each domain keeps its own calculation.

## Contract

```ts
type ConfidenceBand =
  | "high" | "moderate" | "low"
  | "insufficient_evidence" | "not_applicable" | "human_review_required";

interface ConfidenceFactor {
  key: string; labelHe: string;
  score: number; weight: number; contribution: number; notesHe?: string;
}

interface ConfidenceReport {
  band: ConfidenceBand;
  overallScore: number;            // 0..1, derived from factors
  factors: ConfidenceFactor[];
  blockingUncertaintyHe: string[];
  reasonsHe: string[];
  requiresHumanReview: boolean;
  freshness?: { computedAt: string; stale?: boolean } | null;
  sourceCoverage?: number | null;  // 0..1
  disclaimerHe?: string;
  engineVersion?: string;
}
```

## Neutral bands vs Dino's POC bands

Dino's existing `ConfidenceBand` uses POC-flavoured values (`high_within_poc`,
`domain_mismatch`). Those are domain flavour and stay in Dino. The shared band is
neutral; `dinoConfidenceBandToShared` maps Dino → shared (tested):

| Dino | shared |
|---|---|
| `high_within_poc` | `high` |
| `moderate` | `moderate` |
| `low` | `low` |
| `insufficient_evidence` | `insufficient_evidence` |
| `domain_mismatch` | `not_applicable` |
| `human_review_required` | `human_review_required` |

## Adoption

Dino keeps its richer POC `ConfidenceReport` internally (unchanged — zero test
impact) and can emit the neutral shape via the adapter when composed across
domains. Matter currently emits a bare `confidence: number` per engine; the shared
`AssessmentEnvelope.confidence` accepts `ConfidenceReport | number | null`, so
Matter can adopt the decomposed report incrementally without a breaking change.
Full Matter adoption is a documented follow-up, explicitly *not* forced in this
epic (per ADR-0002 and the review's "share the shape, not the calculation").

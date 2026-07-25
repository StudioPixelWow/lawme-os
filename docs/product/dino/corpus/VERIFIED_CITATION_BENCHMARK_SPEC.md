# Verified-Citation Benchmark Spec (accompanies P1-S1)

**Package:** P1-S0 · **Status:** Founder decision draft — specification only (no code, no test implementation, no ingestion, no commits, no push).
**Parent:** [`../DINO_MASTER_SPECIFICATION.md`](../DINO_MASTER_SPECIFICATION.md) ([Vol 20](../DINO_MASTER_SPECIFICATION.md#volume-20--quality-and-evaluation), [Audit finding 1/5/10](../DINO_MASTER_SPECIFICATION.md#top-product-audit-findings--binding-responses)).

> **Prime directive.** Verified-citation accuracy is a **hard 100% gate**, not an average. One fabricated, mis-linked, wrongly-pinpointed, stale, or license-violating citation fails the release. Length, fluency, and count are **not** scored.

---

## 1. What the benchmark tests

Per emitted citation and per answer:

1. **Source identity accuracy** — the cited source is the intended real source (`sourceId`/`providerSourceId` match gold).
2. **Law title accuracy** — Hebrew title exact.
3. **Year accuracy** — enactment year exact.
4. **Section accuracy** — section correct.
5. **Subsection/clause accuracy** — subsection/clause correct.
6. **Official-link validity** — link resolves to the intended official/permitted target.
7. **Permalink stability** — the stored permalink matches gold and is marked stable.
8. **Excerpt accuracy** — any quoted text matches source text (hash) within license limits.
9. **Pinpoint accuracy** — pinpoint anchors the exact proposition; **no whole-document link presented as a pinpoint** ([R-5.7](../DINO_MASTER_SPECIFICATION.md#volume-5--verified-source-and-citation-standard)).
10. **Source-version accuracy** — the version cited is the in-force version for the `asOf` date.
11. **Amendment/currentness accuracy** — effective/amendment status matches gold; stale text is caught.
12. **Claim-to-citation relevance** — the citation actually supports the specific proposition (element-linked), not merely topical ([R-5.1](../DINO_MASTER_SPECIFICATION.md#volume-5--verified-source-and-citation-standard)).
13. **No citation fabrication** — every emitted citation exists in the verified corpus; no invented ids/links/pinpoints.
14. **No whole-document-as-pinpoint** — explicit check (see 9).
15. **License-compliant rendering** — excerpt length, display and export obey `LegalLicensePolicy`.
16. **Deterministic reproduction** — same question + corpus version + `asOf` ⇒ identical citations.

---

## 2. Benchmark case format

Each case is a frozen record:

```
BenchmarkCase {
  caseId
  doctrineId                 // from the V1 doctrine scope
  questionHe                 // realistic lawyer question
  contextKind                // general | matter
  matterFixtureRef?          // deterministic MI fixture if matter
  asOfISO                    // reference "now" (Asia/Jerusalem)
  expected: GoldRecord
  mustFailModes?             // e.g. expects needs_facts / out_of_scope
}
```

## 3. Gold-record format

Authored/curated by a legal editor against the official source; the source of truth for grading.

```
GoldRecord {
  expectedStatus             // answered | provisional | needs_facts | no_verified_authority | ...
  expectedCitations: [
    {
      sourceId, providerSourceId,
      titleHe, year,
      section, subsection?, clause?,
      versionId, effectiveStatus,
      permalink, officialBadge: true,
      pinpointRef | pinpointNone: true,
      supportsProposition            // the exact claim id it must attach to
      excerptHash?
      licenseDisplay: { maxExcerptChars, exportAllowed }
    }
  ]
  forbiddenCitations?        // ids that must NOT appear (distractors)
  expectedCoverageLevel      // substantial | partial | insufficient (never complete)
  notes                      // editor rationale
}
```

## 4. Doctrine distribution & size

- **Minimum questions (P1-S1 gate):** **60** cases total.
- **Distribution:** the **6 V1 Core** doctrines ≥ **8 cases each** (= 48), split across positive (citation expected), negative (`no_verified_authority`/`needs_facts` expected — must **not** fabricate), and distractor (a forbidden topical-but-irrelevant source must not be cited). Remaining **12** cases: Conditional-doctrine analysis-grade (must decline to conclude, cite statute for framing only) + `out_of_scope` (non-labor) + minimum-wage **currentness** cases (stale-rate trap).
- **Currentness sub-suite:** ≥ **6** cases specifically trap stale minimum-wage/amendment answers.
- **Reproducibility sub-suite:** every case is also run twice; citation sets must be byte-identical.

## 5. Expert review process

1. Legal editor authors gold records against official sources ([DR-3](../DINO_MASTER_SPECIFICATION.md#required-decision-records)).
2. Independent labor-law partner reviews a sample (≥ 30%) for correctness and relevance.
3. Disagreements resolved before a case enters the frozen set.
4. The frozen set is versioned with the `corpusVersion` it was authored against.

## 6. Hard release gates (P1-S1)

| Gate | Threshold |
|---|---|
| **G1 Fabrication** | **0** fabricated citations across all cases |
| **G2 Identity/title/year/section/subsection** | **100%** exact |
| **G3 Link + permalink validity** | **100%** resolve to intended target |
| **G4 Pinpoint / no-whole-doc** | **100%**; 0 whole-doc-as-pinpoint |
| **G5 Version + currentness** | **100%**; 0 stale-rate/stale-text passes |
| **G6 Claim relevance** | **100%** element-linked; 0 topical-only |
| **G7 License rendering** | **100%** within policy |
| **G8 Determinism** | **100%** identical on re-run |
| **G9 Negative cases** | **100%** correctly decline (no fabricated authority under pressure) |

**Any gate < 100% ⇒ release blocked.** No averaging, no partial credit, no waiver without a recorded founder decision.

## 7. Failure triage

On any failure: classify as (a) **corpus defect** (wrong/missing verified data → fix ingestion/verification, re-verify), (b) **retrieval defect** (right data, wrong selection → fix orchestrator/ranking), (c) **rendering defect** (right selection, wrong citation form/pinpoint → fix citation layer), or (d) **reasoning defect** (citation attached to wrong proposition → fix claim linkage). Each failure gets a regression case added before the fix is accepted.

## 8. Regression handling

The benchmark is part of the release gate ([Vol 20](../DINO_MASTER_SPECIFICATION.md#volume-20--quality-and-evaluation), [Vol 24](../DINO_MASTER_SPECIFICATION.md#volume-24--implementation-governance)). It runs on every corpus change and every slice touching research/reasoning/citation. A corpus-version bump requires re-running the full suite and re-freezing gold where the underlying law actually changed (with editor sign-off). Historical gold is retained for reproducibility.

## 9. Anti-gaming

The only currency-of-merit is *correct, relevant, verified, current, license-clean citations*. Metrics explicitly excluded from "quality": answer length, number of citations, breadth of topics touched. A longer answer with one bad citation **fails**; a short answer with only correct citations **passes** ([R-20.1](../DINO_MASTER_SPECIFICATION.md#volume-20--quality-and-evaluation)).

*Specification only — no test code, no ingestion, no commits, no push.*

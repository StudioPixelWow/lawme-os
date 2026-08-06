# Official Legislation Pilot — Results

Controlled official-publication pilot (Epic step 14), run 2026-08-06 through the
real Track A model (`toPublicationModel` + `buildAmendmentGraph` + deterministic
identity) over **live-captured** `GetLegislationLawItem` data, persisted to the
dev project `udispadsbxqicmawqcuk` (`legalai`). Artifacts:
`artifacts/knesset-official-publication-pilot.json`,
`artifacts/knesset-publication-pilot.csv`.

## Pilot sample (8 laws, diverse by design)

original+amendments, current + repealed, OB + non-OB, few + many corrections:
2000048 (חוק-יסוד: מקרקעי ישראל), 2000022, 2000072, 2000031 (חוק תרומת ביציות),
2000015 (חוק שמאי מקרקעין), 2000042 (חוק-יסוד: השפיטה), 2000029 (חוק תכנון משק
החלב), 2000003 (חוק הבחירות לכנסת — בטל). Batch size 10, concurrency 2,
checkpoint per law.

## Results (real)

| Metric | Value |
|---|---|
| Laws fetched | 8 |
| Publication records (captured) | 35 |
| Publication records (persisted, deduped) | 33 |
| PDFs discovered | 33 |
| Publications without a PDF | 2 |
| PDFs downloaded | 0 — operator step (no container egress) |
| PDFs extracted | 0 — operator step |
| Extraction failures | 0 |
| Sections parsed | 0 — depends on extracted PDF text |
| Amendment operations parsed | 0 — depends on extracted PDF text |
| Unsupported amendment operations | 0 |
| Relationships created | 60 (61 built, 1 duplicate collapsed) |
| Storage bytes (PDF) | 0 — operator step |
| Idempotent (deterministic rerun) | true |

Document-type distribution: `original_enactment 8`, `amendment_law 8` (עקיף),
`correction 18` (ישיר), `official_gazette_pdf 1`.

## Update 2026-08-06 — live PDF fetch + extraction executed

The metadata-tier zeros above were superseded by an actual live run (browser
carried the network, since the container is air-gapped from `fs.knesset.gov.il`).
See `knesset-pdf-extraction-report.md` + `artifacts/knesset-live-pdf-pilot.*`:

| Metric | Value |
|---|---|
| PDFs downloaded | 31 / 31 (100%) |
| PDFs rejected / quarantined | 0 / 2 |
| Text extraction success | 100% (93.5% high-confidence) |
| OCR used | 0 |
| Total bytes / pages / chars | 7.65 MB / 340 / 968,067 |
| Sections parsed (real parser, sample) | 3/3 (pub 147462) — persisted + FTS-searchable |
| Amendment operations (real parser, sample) | 4 (3 parsed, 1 needs_review) — persisted |

Extraction metadata (sha256, size, pages, confidence, raw_text_hash) persisted
to all 31 `law_publications`; nothing published. Decision for the broad backfill:
**GO_WITH_FIXES** (see `knesset-backfill-decision.md`) — so no backfill started.

## Data-quality findings (real, surfaced not hidden)

- **Shared omnibus itemId:** ס״ח 3016 / itemId 2199304 amends *two* laws
  (חוק שמאי מקרקעין 2000015 and חוק תרומת ביציות 2000031). Stored as **one**
  publication with an `amends` edge to **each** law — verified live.
- **Duplicated itemId within a law:** 2000003 → 147021 appears twice (a
  correction-of-error PDF days later). Collapsed to one publication by the
  `ON CONFLICT DO NOTHING` key; flagged in the pilot's `dataQuality` block. The
  35→33 delta is exactly these two collisions.
- **Self-loop guard:** the duplicate-itemId case would create a `follows`
  self-edge; `buildAmendmentGraph` now skips `from == to`.

## Persistence verification (dev)

```
law_publications        33   (0 published, 0 non-default consolidation_status)
law_publication_edges   60   (0 self-loops)
Law entities (canonical) 8
RLS enabled              law_publications ✓  law_publication_edges ✓
demo legal_chunks        4 (non_authoritative_demo, 0 published)  ← gate intact
published sections/chunks 0
Idempotency rerun        counts unchanged (33 / 60 / 8)
```

## Search examples (step 16, run on dev)

- **By IsraelLawID 2000042 (חוק-יסוד: השפיטה):** returns the full timeline —
  original 1984 (ס״ח 1110, עמ׳ 78) → corrections #1–#4 (1992/2002/2023/2025)
  with ספר-החוקים number, page, official PDF URL, each labelled
  `non_consolidated_publication`.
- **By ספר-החוקים 3016:** returns the omnibus publication and, via `amends`
  edges, **both** laws it modifies (2000015 + 2000031).

## Decision — Official Publication Corpus

```
GO_WITH_FIXES
```

The official-publication route is real, lawful (§6 content-open; robots
permissive; identity deterministic), and works end-to-end at the metadata tier
with clean idempotency and safety invariants. Required fixes before scale:
(1) run the operator-side PDF download+extraction to populate text, sections and
amendment operations; (2) implement `(itemId, publicationDate)` fallback for
same-law itemId collisions; (3) expand the pilot to the full 50 laws; (4) add the
incremental checkpoint keyed on `IsraelLawID + correctionNumber` end-to-end.

# Knesset Corpus — Post-Backfill Quality Sample

Date: 2026-08-07. Read-only assessment against the dev project after the phased
controlled backfill completed (phases 1→50, 2→100, 3→350 discovered laws).
Artifact: `artifacts/knesset-quality-sample.json`. This is the gate the founder
set: *nothing is published until a ≥50-publication quality sample passes.*

## Corpus at a glance

```
laws                     527
sections                 1,330   (10 empty-body, 0.75%)
publications             4,287   (4,286 validated · 1 quarantined)
  full-text (has PDF)    3,003
  metadata-only          1,283
chunks                   3,804   (0 empty · 0 tiny · avg 994 chars)
amendment operations    10,188   (stored; see finding A1)
stored objects           2,967   (100% verified)
bucket size            533.9 MB
published                    0   (publications AND chunks)
```

## What passes

Authority labeling — 100% of validated publications carry
`authority_level=primary_official`, `consolidation_status=non_consolidated_publication`,
and `license_basis=statutory_exemption_sec6` (4,286/4,286). The core invariant —
**never presented as consolidated text** — holds across the whole corpus.

Provenance chain — every full-text publication (3,003) carries both
`pdf_object_key` and `pdf_sha256`; all 2,967 content-addressed objects are
round-trip verified. The binary→publication→law chain is complete.

Quarantine — 1 of 4,287 (0.02%), a genuinely image-only PDF correctly held by
the corrected content-page metric. Zero false positives across 3,021 phase-3 PDFs.

Text coherence & structure — sampled section text is coherent, complete Hebrew
legal prose. Chunks are clean (0 empty, 0 tiny, avg 994 chars). Section-number
format is 100% well-formed. Amendment-op type distribution is sound, average
confidence ≥0.70 per type, with only 1 `needs_review` and 1 `ambiguous`.

Publish gate — 0 published. Intact.

## Findings (none are publish-safety blockers; all are quality/completeness)

Text fidelity (the extracted TEXT layer, not the authoritative PDFs):

- **F1 (medium)** — Two-column gazette *marginal section-captions* (side headings)
  are interleaved into section body text by the flat pdf-parse text layer. The
  text is complete but not display-clean. Fix: layout-aware / column-separated
  extraction (pdf.js text-layer geometry) to isolate the marginal-note band.
- **F2 (low)** — Glyph confusions on older font-encoded PDFs (daled/resh,
  nun/gimel; the `TT: undefined function: 32` fonts) cause occasional character
  errors. Fix: font ToUnicode/CMap-aware remap; flag affected pubs.
- **F3 (low)** — Footnote digits occasionally glue onto section numbers
  (e.g. `1424` for §142). Fix: strip trailing footnote-reference digits.
- **F4 (low)** — 10 Section entities (0.75%) have empty body text.
- **F5 (low)** — 81 full-text pubs have stored bytes + SHA but a null
  `source_url`. Fix: backfill from `pdf_url` / object key.

Amendment graph completeness:

- **A1 (medium)** — The `amendment_operations` unique key
  `(publication_canonical_id, source_span_start, operation_type)` collapses
  genuinely-distinct operations that share a clause start-offset and type.
  Across phases ~29k parsed ops persisted as 10,188 (~60% dropped on
  `ON CONFLICT DO NOTHING`); confirmed on high-volume laws (2000944: 2,861
  attempted → 848 stored; 2000907: 1,083 → 328). Does **not** touch the
  PDF/text corpus or publish safety — ops are gated machine assertions. Fix:
  add an additive deterministic `op_fingerprint` column
  = `sha256(target_section|operation_type|old_text|new_text|span_start|span_end)`,
  make the unique key `(publication_canonical_id, op_fingerprint)`, and reprocess
  amendments from stored bytes to backfill the dropped operations.

Cosmetic:

- **C1** — `ingestion_checkpoints` has 0 rows (per-law checkpoint upsert silently
  no-ops). Resume works via the "laws already ingested" existence check, so
  non-blocking.
- **C2** — 7 legacy-type ops predate the `KEEP_OP_TYPES` filter.

## Verdict

As a **source + provenance layer**: **PASS.** Official PDFs stored and 100%
verified, text extracted and clearly labeled machine-derived, 100% labeled
non-consolidated primary-official, fully gated unpublished.

As **display-ready statutory text**: **NOT YET.** Marginal-caption interleaving
(F1) and glyph fidelity (F2) mean the extracted text is not clean enough to
present *as* authoritative law text.

**Publish recommendation: KEEP unpublished.** The source PDFs are authoritative
and may be surfaced as source documents with the machine-derived text labeled as
such. Do not flip extracted text to `published` until F1+F2 are addressed and the
amendment dedup key (A1) is fixed and reprocessed. F3–F5 and C1–C2 are cleanup.

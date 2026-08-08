# LAW ME — Annotation Independence Rule (mandatory)

The benchmark exists to judge extraction engines — the deterministic `layout-2`
extractor and every candidate OCR/layout engine — against ground truth that was
produced **independently of any of them**. If a model produced the ground truth,
the benchmark would be measuring the model against itself, and every score would
be meaningless. This rule protects that independence. It is not advisory.

## What the model (AI) may do

- Build and maintain this workspace and its tooling.
- Provide the layout-2 **draft** as an annotation accelerator — a starting point
  the human edits — as long as it is clearly marked as a draft and is never
  accepted automatically.
- Run non-AI, deterministic validation: presence of required fields, uniqueness
  of region ids, coordinate ranges, page-number consistency, reviewer ≠
  annotator, and similar structural checks.

## What the model must never do

- Transcribe a benchmark page into final ground truth.
- Choose or "fix" the reading order.
- Decide region truth (what is body, caption, table, …).
- Decide or confirm the stratum.
- Decide APPROVED or UNRESOLVED.
- Act as the second reviewer.
- Auto-correct or silently alter any human field.

Every final semantic field — reading-order text, regions, captions, section
boundaries, page alignment, stratum, the APPROVED/UNRESOLVED decision — must be
set by a human, from the official PDF.

## How the tooling enforces this

- The draft is written with `_draft: true` from `layout-2` only (never a
  candidate engine), and the workspace never writes it to `ground-truth/`
  without a human save. Loading the draft into a page is an explicit, confirmed
  action.
- Validation in `annotation-core.ts` checks **structure and human-supplied
  metadata only**. It reads no page images and makes no semantic judgement. It
  cannot, for example, decide whether a transcription is *correct* — only whether
  a human has supplied one.
- Final states are reviewer-set and gated on a distinct second reviewer, so no
  automated path can mark a page APPROVED or UNRESOLVED.
- Because scoring (`score-benchmark.ts`) self-gates on `FROZEN-v1.json`, no
  engine output can be compared to — or leak into — the ground truth before the
  human review is complete and frozen.

## Why the draft is still allowed

Showing the human a layout-2 draft speeds transcription without compromising
independence, because the human reads the **PDF**, not the draft, as the
authority, and edits everything. The draft that accelerates annotation is the
deterministic extractor — one of the very engines the benchmark will later
score — which is exactly why the human must treat it as a suggestion to correct,
not a truth to accept. Candidate OCR/layout engines are never shown during
annotation, so their outputs cannot bias the annotator toward or against any
engine under evaluation.

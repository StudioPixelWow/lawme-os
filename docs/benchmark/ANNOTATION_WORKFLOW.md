# LAW ME — Benchmark Annotation Workflow

The permanent Knesset layout/extraction benchmark is only as trustworthy as its
human ground truth. This document is the operating manual for producing that
ground truth for the 108 fixed pages, using the local annotation workspace.

The pipeline has one shape and only one:

```
prepare → first human annotation → validation → second review → disagreement resolution → complete → freeze
```

Nothing is frozen until every page has passed through it.

## Roles

There are two human roles, and they must be **different people** on any given
page:

- **Annotator** — transcribes and marks up the page from the official PDF.
- **Second reviewer** — independently checks the annotator's work and decides
  APPROVED / RETURN / UNRESOLVED / FLAG DISAGREEMENT.

The freeze gate refuses any page whose reviewer equals its annotator, so the
second review is real, not a rubber stamp.

## The page lifecycle

Every page moves through explicit states. The workspace shows the current state
as a coloured badge, and the dashboard counts every state live.

```
UNSTARTED → IN_PROGRESS → READY_FOR_REVIEW
   → (reviewer) APPROVED     ┐ freeze-eligible (with a distinct reviewer)
   → (reviewer) UNRESOLVED   ┘
   → (reviewer) NEEDS_CORRECTION → IN_PROGRESS …
   → (reviewer) CONFLICT → (human resolves) → READY_FOR_REVIEW …
```

Two rules keep the data honest:

- **Only a reviewer can set a final state** (APPROVED / UNRESOLVED). The
  annotator can only propose readiness by moving a page to READY_FOR_REVIEW.
- **Editing a reviewed page invalidates the review.** If an annotator changes
  any semantic field on a page that was already APPROVED/UNRESOLVED, the
  workspace automatically clears the review, drops the page back to
  READY_FOR_REVIEW, and preserves the prior review in the page's history. There
  are no silent stale approvals.

## Commands

Run all commands from the repository root.

```bash
# 1. PREPARE (operator, networked) — pull each page's PDF from Object Storage and
#    generate a layout-2 DRAFT per page (accelerator only; never ground truth).
node --experimental-strip-types benchmark/knesset-layout/prepare-annotation.ts

# 2. ANNOTATE + REVIEW (local) — open the workspace in a browser.
node --experimental-strip-types benchmark/knesset-layout/annotate-server.ts
#    → http://localhost:8787

# 3. CHECKPOINT (any time) — safety backup of current progress. NOT a freeze.
node --experimental-strip-types benchmark/knesset-layout/checkpoint-annotations.ts --stamp 2026-08-08T1030

# 4. PRE-FLIGHT — is the set ready to freeze? Reports what remains. Writes nothing.
node --experimental-strip-types benchmark/knesset-layout/preflight-freeze.ts

# 5. FREEZE — only when pre-flight says READY (108/108 final + second-reviewed).
node --experimental-strip-types benchmark/knesset-layout/freeze-benchmark.ts --freeze --stamp 2026-08-08
```

## What each page requires to be marked done

The **same validation** runs live in the workspace, in checkpoint, in
pre-flight, and in freeze — it is defined once, in `annotation-core.ts`, so the
four can never disagree. A page cannot be marked READY_FOR_REVIEW (or approved)
while any required field is missing.

Required for an APPROVED page:

- benchmark id, source document id, source page number (checked against the
  manifest — a page-number mismatch is an error);
- confirmed stratum (a known stratum, human-confirmed);
- a non-empty reading-order transcription, and at least one region marked
  `body`;
- section boundaries and marginal captions where applicable;
- page-alignment metadata (a printed folio label, or `none` if the page truly
  has none);
- a Hebrew/glyph fidelity note (`no issues` if clean);
- annotator identity and annotation timestamp.

For an UNRESOLVED page, the transcription may be omitted, but an
`unresolved_reason` (a human explanation of why the page cannot be determined)
is required.

## Dashboard

The bottom-left panel is a live dashboard: totals for every state
(unstarted, in-progress, needs-correction, ready-for-review, approved,
unresolved, awaiting-second-review, second-reviewed, conflicts, and
ready-to-freeze), plus per-stratum progress (annotated / reviewed / approved /
unresolved / conflicts) with bars. It always reflects the files on disk.

## Save safety

Saves are atomic (temp file + rename), so a crash can never leave a
half-written record. Edits autosave every few seconds; a "saved ✓" timestamp and
an "unsaved…" indicator show the current state; closing the tab with unsaved
edits prompts a warning; and if the browser crashed mid-edit, the workspace
offers to recover the last local autosave when you return to the page.

See `REVIEWER_GUIDE.md` for the second-review and disagreement flow,
`FREEZE_PROTOCOL.md` for the freeze gate, and `ANNOTATION_INDEPENDENCE.md` for
the rule that keeps the AI out of the ground truth.

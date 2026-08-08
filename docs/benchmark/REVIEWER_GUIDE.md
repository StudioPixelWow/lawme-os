# LAW ME — Second Reviewer Guide

The second reviewer is the benchmark's quality gate. Your job is not to re-do the
annotation but to independently confirm that it is correct against the official
PDF, and to make one of four explicit decisions. A page is only worth freezing
once a reviewer who is **not** its annotator has signed off.

## Entering review mode

Press `R` in the workspace to toggle **SECOND REVIEWER MODE** (the mode chip at
the top turns purple). In this mode you see:

- the official PDF page on the left (the sole authority);
- the annotator's result on the right (their transcription, regions, captions,
  boundaries, alignment, stratum, notes);
- the clearly-marked layout-2 draft for comparison (a suggestion only);
- the live validation summary for the page;
- which fields you have changed versus the annotator's version;
- the annotator's identity.

Enter your **reviewer identity** in the review box. It must differ from the
annotator — the workspace (and the freeze gate) reject a self-review.

## The four decisions

- **APPROVE** (`A`) — the annotation is correct. The page becomes APPROVED, and
  your identity + timestamp are recorded as the second review. If you made small
  corrections in the form before approving, those corrections are saved as the
  ground truth (a reviewer-corrected approval). APPROVE is refused if the page
  still fails validation.
- **RETURN FOR CORRECTION** (`N`) — the annotation needs work. Provide a review
  note describing what to fix. The page goes to NEEDS_CORRECTION and returns to
  the annotator. A note is required.
- **MARK UNRESOLVED** (`U`) — the page genuinely cannot be determined from the
  PDF (torn/blank scan, illegible, ambiguous beyond resolution). An
  `unresolved_reason` is required. UNRESOLVED pages are excluded from scoring
  later, but they must still be second-reviewed to be frozen.
- **FLAG DISAGREEMENT** — you disagree with the annotator and want a human
  decision on record. Provide a note. The page enters CONFLICT (see below). A
  note is required.

## Disagreements

When you flag a disagreement, the workspace stores both the annotator's version
and your proposed correction, field by field, and marks the page CONFLICT. A
CONFLICT page is never freeze-eligible.

Resolving a conflict is an explicit human act. In the conflict panel someone
chooses to keep the annotator's version, keep the reviewer's version, or keep a
manually merged version. Both earlier versions remain in the page's history —
nothing is overwritten silently. Resolution clears the conflict and returns the
page to READY_FOR_REVIEW, so it gets a fresh second review before it can be
frozen.

## Re-review after edits

If an annotator edits a page you already approved, your approval is automatically
invalidated and the page returns to READY_FOR_REVIEW. This is by design: an
approval only means something for the exact content you reviewed. You will see
such pages again in the "awaiting review" queue (`Shift+J` / `Shift+K` jump
through them).

## History

Every save and every review action is appended to the page's history
(`ground-truth/history/<id>.jsonl`): who did what, when, which fields changed,
and the state transition. Press **history** on a page to read its full trail.

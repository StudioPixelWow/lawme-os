# Sprint 1 — Perfecting the Morning Workspace

**Scope:** visual refinement only, per the approved direction. No CRM, no cases, no
database, no new features. Mock data unchanged in nature (typed, realistic Hebrew).

## What was refined

1. **Hero** — new `--text-hero` token (clamp 44→68px, weight 700, tight tracking);
   more breathing space above and inside the greeting; official logo remains in the
   top bar of the hero viewport.
2. **Attention panel** — rows became **large elegant cards**: title + priority chip,
   matter + detail line, time with clock glyph, and a concrete action per card
   (לתדריך הדיון / לצפייה במסמך / לשליחת עדכון), hairline-divided footer, hover lift.
3. **AI intelligence panel** — operational polish: live status dot, findings hover
   depth, refined CTA with direction arrow, provenance zone separated by hairline.
4. **Timeline (signature)** — day-progress line (passed time in solid ink), floating
   glass **now-marker** (10:42, breathing gold dot), connectors from dots to cards,
   next event elevated with gold chip «הבא · בעוד 48 דק׳», done events marked
   «הסתיים» and quieted, hover lift on upcoming cards.
5. **Sections differentiated** — matters: tone hairline per row; documents: ink
   file-type tiles (PDF/DOC); meetings: day-grouped agenda (היום/מחר/יום ג׳);
   AI insights and finance keep their distinct identities.
6. **Floating navigation** — the side rail now floats (rounded, raised paper, soft
   depth, hover glide); mobile bottom bar floats as a rounded glass island with
   safe-area handling.

## Validation

lint ✓ · typecheck ✓ · build ✓ · zero horizontal overflow at 1440/1024/390 on all
routes · RTL verified · reduced-motion via tokens.

## Screenshots

`docs/reviews/sprint-1/screenshots/`: desktop-full, desktop-hero, desktop-timeline,
tablet, mobile.

**Awaiting founder review before any further features.**

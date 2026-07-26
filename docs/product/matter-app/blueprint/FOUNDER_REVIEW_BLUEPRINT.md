# Founder Review — The Matter App Blueprint (FROZEN pending approval)

Status: complete, awaiting founder approval. **No code, no React, no Tailwind, no
HTML, no implementation.** HEAD `13cbaa2`. This Blueprint is the intended single source
of truth for the Matter App before any UI is built.

## What was produced

`docs/product/matter-app/blueprint/`:
- `MATTER_APP_BLUEPRINT.md` — master / freeze statement / the frozen room.
- `01_WIREFRAMES.md` — measured hi-fi ASCII (desktop 1440 · tablet 1024 · mobile 390),
  real zone widths, healthy + blocked states, evidence drawer, focus mode.
- `02_INTERACTION_BLUEPRINT.md` — every click, hover, keyboard shortcut, drawer, sheet,
  collapse, focus transition; the five action-gating classes.
- `03_MOTION_BLUEPRINT.md` — functional-only motion via tokens: appearance, urgency,
  deadline change, דינו surfacing, panel expansion; reduced-motion gates.
- `04_VISUAL_HIERARCHY_BLUEPRINT.md` — exactly where the eye lands at 1s / 5s / 30s, the
  strict weight ladder, what must never invert it.
- `05_MICRO_INTERACTION_BLUEPRINT.md` — hover · selection · pressed · loading · saving ·
  failure · success · blocked · review-required, each with visual + motion + a11y.
- `06_ATTENTION_BLUEPRINT.md` — the one-competitor rule, what may compete, what never
  competes, what is intentionally quiet, the escalation ladder.
- `07_DESIGN_CRITIQUE.md` — the Apple/Linear/Stripe/Notion/Figma/Arc reduction, run
  until nothing more can be removed.
- this review.

## The frozen product, in one line

One matter at a time, run from a **room**: a **Decision Core** hero (identity · posture
chip · one דינו sentence · one action) sitting on the **now-node** of a **Milestone
Spine**, with a quiet **Context Dock** of lenses, and דינו as **sourced gold seals +
an on-request tool** — never a chatbot. Three default zones, one hero, one action, two
accents; everything else one interaction away.

## The frozen guarantees (release gates for any build)

- Five-second answers (identity · posture · urgent · blocker · next action · owner ·
  due · review) all above the fold.
- One hero per viewport; ≤ gold + one semantic color; no card grid, no KPI/radar, no
  dashboard, no chatbot panel (the 52 nevers).
- Categorical before numeric; unavailable ≠ zero; no blended percentage; no outcome
  probability; no chain-of-thought.
- Every claim sourced (evidence one hover / one click away); human-in-the-loop explicit;
  fail-closed and visible; a degraded matter never reads healthy; a new matter never
  looks broken.
- Keyboard-first, RTL-native, IS 5568 / WCAG 2.0 AA, reduced-motion safe; zero overflow
  at 390/1024/1280/1440.
- Every surface is a pure function of `MatterProfile` + the Procedure Graph + (on
  request) Dino — the view computes nothing.

## Relationship to prior epics

This Blueprint consolidates and freezes Epic 5 (product architecture) + Epic 5.1
(design review, Recommendation B) against the LawME Design Bible v1.0. It does not
change code, the Design System, or the Epic 5/5.1 documents; it is the layer that makes
them buildable and final.

## Founder decisions required

1. **Freeze the Blueprint** as the single source of truth for the Matter App.
2. Confirm the three-zone Reduced-Premium default (Decision Core · Spine · Dock).
3. Confirm דינו-as-seals + on-request (no chatbot panel) and Score-as-rail (no grid).
4. Confirm the motion budget (rise-in · one breathing node · re-aim only).
5. Decide whether to commit Epic 5 + 5.1 + this Blueprint together as the product-freeze
   commit (docs only), or hold for further review.

## Recommended immediate next step

Approve and freeze. Then — only on a separate, explicit build approval — implementation
begins at Slice 1 (Static Product Skeleton) per `MATTER_APP_IMPLEMENTATION_SLICES.md`,
measured against this Blueprint. No implementation begins until then.

Do not write code. Do not implement components. Wait for founder approval.

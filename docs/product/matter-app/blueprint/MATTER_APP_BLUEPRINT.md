# The Matter App Blueprint — FROZEN

**The single source of truth for the Matter App, before any UI implementation.**
Sealed on the Matter Room composition · built on the LawME Design Bible v1.0 ·
bound to `MatterProfile` (Matter Intelligence + Score + Narrative).

No code. No React. No Tailwind. No HTML. When this Blueprint and an implementation
disagree, the implementation is wrong.

---

## What is frozen

- **The composition:** the **Matter Room** (Reduced Premium) — one matter at a time,
  the **Milestone Spine** as the structure, the **Decision Core** as the hero
  headline, the **Context Dock** for lenses, דינו as **seals + on-request**. (Epic
  5.1 Recommended Composition.)
- **The five product objects:** Decision Core · Milestone Spine · Score Lens ·
  Intelligence Lenses (Context Dock) · דינו — plus the Deadline object (the strongest
  in the language). Nine regions collapsed to five (Epic 5.1 §Reduction).
- **The data contract:** every surface is a pure function of `MatterProfile`
  (`state`, `score`, `prioritizedActions`, `narrative`) + the Procedure Graph +
  (on request) Dino. Nothing is computed in the view.
- **The laws:** one hero per viewport · two accents max (gold + one semantic state) ·
  categorical before numeric · fail closed and visible · every claim sourced ·
  human-in-the-loop explicit · Hebrew-first RTL · the Bible's 52 nevers.

## The seven blueprints

1. `01_WIREFRAMES.md` — measured high-fidelity ASCII (desktop 1440 · tablet 1024 ·
   mobile 390), with real zone proportions.
2. `02_INTERACTION_BLUEPRINT.md` — every click, hover, keyboard shortcut, drawer,
   sheet, collapse, and focus transition.
3. `03_MOTION_BLUEPRINT.md` — functional motion only: how every object appears, how
   urgency shows, how a deadline changes, how דינו surfaces, how panels expand.
4. `04_VISUAL_HIERARCHY_BLUEPRINT.md` — exactly where the eye lands at 1s / 5s / 30s.
5. `05_MICRO_INTERACTION_BLUEPRINT.md` — hover · selection · pressed · loading ·
   saving · failure · success · blocked · review-required.
6. `06_ATTENTION_BLUEPRINT.md` — what competes for attention, what never competes,
   what is intentionally quiet.
7. `07_DESIGN_CRITIQUE.md` — the Apple / Linear / Stripe / Notion / Figma / Arc
   reduction pass, run until nothing more can be removed.

Plus `FOUNDER_REVIEW_BLUEPRINT.md` — the approval summary.

## The frozen room, in one paragraph

An attorney opens a matter into a **room**. A navy rail (right/start) holds the OS;
a glass command bar spans the top. The canvas center is the **Decision Core** — the
matter's name, its **posture as the headline chip**, one sentence of דינו's briefing,
and **one action** — sitting on the **now-node** of a **Milestone Spine** that runs
down the canvas showing where the matter has been, is, and is going, with a single
gold meridian marking "now". A quiet **Context Dock** (left/end) holds the Score rail,
the nearest deadline, presence, and collapsed **lenses** (evidence, documents, legal,
client, team, finance, risk) that open one at a time. דינו is a **gold seal** on the
one object he has a finding about, and a tool you summon — never a chatbot. Blur the
text and it is unmistakably LawME, and unmistakably the Matter App.

## Reading order for the build team

Read `07_DESIGN_CRITIQUE.md` first (what and why we reduced), then `01`–`06` as the
specification. `04` and `06` govern layout weight; `02`/`03`/`05` govern behavior.
Every measurement, state, and motion here is a release gate.

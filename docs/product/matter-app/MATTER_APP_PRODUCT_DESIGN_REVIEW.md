# Matter App — Product Design Review (Epic 5.1)

The final product-design review before any Matter UI is built. It reviews the
Epic 5 nine-region architecture critically against the **LawME Design Bible v1.0**
(the sealed foundation) and the intelligence contracts already shipped
(`MatterProfile`). It simplifies, re-composes, and visualizes the Matter
experience to a world-class standard.

Reviewed as an **application inside LawME** — the "Matter App" — not a page, not a
CRM record, not a dashboard.

## Governing constraint discovered in review

The Design Bible **already specifies the Matter Workspace** (§2.2, §9, §17): it
"feels like Linear," runs **one matter at a time**, uses the **milestone/procedure
track as the spine of the screen**, the **state chip as the room's headline**, the
**gold meridian marking "now"** on the track, the **Context Dock** returning here,
and it is "the densest workspace in LawME — operational, not cramped." The Epic 5
architecture must be reconciled with this vision. Where Epic 5 and the Bible
disagree, the Bible wins.

This single fact is the spine of the whole review: Epic 5 described the *right data
and hierarchy* but expressed it as a generic nine-region page. The Bible demands it
be expressed as a **matter room** with a milestone spine and a single hero.

---

## Recommendation

**B — Epic 5 architecture requires a small, documentation-only product revision
before visual prototyping.**

The information hierarchy, the five-second answers, the data bindings, the AI
tiering, and the safety rules are all correct and stay. Three revisions are
required, all in documentation, none in code:

1. **Promote the Procedure/Milestone Track to a primary structural object (the
   spine).** In Epic 5 it was buried inside Region F (`panel.procedure`). The Bible
   makes it the spine of the room. It must become a top-level object bound to the
   Procedure Graph + `state.stage` with the gold meridian on the current stage.
2. **Collapse the nine regions into ~5 product objects** to satisfy the one-hero
   law and the "five large product objects" law. Regions A–D merge into the
   **Decision Core** (the room headline); Region E becomes the **Score Lens** (a
   diagnostic health rail, not a 12-cell KPI grid — the Bible forbids KPI grids);
   Region F becomes **Intelligence Lenses** in the Context Dock; Regions G/I become
   **דינו seals + evidence drawers**; Region H folds into the spine/score history.
3. **Re-express "Score grid" as a Score Lens.** A default 12-cell grid violates
   forbidden rules #1/#3/#10. The score appears as an ordered diagnostic rail
   (weakest→strongest) with a focused lens on click.

Exact documents affected and before/after hierarchy are in
`MATTER_APP_REDUCTION_REVIEW.md` and `MATTER_APP_RECOMMENDED_COMPOSITION.md`. No
code, no Design-System change.

---

## Primary question — can the attorney answer these in five seconds?

With the recommended composition (the Matter Room), yes — all eight are in the hero
(Decision Core) above the spine, none require scrolling:

| # | Question | Where it lives | Source |
|---|---|---|---|
| 1 | What is happening? | narrative headline in the Decision Core | `narrative.headlineHe` |
| 2 | On track? | the state chip (posture) — the room headline | `score.summary.posture` |
| 3 | Most urgent issue? | the single dominant concern line | `score.summary.dominantConcernHe` |
| 4 | What's blocking? | the top blocker on the current spine node | `score.summary.topBlockers[0]` |
| 5 | What next? | the one primary action (CTA) | `prioritizedActions[0]` |
| 6 | Who acts? | owner on the action | `prioritizedActions[0].ownerRoleHe` |
| 7 | By when? | due on the action / the next deadline object | `prioritizedActions[0].dueHe` / nearest `when` |
| 8 | Review needed? | the review seal on the headline | `state.requiresHumanReview` |

The Epic 5 nine-region page *technically* answered these but spread them across four
regions; the Matter Room concentrates them into one hero + one spine node, which is
what makes the five-second test pass with confidence.

---

## Phase 1 — critical self-review of the nine regions

For each Epic 5 region: the decision it serves, and its fate in the Matter Room.

| Region | Decision it serves | Verdict | Becomes |
|---|---|---|---|
| A Header/Identity | who/where am I; triage | keep, merge | part of the **Decision Core** (identity + state chip headline) |
| B Briefing (Narrative) | what's happening | keep, merge | the **narrative line** of the Decision Core |
| C Needs You Now | what's urgent/blocking | keep, merge | urgent line + top blocker on the Decision Core / current spine node |
| D Next Actions | what to do, who, when | keep, merge | the **one primary action** (hero CTA) + a short action list in the dock |
| E Score overview | decomposed health | **re-express** | the **Score Lens** (diagnostic rail, not a grid) |
| F Intelligence panels | drill any area | keep, restructure | **Intelligence Lenses** in the **Context Dock** (one focus at a time) |
| G Ask Dino | deep legal work | keep, restructure | **דינו** — ambient seals on objects + on-request assistant (not a panel) |
| H Trend/History | is it improving | merge | folded into the **spine** (stage history) + Score Lens history |
| I Provenance/Audit | why? | keep as pattern | the **evidence drawer** (hover glimpse, click drawer) — the Bible's דינו pattern |
| — Procedure track | where in the process, what blocks transition | **promote** | the **Milestone Spine** — the room's structural backbone (was under F) |

Result: **nine regions → five product objects** (Decision Core, Milestone Spine,
Score Lens, Intelligence Lenses/Context Dock, דינו) + the Deadline object (the
strongest object in the language) surfaced in the core. This honors the one-hero
law and the five-object law while losing no information — everything removed from
permanent space is one interaction away.

---

## Phase 22 — the ten conclusions

1. **First five seconds:** matter identity + practice-area seat, the state chip
   (posture) as the headline, the narrative one-liner, the current milestone node
   with the gold meridian, the nearest deadline, the one primary action (owner +
   due), and a review seal if required.
2. **The one primary action:** the top of `prioritizedActions` — a single verb-first
   CTA on the hero (e.g. "השלם תצהיר עד מחר ←"). Every matter has exactly one.
3. **Always visible:** the Decision Core (identity + state chip + narrative + the
   one action + review seal) and the Milestone Spine with the "now" node.
4. **One interaction away:** the Score Lens detail, any Intelligence Lens (evidence,
   documents, legal, client, team, finance, risk), any stage's detail on the spine,
   the deadline ledger, and any claim's evidence drawer.
5. **Never by default:** the 12-cell score grid, full lists, finance for
   unpermitted roles, provenance walls, chain-of-thought (never), outcome
   probability (never), unverified case numbers as fact (never).
6. **Uniquely LawME:** the milestone spine with the gold meridian on "now," the
   state-chip-as-headline, דינו as evidence-backed seals inside the work (never a
   chatbot), the two-accent restraint, and the paper/navy/glass material system —
   the blur test passes: even blurred, this is LawME and it is the Matter App.
7. **What prevents an AI-generated look:** no equal-card grid, no KPI wall, no
   radar/gauge, one hero, two-accent law, structure-true skeletons, deterministic
   ordering, and every AI statement sourced and quiet. The Bible's 52 nevers are the
   guardrail.
8. **First visual mockup contains:** the shell (navy rail + glass command bar +
   context dock) + one real matter (the pregnancy-dismissal fixture) rendering the
   Decision Core, the Milestone Spine with a live "now" node and a missing-item
   diamond, the nearest deadline, the one primary action, and a single דינו seal —
   the healthy state and the blocked state, side by side.
9. **Design first:** the **Matter Room** composition (Recommended Composition) —
   specifically its **Reduced Premium** variant.
10. **Ready to move into visual design?** Yes, after the small documentation
    revision in this review is accepted. The data, safety, and hierarchy are ready;
    the composition is now Bible-aligned.

---

## What is uniquely LawME here (the anti-generic test)

The Matter App is not "a matter record with AI." It is a **room you run a legal
proceeding from**, whose spine is the procedure itself, whose headline is the
matter's own judgment of its state, and whose intelligence is a quiet, sourced
seal — never a panel of widgets. That is the product; this review makes the Epic 5
architecture express it.

## Companion documents

`MATTER_APP_COMPOSITION_OPTIONS.md`, `MATTER_APP_RECOMMENDED_COMPOSITION.md`,
`MATTER_APP_REDUCTION_REVIEW.md`, `MATTER_APP_ASCII_WIREFRAMES.md`,
`MATTER_APP_DECISION_CORE.md`, `MATTER_APP_PRODUCT_OBJECTS.md`,
`MATTER_APP_DINO_EXPERIENCE.md`, `MATTER_APP_TIMELINE_MODEL.md`,
`MATTER_APP_ROLE_MODEL.md`, `MATTER_APP_INTERACTION_MODEL.md`,
`MATTER_APP_KEYBOARD_MODEL.md`, `MATTER_APP_RESPONSIVE_MODEL.md`,
`MATTER_APP_ACCESSIBILITY_REVIEW.md`, `MATTER_APP_STATE_CATALOG.md`,
`MATTER_APP_PRODUCT_TESTS.md`, `MATTER_APP_IMPLEMENTATION_SLICES.md`,
`FOUNDER_REVIEW_EPIC_5_1.md`.

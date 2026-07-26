# 07 · Design Critique — Reduce Until Nothing Can Be Removed (FROZEN)

The Blueprint reviewed through six lenses, then reduced repeatedly until removing
anything more would break the product. This is the "why it looks the way it does".

## The six lenses

- **Apple — reduction & one obvious action.** Is there exactly one primary action? Is
  every element earning its place? *Result:* one CTA per matter; nine regions → five
  objects → three default zones; the Score is a rail, not a grid; no decorative
  container survives.
- **Linear — hierarchy, keyboard, speed.** Is it operable entirely by keyboard, fast,
  dense-but-not-cramped? *Result:* the matter room IS the Bible's "feels like Linear";
  full keyboard path; the spine is the dense operational backbone; ⌘K + Esc + arrow
  traversal.
- **Stripe — information design & precision.** Are numbers precise, tabular, never
  false? Is data honest? *Result:* tabular numerals; numeric only where measurable;
  unavailable ≠ zero; no blended percentage; provenance one click away.
- **Notion — calm surfaces & progressive disclosure.** Does it stay calm; is depth
  optional? *Result:* calm-when-calm; lenses collapsed, one opens at a time; the
  activity timeline is a quiet lens, never a feed.
- **Figma — object model & consistency.** Is everything a real object with states, not
  a one-off card? *Result:* the product-object grammar (identity → state → consequence
  → action) applied to every object; no generic cards.
- **Arc — opinionated focus & context.** Does the app take a point of view; does it
  re-aim around one focus? *Result:* one matter at a time; selection re-aims context
  (halo + meridian); Esc returns; the app is a *room*, not a page.

## The reduction passes (each removed something; the last removed nothing)

**Pass 1 — from Epic 5's nine regions.** Removed the standalone Header, Briefing,
Needs-Now, Actions, Score-grid, Dino-launcher, Trend, and Provenance as separate
regions. Merged into: Decision Core, Score Lens, Context Dock lenses, דינו seals,
evidence drawer. *Nine → five objects.*

**Pass 2 — the default viewport.** Removed from the default: the full 12-dimension
grid, the secondary next-actions list, per-dimension numbers, the trend panel, all
panel chrome not open. *Default → three zones* (Decision Core · Spine · quiet Dock).

**Pass 3 — containers & borders.** Removed card borders, solid strokes, ad-hoc
shadows, equal-weight boxes. Surfaces are drawn by shadow hairlines; one hero; the
spine has no boxes (nodes sit on the meridian). *Removed visual noise, kept structure.*

**Pass 4 — labels & color.** Removed redundant labels (the state word is the chip; rail
segments label on hover); removed all color beyond gold + one semantic state; removed
traffic-light multi-color from the Score. *Two accents; text carries meaning.*

**Pass 5 — motion.** Removed every decorative animation; kept only rise-in (entry),
one breathing node (the live "now"), and re-aim (`--motion-quick`). *Motion only where
it communicates a state change.*

**Pass 6 — the stop test.** Try to remove one more thing:
- Remove the Spine? → lose "where the matter is / what blocks the next stage" — the
  Bible's structure. **Cannot remove.**
- Remove the posture chip? → lose the one-second answer. **Cannot remove.**
- Remove the one CTA? → the app stops leading to action (Bible §1.5). **Cannot remove.**
- Remove the narrative line? → lose the "why" in human language. **Cannot remove.**
- Remove the Context Dock? → the score/deadline/lenses have nowhere quiet to live and
  spill into the core. **Cannot remove** (but it stays quiet and collapsed).
- Remove דינו seals? → lose ambient, sourced intelligence. **Cannot remove** (but only
  where actionable).

Nothing more can be removed without breaking a five-second answer or the product
thesis. **The reduction is complete.**

## The frozen minimum (what remains)

Default screen = **three zones, one hero, one action**:

1. **Decision Core** (hero) — identity · posture chip · one narrative sentence · one
   CTA · review/freshness seals. (5 elements, no more.)
2. **Milestone Spine** — the procedure with the gold meridian on the now-node; ◆/▲/⚑
   only when real.
3. **Context Dock** (quiet) — Score rail · nearest deadline · presence · collapsed
   lenses (one opens at a time).

Everything else — full score, evidence, documents, legal, client, team, finance, risk,
activity, provenance, Dino's pipeline — is **one interaction away**, and nothing else is
permanent.

## What the critique protects against (the anti-generic guarantees)

No card grid · no KPI wall · no radar/gauge · no dashboard · no chatbot panel · no
second accent · no decorative motion · no equal-weight objects · no blank empty states
· no false-healthy · one hero · two accents · the 52 nevers. Blur the text: LawME, and
the Matter App. That is the point at which it is done.

## Verdict

The Blueprint has been reduced to the point where every remaining element is load-
bearing. It is ready to be the single source of truth for implementation. Further
"simplification" would now be subtraction of function, not noise.

# Matter App — The Decision Core (Epic 5.1)

The Decision Core is the room's **hero** and headline — the expanded current spine
node. It is the smallest set of objects that answers the eight five-second
questions and offers exactly one action. It is not a command center of widgets.

## Contents (maximum, in order)

1. **Identity** — practice-area icon seat + matter name (heading) + client/area/owner
   caption. `state.titleHe`, matter record, `state.stage`.
2. **State chip (posture) — the headline.** One chip: `score.summary.posture`,
   colored by the single semantic state (two-accent law). This is the largest
   non-title element.
3. **Freshness + review seals** — a freshness dot (`score.freshness`) and, if
   `state.requiresHumanReview`, a "טעון בדיקה" seal with its route target.
4. **Narrative line** — one sentence: `narrative.headlineHe` (the dominant concern or
   the on-track confirmation). At most a second sentence in the detailed variant.
5. **The one primary action (CTA)** — `prioritizedActions[0]`: verb + owner + due +
   an approval badge if `requiresHumanApproval`. Exactly one, always above the fold.

Maximum visible items: **five** (identity, state chip, seals, one sentence, one
action). Nothing else is permanent in the core.

## Size hierarchy

matter name (heading) ≈ state chip (heading-weight, colored) > narrative (body) >
CTA (small/caption, semibold, edge-lit) > caption metadata (micro, faint). The state
chip and the CTA are the two things the eye lands on.

## Interaction

- Click state chip → open the **Score Lens** (posture explanation).
- Click narrative sentence → **evidence drawer** (its `sentenceEvidenceMap`).
- CTA → open the action (accept/assign/draft per its class; external effect gated).
- Review seal → open the **review route** (target + reasons).
- `a` focuses the CTA; `y` opens "why?"; Esc returns.

## State-by-state behavior

- **Loading:** structure-true skeleton of the core (name line, chip block, one line,
  CTA block) in paper-300 — no values, no shimmer race. Shell never skeletons.
- **Healthy (`on_track`):** green chip (the only color) + a calm one-liner + one
  forward CTA ("קדם לשלב הבא…"). No warnings manufactured.
- **Needs attention:** amber chip + the top attention concern + its action.
- **At risk / blocked:** urgent-family chip; the narrative names the concern; the CTA
  is the blocker-clearing action; the current spine node shows the diamond/pulse.
- **Degraded (`state.degraded.hasFailures`):** a grey-red chip that reads
  "הערכה חלקית"; a persistent line naming the failed engine(s); the core **never**
  shows a healthy chip. The CTA is "בדוק ידנית" if the failure blocks the next step.
- **Stale (`score.freshness.stale`):** a freshness dot goes amber with `computedAt`;
  a one-tap refresh; the chip cannot read `strong`.
- **Insufficient data:** a neutral chip "מידע חסר להערכה" + the action to complete
  the missing facts; never a fabricated posture.
- **Policy-restricted (`aiPolicy = prohibited`):** the chip and narrative are replaced
  by a "טיפול ידני — מדיניות הלקוח" notice; identity/stage/deadline (non-AI data)
  remain; no AI-derived content; no CTA from AI.
- **Empty / new matter:** identity + "תיק חדש — השלם פרטי פתיחה" + a single onboarding
  CTA; the room never looks broken.

## The one-action rule

Every non-restricted matter surfaces **exactly one** primary action in the core — the
top of `prioritizedActions`. If that list is empty (fully complete stage, terminal),
the CTA becomes the advance option or a "אין פעולה נדרשת" confirmation. There is never
zero and never two primary actions in the hero.

## What the Decision Core must never contain

The full score grid, lists of documents/evidence, finance figures, multiple actions,
a chart, a chatbot, an outcome probability, or any un-sourced sentence.

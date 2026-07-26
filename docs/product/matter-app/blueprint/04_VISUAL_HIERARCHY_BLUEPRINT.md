# 04 · Visual Hierarchy Blueprint — Where the Eye Lands (FROZEN)

Exactly what the eye sees, in order, at each time horizon. Hierarchy is carried by
**size + weight + the two-accent color + the gold meridian's position** — never by
borders or decoration.

## The eye-path law

One hero per viewport (the Decision Core on the now-node). At most gold + one semantic
state color. The single loudest colored element is always the **thing that needs the
attorney** — the posture chip on a troubled matter, or the one CTA on a calm one.

## After 1 second — the landing

The eye lands on exactly **two** things, in this order:

1. **The posture chip** (the room headline) — largest colored element, heading weight.
   On a blocked matter it is the red "חסום"; on a healthy matter the green "במסלול".
   *Answer delivered: is this on track?*
2. **The gold meridian on the now-node** of the spine — the one gold element, drawing
   the eye to "where the matter is now".

Nothing else competes at 1s. The matter name is read almost simultaneously (it sits
directly above/beside the chip) but the *color* pulls first.

Binding: `score.summary.posture` (chip) · `state.stage` + the meridian (now-node).

## After 5 seconds — the decision

The eye completes the decision core and the current node:

3. **The matter name + client + practice-area seat** — identity confirmed.
4. **The narrative sentence** — one line of דינו's briefing (what's happening/why).
5. **The one CTA** — edge-lit, verb-first, with owner + due; the single obvious action.
6. **The now-node's markers** — a ◆ (missing item) or ▲ (blocked transition) if
   present, and a ⚑ seal if דינו has a finding.
7. **The review seal** — if `requiresHumanReview`, a quiet "טעון בדיקה" near the chip.

At 5s the attorney can answer all eight five-second questions (identity · posture ·
urgent concern · blocker · next action · owner · due · review) without moving the eye
off the hero + now-node.

Binding: identity (`state`), `narrative.headlineHe`, `prioritizedActions[0]`,
spine markers, `state.requiresHumanReview`.

## After 30 seconds — the working understanding

The eye moves outward, deliberately, to context:

8. **The spine** — scanning done ● (muted) → now ◉ → next ○ (dashed): *where it's
   been, is, and is going*; the ▲ on the transition shows *what blocks the next stage*.
9. **The Context Dock, in order:** the **Score rail** (weakest dimension called out) →
   the **nearest deadline** object → **presence**. The dock is quiet by design; the eye
   only reaches it after the core.
10. **The lens rail** — the collapsed lenses (ראיות/מסמכים/משפטי/לקוח/סיכון), each a
    one-tap drill. A ⚑ or ▲ on a lens header signals where to look deeper.

At 30s the attorney can explain *why* the posture is what it is (drill the weakest
dimension), *what is missing* (the ◆/lenses), *who owns the next action* (the CTA), and
*where to go deeper* (the lenses) — the thirty-second test.

Binding: procedure graph + `state.stage` (spine), `score.dimensions`/`summary`
(rail), `state.questions.when` (deadline), lenses (per-engine `data`).

## The strict weight ladder (top → bottom of attention)

```
   posture chip (heading, colored)   ── landed at 1s
   gold meridian / now-node          ── landed at 1s
   matter name (heading)             ── 1–2s
   one CTA (edge-lit, small/semibold)── 5s
   narrative sentence (body)         ── 5s
   now-node markers ◆▲⚑              ── 5s
   review seal (caption)             ── 5s
   spine done/future nodes (muted)   ── 30s
   Score rail (quiet)                ── 30s
   nearest deadline (dock)           ── 30s
   lens rail headers (caption)       ── 30s
   metadata / freshness (micro,faint)── on demand
```

## What must never invert this ladder

- A lens, a document list, or a finance figure must never out-weigh the posture chip
  or the CTA.
- No second colored element may compete with the posture/CTA color (two-accent law).
- The dock must never pull the eye before the core (it is quiet, hairline-seated, no
  color unless a deadline is overdue — and even then the core's chip owns the color).
- Numbers never lead: the Score rail's numeric is secondary to its state; no number is
  the first thing seen.

## Healthy vs troubled — the same ladder, different loudness

- **Troubled:** the posture chip (urgent family) + the CTA carry the one color; the
  spine shows a ▲/◆; the eye is pulled to the blocker.
- **Healthy:** the posture chip (completed green) is calm; the CTA is a forward step;
  the spine is clean; the eye rests. The room is *quiet when the matter is calm* — the
  hierarchy does not manufacture urgency.

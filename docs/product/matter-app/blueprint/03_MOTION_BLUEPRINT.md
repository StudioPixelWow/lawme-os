# 03 · Motion Blueprint (FROZEN)

Motion is physics, not theater — and here, motion is **functional only**: it appears
to show a change of state, never to decorate. Every duration and easing flows through
Design Bible tokens so reduced-motion is inherited automatically. Forbidden: bounce,
overshoot, spin, parallax, scroll-jacking, skeleton shimmer race, particles.

## Token vocabulary (the only motion allowed)

- `--motion-quick` ≈ 150ms, `--ease-settle` — the default for entrances, re-aims,
  hover.
- `animate-rise` — 6px rise + fade, staggered 60–80ms — the ONE entrance animation.
- `animate-breath` / `shadow-gold-breath` — the ONLY perpetual motion, on **one** live
  node per viewport.
- Reduced motion: `:root` token override collapses all durations to 0 and disables
  breath. Non-negotiable; new motion must flow through tokens.

## 1 · How every object appears

- On matter open: the room's objects **rise in** (6px + fade), staggered — Decision
  Core first (0ms), Spine (~80ms), dock (~160ms). One pass, then still.
- Never: a cascade of bounces, a spinner, or a shimmer race. The shell never animates
  in (it is already there).

## 2 · How urgency is shown

- Urgency is **color + shape + position**, not motion. A blocked matter shows the red
  chip and a ▲ on the transition — static.
- The **single exception:** the **now-node breathes** (`animate-breath`, gold) — the
  one live node per viewport. On a blocked transition, the breath is on the ▲ node.
  There is never more than one breathing element; urgency does not multiply into a
  flashing screen.
- Reduced motion: breath stops; the red chip + ▲ shape still carry urgency fully.

## 3 · How a deadline changes

- A deadline crossing a threshold (imminent → overdue) does **not** flash. On the next
  assessment/refresh, the deadline object **re-aims**: its label + time-remaining
  update, its ink shifts to the urgent family, and if it becomes the dominant concern
  the meridian/halo re-aim to it — one `--motion-quick` transition, no blink.
- A newly-overdue strict deadline surfaces into the Decision Core / spine ▲ via a
  single `animate-rise` (it "arrives"), never via a pulsing alarm.

## 4 · How דינו surfaces

- A דינו seal **rises in** (once) on the object it belongs to when a finding appears;
  it does not pulse, glow, or float. Its authority is scarcity + the gold material, not
  animation (Bible §14: no mascot, no decorative AI effect — forbidden #6).
- Opening its evidence: the drawer **rises in** from the end; collapse is instant.
- An on-request דינו run shows a **structure-true** progress state (the answer's
  silhouette in paper-300), never a spinner or a "thinking" animation. When the answer
  resolves, it rises into place; a fail-closed no-answer rises in the same way.

## 5 · How panels expand

- A lens / node / drawer **rises in** (bounded max-height only); **collapsing is
  instant** (no reverse animation) — expansion earns motion, collapse does not.
- Opening a second lens closes the first instantly, then the second rises — never two
  simultaneous height animations.
- Re-aiming (selection): the **halo + meridian move** to the selection and the content
  re-aims within one `--motion-quick`; nothing else on screen moves.

## 6 · Hover / focus / selection

- **Hover:** −1px translate + one elevation step + a living-edge hairline. Nothing
  scales, nothing bounces (forbidden #29).
- **Focus:** the gold focus ring appears **instantly** (no transition on the ring).
- **Selection:** the halo + meridian move to the selected object; content re-aims once.

## 7 · Workspace / route transitions

- **None.** Entering the Matter App from a launcher is an instant route change with the
  staggered rise inside the new room. No cross-fades, no slides (Bible §7).

## 8 · Loading / saving / failure motion

- **Loading:** structure-true skeletons (real silhouettes in paper-300) — no shimmer
  race; the shell never skeletons.
- **Saving (Class-1 edit):** optimistic — the change appears immediately; a faint
  inline "נשמר" confirmation settles (fade, `--motion-quick`), no spinner.
- **Failure:** an honest, small, in-place inline notice rises in; retry in place; never
  a full-screen apology, never a shaking field.

## The motion release gates

1. Reduced-motion: with motion off, **no state is lost** — every change is also carried
   by color/shape/position/text.
2. **One** breathing node per viewport, maximum.
3. Every animation is a token (`--motion-quick`, `animate-rise`, `animate-breath`); any
   ad-hoc animation is a code-review rejection.
4. Collapse is instant; only expansion/entry rises.
5. No decorative motion anywhere — if a motion doesn't communicate a state change, it
   doesn't ship.

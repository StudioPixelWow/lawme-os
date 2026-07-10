# 06 · Motion Principles & Animation Durations

## Motion principles — "gravity and ink"

Motion in LawME confirms; it never entertains. The mental model: elements are made of paper
and settle under gentle gravity; attention is drawn the way ink spreads — quietly.

1. **Settle, don't bounce.** Every entrance decelerates into place (`ease-settle`,
   `cubic-bezier(0.22, 1, 0.36, 1)`). Springs with visible overshoot, elastic pops, and
   bounces are banned.
2. **Small distances.** Enter/exit offsets are 8–16px. Nothing flies across the screen.
3. **One choreography per view.** A page reveals once — chapters stagger in (60ms apart) on
   entry. Inner elements do not re-animate on every state change.
4. **Motion is directional and RTL-aware.** Things enter from where they logically come from:
   panels from the start edge (right), toasts from bottom-start, "next" moves toward the left.
5. **Scroll is sacred.** No scroll-jacking, no parallax. Scroll-linked behavior is limited to
   chapter reveals (opacity + 12px rise, once, on first view) and sticky chrome.
6. **The AI breathes; everything else is still.** The only ambient motion in the product is
   the slow gold breath on active AI surfaces (opacity 0.35→0.6, 2.4s drift). This is the
   product's heartbeat — and it stays unique by everything else being static.
7. **Reduced motion is first-class.** `prefers-reduced-motion` collapses all movement to
   ≤120ms opacity fades, centrally (tokens drop to near-zero), and stops the gold breath.

## Animation durations

| Token | Value | Easing | Use |
|---|---|---|---|
| `motion-instant` | 80ms | ease-out | Hover, press, toggle feedback |
| `motion-quick` | 160ms | `ease-settle` | Chips, checkboxes, small reveals, tooltips |
| `motion-settle` | 280ms | `ease-settle` | Cards, list items entering/leaving, accordion |
| `motion-scene` | 450ms | `ease-settle` | Panels, sheets, command bar, page transitions |
| `motion-reveal` | 700ms | `ease-drift` | Scroll-chapter reveals, first-paint choreography |
| `motion-breath` | 2400ms | ease-in-out loop | Gold AI breath only |

Easings:

| Token | Curve | Character |
|---|---|---|
| `ease-settle` | `cubic-bezier(0.22, 1, 0.36, 1)` | Decisive start, gentle landing — the default |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Leaving elements accelerate away |
| `ease-drift` | `cubic-bezier(0.33, 0, 0.67, 1)` | Ambient, long reveals |

Laws:

- Durations and easings come **only** from tokens; a raw `duration-300` in a component is a bug.
- Exits are ~30% faster than entrances (leaving should feel lighter than arriving).
- List choreography: additions settle in (`motion-settle`), completions fold away
  (height + opacity, `motion-quick`) — a completed task feels *filed*, not deleted.
- Implementation: CSS transitions for state feedback; the Motion library for presence
  (enter/exit) and shared-element moves; View Transitions (per bundled Next 16 docs) for
  index→detail title travel. Shared `variants` live in `src/design-system/motion/`.

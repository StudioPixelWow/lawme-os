# Matter App — Accessibility & RTL Review (Epic 5.1)

Reviewed against native RTL, **Israeli Standard IS 5568** (anchored to WCAG 2.0 AA),
keyboard, screen reader, and the Design Bible §13. These are build requirements.

## RTL (native, not mirrored desktop)

- Logical properties only (`start/end`, `ps/pe`, `ms/me`); physical `left/right` are a
  code-review rejection (Bible §13, forbidden #37).
- The SideRail is at the **start (right)**, the Context Dock at the **end (left)**; the
  Milestone Spine flows in the reading direction; the gold meridian and node order are
  RTL-native.
- Arrow-key traversal maps to **logical** direction (KEYBOARD_MODEL).
- **LTR islands** for version strings, trend arrows, and legal citation numbers
  (e.g. `ע״א 4881/25`) so RTL punctuation never breaks; `dir="ltr"` on those spans.
- Mixed Hebrew/English fragments (PDF, WhatsApp, TechLine) inherit the Hebrew line size.

## Status never by color alone (IS 5568 / WCAG 1.4.1)

Every state carries a **Hebrew text label + shape/icon**, not just color:
- Posture chip: the posture word ("חסום"/"במסלול"…) is always present.
- Spine nodes: shape encodes state (● done, ◉ now, ○ future, ◆ missing, ▲ risk) in
  addition to any color.
- Score rail: each segment has a state label on focus/hover and an aria label.
- Deadline: "באיחור"/"בעוד N ימים" text, not red alone.

**Blur/grayscale test:** with all color removed, the hierarchy still reads — the state
chip (size/weight), the meridian (position), the shapes, and the labels carry it. This
satisfies the brief's "understandable without gradients, shadows or color."

## Keyboard & focus

- Everything reachable; visible **gold focus ring** (`focus-gold`), never browser
  default or removed (forbidden #43).
- Esc semantics (walk back one level); `aria-pressed`/`aria-expanded`/`aria-current`
  on selection and disclosures; `aria-live` on context re-aiming and assessment
  refresh completion.
- Focus is trapped in drawers/sheets/modals and restored to the trigger on close.
- Logical DOM order = reading order: identity → posture → narrative → urgent →
  action, so screen readers announce the decision core first.

## Screen readers (NVDA / JAWS / VoiceOver)

- Every glyph `aria-hidden` unless meaningful (then `role="img"` + Hebrew label).
- The Milestone Spine exposes a `role="img"`/list with a full Hebrew sentence per node
  ("שלב נוכחי: אימות עובדות מכריעות, חוסם: חסר תצהיר").
- The meridian and halos are `aria-hidden` always (decorative light).
- The Score rail exposes a Hebrew sentence per dimension (state + why), not a bare
  number.
- דינו seals announce "דינו: <finding>, מקור זמין" with the evidence drawer reachable.

## Contrast, motion, text

- AA contrast everywhere; on-navy text uses the `*-onnavy` ramps; faint metadata stays
  ≥ 4.5:1 on paper.
- **Reduced motion:** token-level collapse (durations→0, breath off); the breathing
  now-node stops; nothing else depends on motion to convey state.
- **Large text / zoom:** layout uses tokens and logical properties; 200% zoom and OS
  large-text must not clip the decision core or the CTA (tested at all four widths).

## Tables, timelines, citations

- Ledgers (deadline, finance) use tabular numerals, hairline rules, start-aligned text
  / end-aligned numbers, with proper table semantics for screen readers.
- The activity timeline is a semantic list with time + event, not a decorative feed.
- Legal citations are LTR islands with an accessible expansion to the source.

## Compliance summary

The Matter App is buildable to IS 5568 / WCAG 2.0 AA: state is conveyed by text +
shape (not color), the full experience is keyboard-operable with a visible focus ring,
screen readers get Hebrew sentences for every intelligence surface, motion is
reduced-motion safe, and RTL is native via logical properties. These are gates for the
build, verified per the Product Tests.

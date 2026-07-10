# 09 · Component, Card, Forms, Table & Charts Philosophy

## 1. Component philosophy

- **Behavior is borrowed, skin is ours.** Interactive behavior and accessibility come from
  React Aria Components (headless, RTL-aware); every pixel of appearance comes from our
  tokens. No component library aesthetic (no shadcn look, no Material) may leak in.
- **Primitives are boring on purpose.** A LawME `Button` is quiet: ink text or ink fill,
  8px radius, hairline focus ring in gold. Character lives in composition and typography,
  not in gradient buttons.
- **Slots over booleans.** Components expose composition (children, `start`/`end` slots)
  rather than 12 style props. Variants are semantic (`intent="primary" | "quiet" | "critical"`),
  never visual (`color="blue"`).
- **Every component is RTL-native, keyboard-complete, and reduced-motion-aware by
  construction** — these are not features, they're the definition of done.
- Hierarchy of restraint: default is the quietest possible rendering; louder variants must be
  requested explicitly and justified in review.

## 2. Card philosophy

Cards are **the exception, not the container**. The canvas + whitespace is the default container.

- A card exists only when content is (a) a discrete openable object (a document, a hearing) or
  (b) genuinely peer-to-peer in a set. Explanatory or narrative content flows on the canvas.
- LawME cards are calm: `surface-raised` paper, `radius-md`, `shadow-hairline` (raised on
  hover if openable), 24px padding minimum, **one line of hierarchy inside** — a lead line,
  one metadata line, at most one action.
- **No crowded cards:** no icon rows, no three-badge stacks, no mini-charts inside cards.
  If a card needs a scrollbar, it should have been a page.
- No "KPI stat cards". Numbers appear in prose (`StatBreath`: "12 תיקים פעילים, 3 דיונים השבוע")
  set in display type — editorial, not cockpit.

## 3. Forms philosophy

Forms are conversations conducted in ink on paper:

- **One column, always.** Labels above fields, `text-caption` weight 500 `foreground-soft`.
  Never floating labels, never placeholder-as-label.
- Inputs are quiet: `surface` paper, hairline border, `radius-sm`, generous 12×14px padding.
  Focus = gold ring (2px `focus`, offset 2px) — the moment of gold a user *earns* by acting.
- Long forms become **chapters on a scrolling page** (like everything else), with a sticky
  progress hint — never multi-step wizard modals.
- Validation: inline, on blur, beneath the field, `critical` text with a plain-language fix
  ("מספר תיק חייב להכיל ספרות בלבד") — never toast-only errors, never red walls on submit.
- Every mutation has optimistic feedback or a settle animation; nothing "just happens".
- Hebrew IME correctness: caret, selection, and mixed-direction input (English names, case
  numbers) must behave — test every field with `bdi`-wrapped mixed content.

## 4. Table philosophy

Tables are for **comparison**, not for "showing records". Default list rendering in LawME is
the editorial `ListRow` (typographic index line). A true table appears only when users compare
values across columns (ledgers, time entries, invoices).

When a table earns its place:

- Airy: 56px rows, hairline row separators only — **no vertical gridlines, no zebra stripes**.
- Headers: `text-caption` `foreground-soft`, no background fill, no bold black header bar.
- Numbers: tabular numerals, end-aligned (left in RTL); text start-aligned; ₪ via `Intl`.
- Row hover: `paper-100` wash; row click opens the entity (PeekSheet), inline actions on
  hover at the row end — maximum one visible icon.
- Density toggle (נוח / צפוף) is a user mode; "comfortable" is default.
- Never: checkbox columns by default, 12-column data grids, horizontal scroll on desktop,
  status badge rainbows. Status is a whisper (dot + word).

## 5. Charts philosophy

Charts are rare, editorial, and drawn in the house materials:

- Palette: ink ramp for series, gold for *the* highlighted series/point, semantic colors only
  for semantic meaning. Never categorical rainbows, never purple.
- Style: thin lines (1.5px), no drop shadows, no 3D, no gradient fills (a 4% ink wash under a
  line is the maximum), hairline gridlines at ink/6%, axes labeled in `text-caption`.
- Every chart answers **one sentence**, and that sentence is its title
  ("שעות החיוב גדלו ברבעון"). If the sentence needs three charts, write a paragraph instead.
- Sparklines may accompany prose numbers; full charts live in reports, not scattered as
  dashboard tiles.
- RTL: time axes run right→left (past on the right) to match reading direction; verify every
  charting lib for RTL correctness before adoption.

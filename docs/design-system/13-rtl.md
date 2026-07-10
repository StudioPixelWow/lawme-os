# 13 · RTL Rules

RTL is not a mode — it is the physics of LawME. The codebase is authored RTL-first;
LTR is the theoretical future variant, not the base.

## Foundation

- `<html lang="he" dir="rtl">` at the root. No component sets `dir` locally except bidi
  isolation wrappers and explicitly-LTR content (code, URLs, phone numbers).
- **Logical properties only.** `ms-/me-/ps-/pe-`, `start-/end-`, `text-start/text-end`,
  `rounded-s-/rounded-e-`, `border-s/border-e`. The words `left` and `right` are banned in
  styling (ESLint + review). This single discipline is 90% of RTL correctness.
- Flex/grid rely on writing direction: `flex-row` already flows right→left in RTL — never
  "fix" layout with `flex-row-reverse`; if you're reaching for reverse, the model is wrong.

## Direction of things

| Thing | RTL behavior |
|---|---|
| Reading start / primary alignment | Right edge |
| Panels, drawers (דינו) | Slide from **start** (right) |
| Toasts | Bottom-**start** |
| "Next / forward" affordances | Point **left**; "back" points right |
| Directional icons | Auto-flipped by the `<Icon>` wrapper flip-list (see 07) |
| Progress, sliders, steppers | Fill right→left |
| Timelines & time axes | Past on the right, future on the left |
| Numerals | Western digits (1, 2, 3), rendered LTR inline — standard Israeli practice |
| Checkbox/control placement | Control at start (right), label flows after it |

## Bidi text — the hard part

Legal content constantly mixes Hebrew with English names, case numbers ("ת\"א 1234-05-26"),
emails, and URLs:

- Every user-content string in lists, titles, and rows renders inside `<bdi>` (or
  `unicode-bidi: plaintext`) — the future `<Bdi>`/`<Text>` primitives do this by default.
- Punctuation-adjacent numbers (dates, sums, section references) use `tabular-nums` and are
  isolated so trailing punctuation doesn't jump sides.
- Explicitly-LTR runs (email, URL, file path, code) get `dir="ltr"` + `unicode-bidi: isolate`,
  and are end-truncated logically (the *start* of the URL survives).
- Never build strings by concatenation in UI ("… of …") — use full localized templates;
  word order differs and bidi breaks composed fragments.

## Testing discipline

- Every component's story/spec includes a mixed-content case: Hebrew + English name + number.
- Visual QA checklist per feature: alignment hangs from the right edge; icons point correctly;
  keyboard arrow keys move logically (arrow-left = forward in carousels/steppers);
  text caret and selection behave in inputs with mixed content.
- The `/styleguide` route renders everything with bidi torture strings by default.

# 12 · Accessibility Rules

A law firm's tool carries legal duty (Israeli Standard 5568 / WCAG 2.1 AA). Accessibility is
a definition of done, not a sprint.

## Non-negotiables

1. **Contrast.** Body text ≥ 4.5:1, large text ≥ 3:1, UI borders/controls ≥ 3:1 — all measured
   against warm paper (`paper-50`), not white. Consequences already baked into tokens:
   `foreground-faint` (ink-300) is the *lightest* permissible text ink; gold text below 18px
   must be `gold-700`; text on glass is full `foreground` only.
2. **Keyboard-complete.** Every interaction reachable and operable by keyboard, in logical
   RTL order. Focus is never trapped except intentionally (modals — with Esc). Skip-link to
   main content on every page.
3. **Visible focus.** The gold focus ring (2px `focus`, 2px offset) appears via
   `:focus-visible` on every interactive element — no `outline: none` without replacement, ever.
4. **Screen readers.** Semantic HTML first (nav, main, article, h1–h3 mirror the chapter
   structure). React Aria supplies roles/ARIA for composite widgets. All AI content is
   announced as such (`aria-label` on AIBlock: "תוכן שהוכן על ידי עמית").
5. **Motion safety.** `prefers-reduced-motion` collapses all animation to ≤120ms fades and
   stops the gold breath — wired centrally in tokens/variants, not per component.
6. **Language & direction.** `<html lang="he" dir="rtl">`; embedded foreign phrases carry
   `lang` attributes; user content is bidi-isolated so SRs read mixed text correctly.
7. **Touch/pointer.** Targets ≥ 44×44px on coarse pointers; hover-only affordances always
   have a focus/touch equivalent (row actions appear on focus-within, not just hover).
8. **Forms.** Every field has a real `<label>`; errors are `aria-describedby`-linked and
   announced on appearance; required/optional stated in words, not asterisk-only.
9. **Color independence.** Status = dot + word, charts get direct labels — nothing is
   communicated by hue alone.
10. **Zoom.** Layouts survive 200% zoom and 320px-wide viewports without loss of function
    (long-scroll editorial layout makes this natural — keep it that way).

## Verification cadence

Automated: axe-core in CI on the styleguide route; contrast lint on token changes.
Manual: monthly keyboard-only + VoiceOver pass in Hebrew; every new primitive ships with a
documented SR script before it's marked stable.

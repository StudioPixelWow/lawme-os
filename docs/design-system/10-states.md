# 10 · Empty, Loading, Error & Success States

States are designed moments, not afterthoughts. Every route ships all four, styled from day one.

## 1. Empty states — invitations

An empty state is the product's best typography with nothing competing against it:

- Composition: generous vertical space → a serif `text-title` line → one soft sentence →
  one quiet primary action. Centered, `max-w-reading`.
- Copy is warm, Hebrew, and specific: «עוד אין תיקים. הרגע המושלם לפתוח את הראשון.» —
  never "No data found", never "אין נתונים".
- **No illustration clip-art**, no giant grey icons, no empty-box drawings. Space + type +
  (optionally) one thin gold hairline is the aesthetic.
- First-run empties may include a single דינו suggestion (gold-marked): "אפשר לייבא תיקים
  קיימים — רוצה שאעזור?"
- Filtered-empty ≠ true-empty: "אין תוצאות לסינון הזה" + one-tap clear filter.

## 2. Loading states — the reveal choreography

Loading *is* the entrance animation; done right, users can't tell skeleton from choreography:

- **Skeletons mirror the real layout** (title line, meta line, chapter blocks) in `paper-100`
  with a slow warm shimmer (2s, subtle). Never spinners for content areas.
- Streaming pages (RSC + Suspense) reveal chapter-by-chapter, top-down, each settling in with
  `motion-settle` — the page *composes itself* in reading order.
- Spinners exist only inside controls (a saving button shows a 16px ink spinner + disabled state).
- Never block the whole screen with an overlay loader; never show a loading state for
  operations under 150ms (debounce the skeleton).
- AI thinking has its own language — the gold breath, not a spinner (see 11).

## 3. Error states — honest, calm, recoverable

- Tone: take responsibility, say what happened, offer the way out. «לא הצלחנו לשמור את
  הרישום. הנתונים אצלך — נסה שוב.» No blame, no jargon, no error codes in primary text
  (codes go in a quiet expandable detail).
- Field errors: inline `critical` beneath the field (see 09 Forms).
- Operation errors: toast (bottom-start, paper surface, critical hairline start-edge) with a
  retry action, auto-dismiss 8s, and the failed data always preserved.
- Page errors (`error.tsx`): same editorial composition as empty states — serif line
  («משהו השתבש»), one sentence, retry button. Never a stack trace, never a sad-face illustration.
- Destructive confirmations state consequences concretely and name the object:
  «למחוק את הטיוטה 'סיכום דיון'? אי אפשר לשחזר אותה.»
- Critical color appears exactly once per error moment — no red walls.

## 4. Success states — quiet confirmation

Success in a professional tool is felt as *completion*, not celebration:

- Default: the settle animation itself is the confirmation (the task folds away, the entry
  appears in the ledger). No toast for expected outcomes of small actions.
- Meaningful completions (invoice sent, document filed): one quiet toast — paper, a small
  `positive` check, plain words: «החשבונית נשלחה ללקוח.»
- Rare, major milestones (matter closed) may earn a single gold hairline pulse on the entity
  header — once, 700ms, and done.
- **Never:** confetti, checkmark explosions, success modals, "!Awesome". The product trusts
  its user's dignity.

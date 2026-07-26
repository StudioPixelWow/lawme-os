# 05 · Micro-Interaction Blueprint (FROZEN)

The precise feedback for every interaction state, on every object. Each state is
conveyed by **more than color** (text/shape/position) for accessibility. All motion via
tokens (reduced-motion safe).

## Legend

Each state defines: **visual** · **motion** · **a11y** (what a screen reader / no-color
user gets).

## Hover

- **Visual:** living-edge hairline (champagne) + −1px lift + one elevation step;
  secondary content/actions reveal.
- **Motion:** `--motion-quick`; no scale, no bounce.
- **A11y:** the same content is present statically on touch; hover reveals never hide;
  focus produces the identical reveal.

## Selection (spine node / lens / deadline)

- **Visual:** the object gets the **Context Halo** + the **gold meridian** moves to it;
  `aria-pressed`/`data-live` set; the canvas re-aims to it.
- **Motion:** halo + meridian glide once (`--motion-quick`); content re-aims.
- **A11y:** `aria-pressed=true`, `aria-current` where applicable; `aria-live` announces
  "נבחר: <object>"; Esc de-selects (returns one level).

## Pressed (button / action)

- **Visual:** −1px more + a brief inner shadow deepen (the control "seats"); the gold
  edge-light brightens for the primary CTA.
- **Motion:** instant down, `--motion-quick` release.
- **A11y:** native button semantics; `:active` state; the shortcut chip is in the
  tooltip.

## Loading (object / lens / assessment)

- **Visual:** the object's **structure-true skeleton** (real silhouette in paper-300);
  the shell and identity never skeleton (the matter name shows immediately if known).
- **Motion:** none (no shimmer race).
- **A11y:** `aria-busy=true`; a Hebrew "טוען…" label; on resolve, content rises in and
  `aria-busy=false`.

## Saving (Class-1 optimistic edit)

- **Visual:** the change applies **immediately**; a faint inline "נשמר ✓" settles then
  fades; the `u` (undo) affordance is available briefly.
- **Motion:** fade `--motion-quick`; no spinner, no blocking.
- **A11y:** `aria-live` polite: "נשמר"; undo announced.

## Failure (edit / action / engine)

- **Visual:** an **honest, small, in-place** inline notice (ink + urgent hairline) on
  the object; a "נסה שוב" retry in place; the prior value restores (optimistic
  rollback). An **engine** failure → the dimension renders `לא זמין` and the partial-
  assessment banner shows once.
- **Motion:** the notice rises in; no shake, no full-screen error (forbidden #34).
- **A11y:** `role="alert"`, Hebrew message; the failure is never swallowed; a failed
  engine **never** reads as healthy.

## Success (action complete / stage advanced)

- **Visual:** a completed-state dot + a **one-line confirmation**; a completed stage on
  the spine mutes to ● (50%); no celebration, no confetti (forbidden #36).
- **Motion:** the confirmation settles; the meridian advances to the next node
  (`--motion-quick`) if the stage advanced.
- **A11y:** `aria-live` polite: "<action> הושלם"; the spine's new now-node is announced.

## Blocked (action / transition)

- **Visual:** the blocked object shows a **▲** (or ◆ for a missing item) + the blocker
  sentence + the clearing action; on the spine, a single restrained **breath** on the
  blocked transition node; the posture chip is the color (two-accent).
- **Motion:** the one breath (reduced-motion: static ▲ + red chip carry it).
- **A11y:** `aria-disabled` on the gated onward step; a Hebrew sentence "חסום: <reason>
  — <action>"; the clearing action is focusable.

## Review Required (human-in-the-loop)

- **Visual:** a quiet **"טעון בדיקה" seal** near the posture chip and on the routed
  dimension; a `do_not_proceed` route visibly **disables** the Class-2 draft affordance
  (greyed + a lock, with the reason on hover/focus).
- **Motion:** the seal rises in once; no pulse.
- **A11y:** the seal announces "טעון בדיקה: <target>"; the disabled action exposes
  `aria-disabled` + the reason; the review route is reachable by keyboard.

## Cross-cutting micro-rules

- Every state is legible **without color** (shape + text) — grayscale test passes.
- Every state has a **keyboard** and a **touch** path identical to the pointer path.
- No micro-interaction runs longer than `--motion-quick` except the single breathing
  node; none blocks input.
- Optimistic by default; reversible by `u`; nothing destructive without confirm; nothing
  external without human approval.

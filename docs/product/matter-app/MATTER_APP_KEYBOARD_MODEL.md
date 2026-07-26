# Matter App — Keyboard Model (Epic 5.1)

Keyboard-first, RTL-aware, non-conflicting with browser/OS. Built on the approved
command system (⌘K everywhere, Esc walks back, gold focus ring — Bible §10). Single
letters act only when focus is not in a text field.

## RTL directionality

Arrow keys map to **logical** direction, not physical. In RTL: `←`/`→` move along the
reading flow correctly (start = right). Spine traversal and list traversal use logical
next/previous so they feel native under `dir="rtl"`. Physical `left`/`right` are never
used (forbidden #37).

## Global (available anywhere in the app)

| Keys | Action |
|---|---|
| `⌘K` / `Ctrl K` | command palette (global search + commands) |
| `g` then `m` | go to Matters (the matter list) |
| `?` | keyboard help |
| `Esc` | close drawer/sheet/modal; exit focus mode; walk focus back one level → returns to the Decision Core |

## Inside the matter

| Keys | Action |
|---|---|
| `/` | find inside this matter (scoped search) |
| `⌘K` | matter-scoped command palette (run דינו, create task, add document…) |
| `i` | open/focus the דינו assistant (on-request) |
| `t` | create task |
| `f` | add document (file) |
| `n` | add note |
| `c` | update client / log contact |
| `b` | jump to next blocker (spine node) |
| `d` | jump to next deadline (Deadline lens / pinned deadline) |
| `l` | open Legal (coverage) lens |
| `e` | open Evidence lens |
| `o` | open Documents lens |
| `m` | open Score (measure) lens |
| `k` | open Timeline (activity) lens |
| `p` | open Procedure spine detail for the current node |
| `a` | focus the primary recommended action (the CTA) |
| `Enter` | activate the focused object (open / accept) |
| `x` | dismiss the focused action (opens a reason field) |
| `s` | snooze the focused deadline/action (reason required) |
| `y` | open "why?" (evidence drawer) for the focused element |
| `u` | undo the last Class-1 edit |
| `j` / `↓` | next item in the focused list/spine (logical) |
| `↑` / (shift+`j`) | previous item |
| `[` / `]` | previous / next stage node on the spine (logical) |
| `r` | refresh assessment (deterministic recompute) |
| `Esc` | return to the Decision Core |

## Conflict avoidance

- No single-letter shortcut fires while a text input/textarea/contenteditable has
  focus.
- No override of `⌘`/`Ctrl` browser shortcuts except `⌘K` (the established command
  bar) and `⌘F`→ scoped find only when the canvas is focused (falls back to browser
  find otherwise).
- `⌘Z` maps to undo only for matter edits when the canvas owns focus; otherwise native.

## Discoverability

`?` opens the shortcut sheet; every actionable object shows its shortcut in its
tooltip/`Kbd` chip on hover/focus. Shortcuts are remappable later; defaults ship with
the first build. No action is *only* reachable by shortcut — each has a visible
affordance too.

## The keyboard-only path (must work end to end)

Open matter → `a` (focus CTA) → `Enter` (open action) → approve/assign → `b` (next
blocker) → `y` (why) → Esc → `d` (next deadline) → `i` (ask דינו) → Esc → done. A
partner can triage a matter without touching the mouse.

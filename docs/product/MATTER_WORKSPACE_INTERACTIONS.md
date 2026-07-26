# Matter Workspace — Interactions, Actions & Keyboard Shortcuts (Epic 5)

Every interaction, the full action catalog with gating, keyboard shortcuts
(RTL-aware), and the Israeli-accessibility constraints the build must satisfy.

---

## 1. Interaction model

- **One-interaction reach:** any progressive surface (dimension detail, panel,
  provenance) is reachable in a single click/keypress from the decision core.
- **Expand vs drill:** *expand* changes a region's own detail level (Region E
  summary→grid, briefing variant). *Drill* navigates into a focused panel
  (dimension, deadline, source) and is always reversible (back/Esc).
- **Provenance from anywhere:** any sourced element exposes a "why?" affordance that
  opens Region I with that element's evidence.
- **Stable ordering:** lists never reorder on refresh for the same state, so
  interactions are muscle-memory safe.
- **Optimistic, reversible:** attorney edits (assign, due, mark-done, dismiss)
  apply optimistically with undo; nothing with external effect is auto-committed.

## 2. Action catalog

Actions are grouped by effect class. The class determines gating.

### Class 0 — View/navigate (no confirmation)
open panel, expand/collapse region, switch narrative variant, open provenance,
open source viewer, focus mode, expand all, refresh assessment (re-runs
deterministic engines only — no external calls).

### Class 1 — Internal matter edits (optimistic + undo)
mark action done, assign owner, set/adjust due date, dismiss action (reason
required), mark evidence collected, add internal note, log client contact, toggle
panel preferences. These write matter data (behind a repository later); they never
leave the firm and never require external approval, but they do respect role
permissions.

### Class 2 — Human-approval-required (draft, then a human acts)
draft demand letter / pleading / client update, prepare filing package, propose a
deadline calculation. LawME **prepares**; a human sends/files/serves. Every such
action shows "טעון אישור" and routes through the human-review surface. AI never
performs the external step.

### Class 3 — Prohibited to AI (surface only; a human does it elsewhere)
send/serve/file/publish, execute any financial transfer, change sharing or access
permissions, delete matter data. The Workspace may show a "ready to X" state and a
link, but the action itself is done by the human. These map to the platform safety
rules and are never automated.

### Class 4 — On-request intelligence
run Dino research, run Dino drafting, run deep issue analysis. Explicit,
matter-scoped, cost/latency-aware, fail-closed. Never automatic.

Gating summary: Class 0 free · Class 1 permission-checked + undo · Class 2 draft +
explicit human approval before the external step · Class 3 never AI-executed ·
Class 4 explicit launch only.

## 3. Action → data provenance

Every action originating from a recommendation carries its source: the
`prioritizedActions[i].actionId` and `sourceAssessmentIds`, and the `blockerCodes`
it clears. Completing an action that clears a blocker updates Region C and can
change posture on the next assessment — the loop is visible.

## 4. Keyboard shortcuts (RTL-aware)

Navigation shortcuts respect reading order in an RTL layout: "next/previous" follow
visual right-to-left flow, arrow keys are mapped to logical (not physical)
direction so they behave correctly under `dir="rtl"`.

| Shortcut | Action |
|---|---|
| `g` then `m` | go to Matter Workspace (from anywhere) |
| `?` | open shortcut help |
| `Esc` | close panel/drawer/overlay; exit focus mode |
| `f` | toggle focus mode (decision core only) |
| `e` | expand all Region F panels / collapse all (toggle) |
| `s` | toggle Score summary ↔ grid (Region E) |
| `1`–`9` | open the Nth intelligence panel (fixed panel order) |
| `d` | open Deadlines panel |
| `l` | open Legal panel |
| `r` | refresh assessment |
| `a` | focus the top recommended action |
| `j` / `k` | next / previous item in the focused list (logical order) |
| `Enter` | activate the focused item (open detail / accept) |
| `x` | dismiss the focused action (opens reason field) |
| `y` | open "why?" provenance for the focused element |
| `/` | focus the Ask-Dino launcher |
| `u` | undo last Class-1 edit |

All shortcuts are discoverable via `?`, remappable later, and never trigger a
Class-2/3 external action (drafting/sending always needs explicit confirmation).

## 5. Focus & reading order (accessibility)

The build must meet **IS 5568** (Israeli web-accessibility standard, anchored to
WCAG 2.0 AA) for Hebrew RTL:

- Logical DOM order = reading order (decision core first), so screen readers
  (NVDA/JAWS/VoiceOver) announce identity → posture → briefing → urgent → actions.
- The posture badge and every state chip carry an accessible Hebrew label, not
  color alone (color is never the sole signal — state text is always present).
- All interactive elements are keyboard-reachable with visible focus; drawers and
  panels trap focus and restore it on close.
- RTL handled with CSS logical properties and `dir="rtl"`; icons that imply
  direction (back/next/progress) mirror correctly.
- Live regions announce assessment refresh completion and any newly surfaced
  urgent item or degraded/unavailable state.

These are product requirements for the build, not implemented here.

## 6. Empty, loading, degraded, stale interactions

- **Loading:** the decision core shows skeletal identity + "מעריך את התיק…"; no
  fabricated values appear before the assessment resolves.
- **Degraded** (`state.degraded.hasFailures`): a persistent banner names the failed
  engines and states the assessment is partial; affected dimensions show
  `unavailable`; posture cannot read on_track.
- **Stale** (`score.freshness.stale`): a freshness chip with `computedAt`; a
  one-click refresh; stale dimensions never read as strong.
- **Empty regions** hide rather than show empty widgets (calm-when-calm).

## 7. Cross-matter navigation (scope note)

The Workspace is single-matter. "Next/previous matter" and portfolio triage belong
to the Morning Workspace (a separate surface that consumes the same
`MatterScore`/`MatterNarrative` snapshots). This document does not define that
surface; it only guarantees the Matter Workspace outputs are reusable there.

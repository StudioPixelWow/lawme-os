# 02 · Interaction Blueprint (FROZEN)

Every click, hover, keyboard shortcut, drawer, sheet, collapse, and focus transition.
Governed by: selection is state · hover reveals never hides · Esc walks back one
level · gold focus ring · no hover-only critical action · RTL logical direction.

## A · Click map (every clickable, its effect)

| Element | Click effect | Class |
|---|---|---|
| Posture chip | open the **Score Lens** (posture explanation) | 0 |
| Matter name | (no-op link to itself; rename via ⌘K only) | 0 |
| Narrative sentence | open its **evidence drawer** (`sentenceEvidenceMap`) | 0 |
| The one CTA | run the action per its class (accept/draft/advance) | 1/2 |
| Review seal | open the **review route** (target + reasons) | 0 |
| Freshness dot | **refresh** the assessment (deterministic recompute) | 0 |
| Spine now-node ◉ | expand the **node detail** (its facts/evidence/docs/actions) | 0 |
| Spine done ● / future ○ | open that stage's detail (read-only for done) | 0 |
| ◆ missing-item | open the item + its collect/prepare action | 1 |
| ▲ blocked-transition | open the blocker + its clearing action | 0→1 |
| ⚑ דינו seal | open the **evidence drawer** for that finding | 0 |
| Score rail segment | open that **dimension's focused lens** | 0 |
| Lens header (▸) | expand that lens (collapses any other open lens) | 0 |
| Deadline object | open the **Deadline Lens** / basis | 0 |
| Action (in a lens/list) | its action per class | 1–4 |
| Dock deadline / presence | open the relevant lens | 0 |
| TopBar ⚑דינו | open the **דינו assistant** tool surface | 4 |
| ⌘K / search | command palette (matter-scoped) | 0 |

**No double-click anywhere.** Everything is single-click + Enter.

## B · Hover map (reveals, never hides; mirrored statically on touch)

| Element | Hover reveal |
|---|---|
| Spine node | latest activity on that node + its one action |
| Posture chip | tooltip: the dominant concern sentence |
| Score rail segment | the dimension label + state + one-line why |
| ⚑ דינו seal | **evidence glimpse** (source + confidence + updated) |
| CTA / any action | reason + expected effect + its `Kbd` shortcut chip |
| Deadline | the calculation note + basis |
| Lens header | a one-line summary of what's inside + count |
| Document/evidence item | note + quick action (mark/open) |

Hover adds a **living-edge** (hairline champagne) + −1px lift; nothing scales, nothing
bounces. On touch, the same secondary content is present statically (no hover-only
control is essential — forbidden #42).

## C · Keyboard (RTL-aware; single letters only when focus is not in a field)

Global: `⌘K` command palette · `g m` go to Matters · `?` help · `Esc` walk back /
close / return to Decision Core.

In-matter: `/` scoped find · `i` דינו assistant · `t` task · `f` document · `n` note ·
`c` client contact · `b` next blocker · `d` next deadline · `l` Legal lens · `e`
Evidence · `o` Documents · `m` Score lens · `k` activity Timeline · `p` procedure node
detail · `a` focus the CTA · `Enter` activate focused · `x` dismiss (reason) · `s`
snooze (reason) · `y` why?/evidence · `u` undo last edit · `j`/`↓` next · `↑` prev ·
`[`/`]` prev/next stage node · `r` refresh.

Arrow keys map to **logical** direction (RTL-correct). No single-letter fires in a text
field. Only `⌘K` overrides a browser shortcut. Full detail: `MATTER_APP_KEYBOARD_MODEL`.

## D · Drawers (evidence / provenance / review)

- **Trigger:** click a sentence, a ⚑ seal, a "why?" (`y`), or a review seal.
- **Placement:** end/left, glass, ~360px, rises in (`animate-rise`).
- **Content:** the finding + why + sources (verified/candidate) + confidence + one
  action. Never raw private documents; never chain-of-thought.
- **Dismiss:** Esc or click-away; collapse is instant; focus returns to the trigger.
- **Focus trap:** yes; `aria-live` announces open.

## E · Sheets (mobile / tablet)

- **Tablet:** the Context Dock is a right/end **drawer sheet** toggled from the TopBar.
- **Mobile:** each lens header opens a **bottom sheet**; דינו opens a bottom sheet; the
  evidence drawer is a bottom sheet. Sheets rise from the end/bottom, trap focus, Esc/
  swipe-down/back to dismiss; the sticky bottom action bar remains above the sheet
  trigger.

## F · Collapse behavior

| Object | Default | Expanded | Collapse |
|---|---|---|---|
| Intelligence lenses | collapsed (headers) | one open at a time | opening another closes the current; instant collapse |
| Score | rail (weakest/strongest) | focused lens; full 12 only in the Score view | Esc |
| Spine node | now-node shows the core; others titled | node detail | Esc |
| Narrative | standard (1–2 lines) | detailed (status lines) | toggle |
| Decision Core | never collapses below its 5 items | — | — |
| Context Dock | quiet column | a lens can take focus | Esc |
| "Focus mode" | off | any object owns the canvas (chrome stays) | Esc returns one level |

Rule: **one lens open at a time** (no accordion sprawl). Collapsing is instant;
expansion rises in (bounded height only).

## G · Focus transitions (selection re-aims context)

- Selecting a spine node, a lens, or a deadline **re-aims** the canvas: the **Context
  Halo** and **gold meridian** move to the selection; the Decision Core / active node
  re-aims to it within one `--motion-quick` (~150ms); `aria-live` announces the change.
- `Esc` walks focus back exactly one level (drawer → object → core). The OS chrome
  never disappears.
- Tab order = reading order (core first); focus is always visible (gold ring); focus is
  restored after any overlay closes.

## H · Action gating (the five classes — enforced at every trigger)

- **0 view/navigate** — immediate.
- **1 internal edit** — optimistic + `u` undo (assign, due, mark-done, dismiss,
  collect, note, log contact); permission-checked.
- **2 human-approval** — draft/prepare shows "טעון אישור"; a human performs the
  external step; a `do_not_proceed` route disables it.
- **3 prohibited to AI** — send/file/serve/pay/share/delete: the app shows "מוכן ל־X"
  + a link; the human does it.
- **4 on-request דינו** — explicit launch, scoped, fail-closed.

Every action carries its provenance (`actionId`, `sourceAssessmentIds`, `blockerCodes`
it clears). Completing a blocker-clearing action re-aims the spine and can change
posture on the next assessment — the loop is visible and reversible.

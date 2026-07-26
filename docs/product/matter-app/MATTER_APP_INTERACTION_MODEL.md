# Matter App — Interaction Model (Epic 5.1)

Complete interaction grammar, aligned with the Design Bible §10 (selection is state,
hover reveals never hides, Esc walks back, gold focus ring, arrow-key traversal). No
critical action is hover-only (touch users exist — forbidden #42).

## Primitive interactions

| Interaction | Use in the Matter App |
|---|---|
| click | select an object → re-aims context (halo + meridian follow); open a lens; activate the CTA |
| double-click | **none** (avoided; everything is single-click + Enter) |
| hover | reveal secondary info + one action (glimpse); never hides content; mirrored statically on touch |
| keyboard focus | gold ring; every object is a real button/link; arrow-key traversal in the spine and lists |
| command palette (⌘K) | global + matter-scoped commands (search, jump, run דינו, create task) |
| inline actions | accept/assign/set-due/mark-done on the object itself |
| context menu | reserved; every item also exists as a visible affordance (Bible §10) |
| drawer | evidence/provenance (glass, rises in, instant collapse) |
| sheet | mobile bottom sheet for lenses + דינו |
| modal | only for a committing confirmation (e.g. approve a Class-2 draft to hand off) |
| side-by-side compare | documents/authorities compare (a lens), not the default |
| focus mode | any object owns the canvas; OS chrome stays; Esc returns |
| quick preview | hover-glimpse of an authority/document/evidence |
| expand / collapse | `details` disclosures, the spine node, the Score rail |
| undo | Class-1 edits are optimistic + `u` undo |
| approval / rejection | Class-2 actions show an explicit approve/reject gate |
| snooze | a deadline/action can be snoozed (with a reason) — never silently dismissed |
| assign | assign/reassign an action or the matter owner (permission-gated) |
| create task | from a finding/blocker or ⌘K |
| open document / source / timeline event | drills to the object; Esc returns |

## Selection & re-aiming (the Context Halo)

Selecting a spine node, a lens, or a deadline **re-aims the canvas**: the Context Halo
and gold meridian move to the selection, the Decision Core/active node re-aims to it,
and `aria-live` announces the change. Esc returns one focus level. This is the Bible's
Context-Driven UX made concrete for the Matter App.

## Action gating (the five classes)

- **Class 0 — view/navigate:** no confirmation (open lens, expand, refresh — refresh
  re-runs deterministic engines only).
- **Class 1 — internal edits:** optimistic + undo (assign, due, mark-done, dismiss,
  mark-evidence-collected, note, log contact). Permission-checked.
- **Class 2 — human-approval-required:** draft letter/pleading/update, prepare filing
  package, propose a deadline calc. Shows "טעון אישור"; a human performs the external
  step; a `do_not_proceed` route disables it.
- **Class 3 — prohibited to AI:** send/serve/file/publish, financial transfer, change
  sharing/permissions, delete. The app may show "מוכן ל־X" + a link; the **human** does
  it. Never automated.
- **Class 4 — on-request intelligence:** run Dino (research/draft/analysis). Explicit,
  scoped, fail-closed.

## Object → action provenance

Every action from a recommendation carries `actionId`, `sourceAssessmentIds`, and the
`blockerCodes` it clears. Completing a blocker-clearing action updates the spine node
and can change posture on the next assessment — the loop is visible and reversible.

## No hidden-hover rule

Hover *enhances* (glimpse, quick action) but never *hides* a critical control.
Everything reachable by hover is also reachable by keyboard and is present statically
on touch. Context menus never hold an action that isn't visible elsewhere.

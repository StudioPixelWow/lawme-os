# Matter App — Composition Options (Epic 5.1)

Three genuinely different compositions, each honoring the LawME Design Bible shell
(navy rail · glass command bar · workspace canvas · optional Context Dock) and
binding only to `MatterProfile` + the Procedure Graph + Dino. No option is a
re-skin of the others. Critique first; selection in the Recommended Composition doc.

Shared shell for all three (Bible §8): fixed navy SideRail (start/right), glass
TopBar (⌘K, search, notifications, דינו, profile), the canvas as the only desktop
scroll region, RTL throughout.

---

## Option A — Operational Command Surface

**Core concept:** the Decision Core is a dominant command band at the top of the
canvas; supporting operational lanes sit beneath it. The matter is run from the
top; the spine is a secondary horizontal strip.

- **First viewport:** identity + state chip + narrative + the one action (big), then
  a horizontal milestone strip, then two operational lanes (urgent/blockers ·
  next actions).
- **Major objects:** Decision Core (hero) · horizontal Milestone Strip · Urgent lane
  · Actions lane · Score rail (compact) · Context Dock (lenses).
- **Hierarchy:** command band → spine strip → lanes → dock.
- **Scrolling:** vertical; the command band is sticky; lanes scroll.
- **Fixed zones:** SideRail, TopBar, the Decision Core band (sticky).
- **Contextual zones:** Context Dock (right-inner) swaps lenses.
- **Timeline:** horizontal strip under the core; full timeline in a lens.
- **Documents/Evidence/Legal/Client/Team/Finance:** Intelligence Lenses in the dock.
- **Dino:** ambient seals on objects + assistant from the TopBar.
- **Score:** compact diagnostic rail in the core; lens on click.
- **Actions:** the one primary action in the core; the rest in a lane.
- **Mobile/tablet:** command band stacks first; lanes become accordions; dock → sheet.
- **Strengths:** fastest five-second read; command-center feel; strong for triage.
- **Weaknesses:** risks a "dashboard of lanes" if lanes multiply; the spine is
  demoted, contradicting the Bible's "milestone track as the spine."
- **Risks:** two competing horizontal bands (core + strip) can fight for the eye;
  lane proliferation invites forbidden grid-ness.

---

## Option B — Matter Story & Timeline (the Spine)

**Core concept:** the milestone/procedure track **is** the primary spatial
structure — a vertical spine down the canvas. The narrative and decision core ride
the current "now" node; past nodes hold history, future nodes hold what's next and
what blocks the transition. This is the Bible's literal Matter Workspace vision.

- **First viewport:** the spine with the gold meridian on the current stage; the
  current node is expanded into the Decision Core (identity chip + narrative + the
  one action + nearest deadline + top blocker). Past nodes collapse above; the next
  node (dashed) shows the transition condition below.
- **Major objects:** Milestone Spine (hero+structure) · the active-node Decision
  Core · Score Lens (docked) · Intelligence Lenses (docked) · דינו seals on nodes.
- **Hierarchy:** spine → active node (core) → node details → dock lenses.
- **Scrolling:** vertical along the spine; the active node is centered on open.
- **Fixed zones:** SideRail, TopBar; the active node stays in view (sticky within
  the spine).
- **Contextual zones:** Context Dock for lenses + evidence drawers.
- **Timeline:** this IS the timeline (procedure timeline); the activity timeline is
  a lens.
- **Documents/Evidence/etc.:** attached to the node they belong to (evidence at the
  fact-confirmation node, filing docs at the filing node) + full lenses in the dock.
- **Dino:** a seal on any node where דינו has a finding (e.g. coverage gap at the
  assessment node).
- **Score:** a diagnostic rail beside the spine; lens on click.
- **Actions:** the one primary action rides the active node; per-node actions live
  on their node.
- **Mobile:** the spine becomes a vertical stepper; the active node opens full-screen.
- **Strengths:** unmistakably LawME; matches the Bible exactly; teaches "where the
  matter has been / is / is going" spatially; deadlines and blockers attach to the
  transition they gate.
- **Weaknesses:** if the current node isn't obviously the hero, the five-second read
  can slip; long procedures need careful collapse of past nodes.
- **Risks:** the spine could feel like a wizard/stepper if under-designed; must not
  bury the one primary action below the fold.

---

## Option C — Focused Matter Canvas

**Core concept:** one active focus at a time (the Bible's Context-Driven UX §1.6):
the canvas shows a single focus object full-width; a Context Dock holds live context;
Intelligence Lenses swap the focus. Minimal permanent chrome; Esc returns one level.

- **First viewport:** the Decision Core as the default focus (identity + state chip +
  narrative + one action), with the spine as a slim context strip in the dock and
  the nearest deadline pinned.
- **Major objects:** the Focus (whatever is selected) · Context Dock (spine, deadline,
  posture, presence) · Lens switcher · דינו seals.
- **Hierarchy:** focus → dock context → lens switch.
- **Scrolling:** the focus scrolls; the dock is sticky.
- **Fixed zones:** SideRail, TopBar, Context Dock.
- **Contextual zones:** the entire canvas re-aims when you select a stage, a lens, or
  a deadline (halo + meridian follow the focus).
- **Timeline:** the spine lives in the dock as context; selecting it makes the
  timeline the focus.
- **Documents/Evidence/etc.:** each is a focus you switch into; never all at once.
- **Dino:** seals on the focus + on-request assistant re-aims the focus.
- **Score:** a dock rail; selecting it makes the Score Lens the focus.
- **Actions:** the one primary action is always pinned in the dock regardless of focus.
- **Mobile:** naturally single-focus; the dock becomes a bottom sheet.
- **Strengths:** calmest, most premium; lowest cognitive load; scales to any matter
  size; the Context Halo/Dock are already Bible patterns.
- **Weaknesses:** the spine is demoted to context (against the Bible's "spine of the
  screen"); power users may want more on screen at once; more clicks to compare areas.
- **Risks:** "one focus" can feel empty on a healthy matter if the focus is thin;
  needs a strong default focus.

---

## Cross-option notes

- All three keep the **same Decision Core content** and the **same one primary
  action** — they differ in *spatial emphasis* (top band vs spine vs single focus).
- All three treat the Score as a **lens/rail, never a grid**, and דינו as **seals +
  on-request**, never a chatbot panel.
- The Bible's constraints (one hero, two accents, milestone spine, context dock,
  keyboard-first, RTL) most naturally favor **B's spine + C's focus discipline + A's
  decision-core headline** — which the Recommended Composition synthesizes into the
  **Matter Room**.

# Matter App — Product Objects, Not Cards (Epic 5.1)

Every major object's identity: purpose, hierarchy (identity → state → consequence →
action), material, icon, states, interaction, hover, focus, expanded form, empty /
unavailable / stale, mobile. Materials and tokens per the Design Bible. None is a
generic card.

---

### Decision Core (hero)
- Purpose: answer the eight five-second questions + one action. Hierarchy: name →
  state chip → narrative → CTA. Material: **warm paper raised**, one hero. Icon:
  practice-area seat. States: see DECISION_CORE.md. Interaction: chip→score lens,
  sentence→evidence, CTA→action. Hover: living-edge on CTA. Focus: gold ring on CTA.
  Expanded: the current spine node it belongs to. Empty/degraded/stale: per catalog.
  Mobile: first block, sticky CTA.

### Milestone Spine (structure)
- Purpose: where the matter has been/is/goes + what blocks each transition. Hierarchy:
  the meridian + the ◉ now-node. Material: **paper**, the **gold meridian** threads
  it; the now-node breathes gold. Icon: stage-kind glyphs. States per node: done
  (muted ●), now (◉ breathing), future (○ dashed), blocked-transition (▲ risk pulse),
  missing-item (◆ diamond), דינו-finding (⚑ seal). Interaction: click node → node
  detail (its required facts/evidence/docs/actions + sources). Hover: node reveals
  latest activity + its one action. Focus: arrow-key traversal along the spine, gold
  ring per node. Expanded: a node opens into its detail (Context Dock or inline).
  Empty: a brand-new matter shows the full future spine, all ○. Unavailable: a node
  whose engine failed shows a neutral "לא זמין" marker, never green. Mobile:
  horizontal shelf with snap; the now-node centered.

### Matter Posture (state chip)
- Purpose: the one-word health headline. Hierarchy: the loudest non-title element.
  Material: semantic **wash** (one color, two-accent law), ink text + a Hebrew label
  (never color-only). Icon: none (the word is the signal). States: the seven postures.
  Interaction: click → Score Lens. Hover: tooltip with the dominant concern. Focus:
  ring. Expanded: the Score Lens. Stale: cannot read `strong`; freshness dot. Mobile:
  stays in the core header.

### Score Lens (diagnostic rail, not a grid)
- Purpose: decomposed health without a KPI wall. Hierarchy: **weakest → strongest**
  ordered rail; the weakest is called out. Material: paper; each segment an ink state
  bar (color only on the story dimension). Icon: dimension glyphs (14–16px). States:
  per dimension (strong/…/blocked/unavailable/stale). Interaction: hover a segment →
  its label + state; click → the dimension's focused lens (findings + actions +
  provenance). Default shows the rail + weakest/strongest pair; the **full 12** appear
  only inside the dedicated Score view. Empty/unavailable: unavailable segments render
  as "לא זמין" (not zero). Mobile: a horizontal segmented rail.

### Procedure Timeline node
- Purpose: one stage as an object. See Spine. Consequence: what it requires to advance.
  Action: the stage's one action. Provenance: the stage's `SourceLink`s (mandatory-law
  vs practice, never conflated).

### Urgent Deadline (the strongest object in the language)
- Purpose: the nearest hard clock. Hierarchy: type label · **time-remaining in bold
  semantic ink** · owner · why-it-matters sentence · one action. Material: risk-ledger
  grammar (paper + urgent ink). Icon: court/deadline glyph. States: overdue (urgent) ·
  imminent ≤7d (today/amber) · upcoming (steel) · unscheduled-strict (waiting) ·
  disputed (a "שנוי במחלוקת" flag, still counted). Interaction: click → the deadline
  ledger / its basis. Hover: the calculation note + basis. Focus: ring; `d` jumps here.
  Expanded: basis + the action that addresses it. Unavailable: n/a (deterministic).
  Mobile: second block, always visible when strict/imminent.

### Blocker
- Purpose: what stops the transition. Hierarchy: kind → message → the clearing action.
  Material: paper; on the spine it sits as a ◆/▲ on the node. States: policy/deadline/
  evidence/document/fact. Interaction: click → the action that clears it (links to
  the CTA or an action in the dock). Hover: the full message. Mobile: on the node
  shelf + in the lens.

### Recommended Action
- Purpose: the next decision. Hierarchy: verb-first label · owner · due · approval
  badge · expected effect. Material: paper; the primary one is edge-lit (CTA). Icon:
  action glyph (18px). States: proposed/accepted/in-progress/done/dismissed/blocked;
  Class 0–4 gating (INTERACTION_MODEL). Interaction: accept/assign/set-due/dismiss/
  "why?". Hover: reason + expected effect. Focus: ring; `a` focuses the primary.
  Expanded: the action detail + its `blockerCodes`. Unknown owner/due: "לא ידוע",
  never invented. Mobile: primary is sticky; rest in a lens.

### Evidence Gap
- Purpose: a missing mandatory proof. Hierarchy: label · mandatory badge · why · one
  action (אסוף/צרף). Material: paper; a ◆ on the fact-confirmation node. States:
  collected/missing/disputed-supporting. Interaction: mark-collected/attach (human).
  Provenance: the procedure graph's evidence requirement + its `SourceLink`.

### Document Readiness
- Purpose: a stage-required document's state. Hierarchy: kind · present/missing ·
  filing readiness · one action. Material: the physical-sheet grammar (layered edges,
  face lines, type-chip wash). States: missing/present/in-review/ready-to-file. Icon:
  doc glyph + type chip. Interaction: open → the Document lens/inspector. Mobile: in
  the Documents lens.

### Client Waiting State
- Purpose: the client relationship's demand on us. Hierarchy: channel · waiting/
  awaiting · policy constraint · one action (חזור ללקוח/עדכן). Material: neutral
  seat, urgency is the only color (Bible §2.5). States: responsive/slow/unreachable/
  awaiting-response/policy-restricted. Interaction: log contact / draft update (send
  is human). Mobile: Client lens.

### Human Review Route
- Purpose: where a human must decide. Hierarchy: target (lawyer/senior/partner/
  specialist/compliance/privacy/finance/do-not-proceed) · reasons · blocking? ·
  one action (העבר לבדיקה). Material: a seal on the core + on the dimension. States:
  the eight targets; `do_not_proceed` visibly halts Class-2 drafting. Interaction:
  click → reasons + `sourceAssessmentIds`. Mobile: seal in the core.

### דינו Insight (seal)
- Purpose: an evidence-backed finding attached to its object. Hierarchy: seal ·
  finding (semibold) · why (one sentence) · related chips · evidence (hover glimpse,
  click drawer) · updated time · one action. Material: **champagne gold seal**, navy
  or gold-washed paper — never a toast, never a chat bubble. Icon: the meridian seal.
  States: present-with-finding / silent (no seal when nothing actionable). Interaction:
  hover → evidence glimpse; click → evidence drawer; action → its (gated) step.
  Provenance: always (source + confidence + updated). Mobile: seal inline; drawer =
  bottom sheet. **One seal per object; scarcity is authority.**

### Matter Activity Stream (lens, not default)
- Purpose: the chronological record (communications, decisions, tasks, filings). This
  is the **activity** timeline, distinct from the procedure spine. Hierarchy: time ·
  kind glyph · one line · linked object. Material: paper, Notion-calm. Interaction:
  open an event → its object. Default: **collapsed** (a lens); never an infinite feed
  on the main screen. Mobile: a lens/sheet.

---

## The rule

No object above is a "card." Each has identity, state, consequence, and one action,
and each maps to a concrete `MatterProfile` field (DATA_BINDING). Objects that only
inform and never act do not ship (Bible §1.2 / forbidden #51).

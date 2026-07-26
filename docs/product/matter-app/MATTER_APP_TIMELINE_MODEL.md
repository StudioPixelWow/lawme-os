# Matter App — Timeline Model (Epic 5.1)

Decision: LawME needs **three distinct time surfaces**, not one overloaded feed. Each
answers a different question; they are related but never merged.

## The three surfaces

### 1. Procedure Timeline = the Milestone Spine (primary, always visible)
- **Question:** where has the matter been in the *proceeding*, where is it now, what
  comes next, and **what blocks the transition**?
- **Content:** the procedure graph's ordered stages + `state.stage` (current node,
  next options, transition conditions). Court events that ARE stages (a hearing, a
  filing) appear as nodes.
- **Form:** the vertical/horizontal spine with the gold meridian on "now"; done ●,
  now ◉, future ○ (dashed), ◆ missing-item, ▲ blocked-transition, ⚑ דינו finding.
- **Not:** an activity feed. It shows *procedural structure*, not every event.

### 2. Activity Timeline (a lens, opened on intent)
- **Question:** what *happened* and when — the chronological record.
- **Content:** communications, decisions, tasks completed, documents filed, payments,
  intelligence events, notes. Sourced from the matter record + `matter-timeline` /
  `matter-communication` data.
- **Form:** a calm, reverse-chronological lens (Notion-calm), grouped by day, each
  event a one-line object linking to its subject. Never the main screen, never an
  infinite feed.

### 3. Deadline Lens (a focused ledger)
- **Question:** what clocks are running, which are strict, which are overdue/imminent?
- **Content:** all `state.questions.when` / `matter-deadline` views with basis and the
  action addressing each.
- **Form:** the risk-ledger grammar (the Urgent Deadline object is the strongest in
  the language); the single nearest strict deadline is pinned in the Context Dock; the
  full ledger opens on intent.

## Relationships (and why they stay separate)

- The **Procedure Timeline** is *structural* (stages), the **Activity Timeline** is
  *historical* (events), the **Deadline Lens** is *temporal-risk* (clocks). Merging
  them would produce exactly the "one overloaded infinite feed" the brief forbids and
  the Bible's forbidden list rejects.
- They cross-link: a deadline attaches to the transition it gates on the spine; an
  activity event (a filing) may complete a stage node; a court update creates both an
  activity event and a spine node advance.
- Only **one** is the spine (the Procedure Timeline). The other two are lenses reached
  in one interaction.

## What the attorney must understand at a glance (spine only)

- **Where it's been:** the muted done nodes.
- **Where it is now:** the ◉ node under the gold meridian (the hero/Decision Core).
- **What comes next:** the first ○ node + its transition condition.
- **What blocks the transition:** the ◆/▲ on the current/next node, each linking to
  the clearing action.

That single spine answers the four "where" questions without opening any lens — which
is why it is the room's structure, and the other two timelines are progressive.

## Court events

Court events are dual-nature: a *hearing* is both a procedure stage (spine node) and a
calendar event (Calendar Workspace) and a deadline driver (Deadline Lens). In the
Matter App it appears on the spine as its stage node, with its date surfaced by the
Deadline Lens; the Calendar Workspace composes it elsewhere. No duplication of the
*object* — one hearing, three views.

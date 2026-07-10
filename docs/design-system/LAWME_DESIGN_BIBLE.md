# THE LAWME DESIGN BIBLE

**The permanent source of truth for LawME's product and design language.**
Version 1.0 · Sealed on the V10 Morning Workspace · July 2026

The Morning Workspace is frozen. It is no longer a design exercise — it is
the foundation. Every future workspace, component, icon and interaction is
measured against this document. When this document and an implementation
disagree, the implementation is wrong.

Written for the teams that will build LawME for the next five years.

---

# 1 · Product Philosophy

## 1.1 LawME is an Operating System

LawME is not an app and not a website. It is the operating system of an
Israeli law firm: the environment where legal work lives, moves and gets
done. Like an OS, it has permanent chrome (the navy sidebar, the daily
rail, the command bar), interchangeable workspaces (the applications), a
single design language, and one intelligence layer (דינו) woven through
everything. The long-term reference is explicit: **the macOS of law
firms** — not because we copy Apple, but because every workspace is
purpose-built, beautifully crafted, and deeply integrated into one
coherent system.

## 1.2 Workspaces, not dashboards

A dashboard displays; a workspace works. LawME never ships a page whose
purpose is "showing data." Every screen is a place where a lawyer takes
the next action. The Morning Workspace is the proof: five large product
objects, each of which does something, none of which merely reports.

Corollaries:
- No screen is a grid of equal cards.
- No screen is a wall of KPIs.
- Charts appear on demand, never as permanent residents.
- If a module only informs and never leads to an action, it does not ship.

## 1.3 Operational Surfaces, not cards

A card is a container. An operational surface is an instrument: it has
identity (what is this?), state (what condition is it in?), consequence
(what happens next?) and exactly one primary action. Every object in
LawME — a matter, a document, a hearing, an insight — is built as an
operational surface with internal structure, not as a white rectangle
with rows of text.

## 1.4 דינו is embedded intelligence

דינו is LawME's legal and operational intelligence layer. He is not a
chatbot window, not a mascot, not a feature. He is present inside the
work: a prepared draft, a flagged contradiction, a computed deadline, a
suggested reassignment. His entire visual presence is one restrained
gold mark — the meridian seal — and his voice is one sentence with
evidence. Section 14 is his constitution.

## 1.5 Action First

Every important insight ends with a verb. "3 לקוחות ממתינים" is
incomplete; "3 לקוחות ממתינים · אשר טיוטות מענה ←" is LawME. The
hierarchy of any surface is: what matters → why it matters → what to do
about it — with the action reachable in one interaction.

## 1.6 Context-Driven UX

The interface transforms around one focus at a time. Selecting a
timeline event re-aims the briefing; selecting a matter re-aims its
context; Esc returns one focus level. The page is never a static
screenshot — it is a working environment that leans toward whatever the
lawyer is looking at (the Context Halo is the physical expression of
this principle).

---

# 2 · Workspace Philosophy

Every workspace is a dedicated application inside the OS. Shared: the
design system (section 3–8). Different: layout, composition, information
architecture, interaction model, emphasis, primary actions. The blur
test governs every one of them: **with all text blurred, the workspace
must still be recognizable — as LawME, and as itself.**

### 2.1 Morning Workspace (היום) — FROZEN FOUNDATION
- **Purpose:** answer, within ten seconds of the day's first glance:
  what matters today, what needs me, what did דינו already prepare.
- **Primary user:** every role; renders by role priority (partner mode
  is the default composition).
- **Primary object:** the Today Focus briefing (the day's mission).
- **Secondary objects:** office attention strip, the featured matter,
  workspace launchers, דינו's intelligence footer.
- **Interaction model:** one focus state; timeline selection re-aims the
  briefing; matter selection re-aims context; Esc returns.
- **Navigation:** it IS the home; every other workspace is one launcher
  away.
- **Visual identity:** the navy briefing over ivory; the only workspace
  where deep navy dominates the first viewport.
- **Information density:** low count, high meaning — five objects.
- **Typical actions:** התחל הכנה לדיון, בקש מהלקוח, אשר ושלח, בדוק ורשום.
- **NEVER inside it:** full inboxes, full finance dashboards, full team
  boards, settings, long lists, more than five permanent objects.

### 2.2 Matter Workspace (תיקים) — feels like Linear
- **Purpose:** run a legal proceeding end-to-end.
- **Primary user:** the responsible lawyer.
- **Primary object:** the matter — one matter open at a time, its
  milestone track as the spine of the screen.
- **Secondary objects:** documents of the matter, timeline, parties,
  tasks, time entries, דינו's matter analysis.
- **Interaction model:** list → focus. A dense, keyboard-first matter
  list (Linear-grade) opens into a full matter room. Milestones are
  clickable stages; everything filters by stage.
- **Navigation:** matter list ⇄ matter room; breadcrumb back; ⌘K jumps.
- **Visual identity:** paper room with the gold meridian marking "now"
  on the milestone track; the state chip is the room's headline.
- **Information density:** the densest workspace in LawME — operational,
  not cramped.
- **Typical actions:** פתח לעריכה, הגש, תעד זמן, קבע דיון, בקש מסמך.
- **NEVER:** finance charts, leads, office-wide intelligence, other
  matters' noise.

### 2.3 Document Workspace (מסמכים) — feels like Finder
- **Purpose:** every document the office touches — reviewed, compared,
  signed, filed.
- **Primary user:** lawyers and interns.
- **Primary object:** the document as a physical sheet (layered paper
  edges, face preview).
- **Secondary objects:** versions, signatures, annexes, דינו's issue
  marks.
- **Interaction model:** shelf/column browsing, hover = preview, select
  = inspector panel, drag to matter. Compare mode is a first-class
  two-sheet view.
- **Navigation:** by matter, by state (לבדיקה / לחתימה / להגשה), by
  recency.
- **Visual identity:** paper on paper — the most physical workspace;
  sheets have thickness and a shelf reflection.
- **Information density:** medium; the document face carries the load.
- **Typical actions:** פתח לבדיקה, השווה גרסאות, חתום, העבר לאישור,
  הכן להגשה.
- **NEVER:** a generic file-manager table as the primary view, matter
  management, communication threads.

### 2.4 Research Workspace (מחקר משפטי) — feels like Perplexity
- **Purpose:** legal questions in, sourced legal reasoning out.
- **Primary user:** lawyers and interns.
- **Primary object:** the research thread (question → דינו's reasoned
  answer with authorities).
- **Secondary objects:** precedents (ע״א 4881/25 objects), legislation,
  the matters each authority affects.
- **Interaction model:** ask → read → pin to matter. Every claim carries
  its source and a confidence bar; hovering an authority previews it.
- **Navigation:** thread history at the start edge; authorities open in
  a drawer, never navigate away mid-thread.
- **Visual identity:** the quietest workspace — ivory reading surface,
  serif-free long-form text rhythm, gold marks only on verified
  authorities.
- **Information density:** low; reading comfort rules.
- **Typical actions:** שאל את דינו, השווה לתיק, הצמד לתיק, פתח מקור.
- **NEVER:** decorative AI effects, chat bubbles, unsourced claims,
  operational dashboards.

### 2.5 Client Workspace (לקוחות) — a CRM built for lawyers
- **Purpose:** every client relationship: matters, communication,
  billing state, waiting items.
- **Primary user:** partners and responsible lawyers.
- **Primary object:** the client room (person/company + their matters).
- **Secondary objects:** the action inbox (לקוחות שממתינים), prepared
  replies, engagement letters, the client timeline (Notion-calm).
- **Interaction model:** waiting-first: the workspace opens on
  communication that requires action; דינו's prepared reply is one
  selection away (אשר ושלח).
- **Visual identity:** warm paper + channel-true iconography in neutral
  seats; urgency is the only color.
- **Information density:** medium.
- **Typical actions:** אשר ושלח, חזור ללקוח, בקש מסמך, תזכר חתימה,
  שלח עדכון.
- **NEVER:** a full email client, marketing funnels, raw chat logs as
  the primary surface.

### 2.6 Finance Workspace (פיננסים) — feels like Stripe
- **Purpose:** billing, collection, unbilled time, profitability.
- **Primary user:** managing partner / office manager.
- **Primary object:** the executive sentence + the money flow (billed →
  collected → outstanding).
- **Secondary objects:** unbilled-time ledger, overdue clients, matter
  profitability, the half-year chart.
- **Interaction model:** sentence-first; every figure expands into its
  ledger; every exception carries an action (בדוק ורשום).
- **Visual identity:** instrument precision — tabular numerals, hairline
  rules, one chart language (ink bars, gold current, dashed target).
- **Information density:** high but tabular.
- **NEVER:** rainbow charts, gauge widgets, permanent dashboards on
  other workspaces.

### 2.7 Calendar Workspace (יומן) — Apple Calendar with legal context
- **Purpose:** the office's time: hearings, deadlines, meetings.
- **Primary object:** the day/week grid with the gold "now" meridian.
- **Secondary objects:** preparation state per event, linked matters,
  conflicts, travel context.
- **Interaction model:** every event knows its matter and its readiness;
  selecting an event offers its preparation, not just its time.
- **Visual identity:** the cleanest grid in LawME; glass now-marker;
  hearing events carry the court glyph and a readiness bar.
- **NEVER:** social-calendar decoration, color-per-calendar rainbow.

### 2.8 Team Workspace (צוות) — feels like Linear Issues
- **Purpose:** operational capacity for legal work.
- **Primary object:** the capacity bench (per-member gauge with the 80%
  tick) and the assignment queue.
- **Secondary objects:** blockers, overdue tasks, reassignment
  suggestions from דינו.
- **Interaction model:** select a member → their load, matters,
  blockers; drag/assign tasks; red only for genuine overload.
- **NEVER:** HR features, performance reviews, vacation admin.

### 2.9 Knowledge Workspace (ידע) — an intelligent legal library
- **Purpose:** the office's accumulated knowledge: templates, playbooks,
  past matters, annotated precedents.
- **Primary object:** the knowledge entry with provenance.
- **Interaction model:** search-first; דינו surfaces relevant knowledge
  inside other workspaces, this is where it is curated.
- **NEVER:** a wiki dump; unsourced content.

### 2.10 Automation Workspace (אוטומציות)
- **Purpose:** the office's standing instructions — intake flows,
  deadline chains, document assembly, notification rules.
- **Primary object:** the automation recipe (trigger → steps → guard).
- **Interaction model:** readable sentences, not node graphs:
  "כשמתקבלת החלטה → דינו מחשב מועד תגובה → נוצרות משימות".
- **NEVER:** developer-style flowcharts as the only view.

### 2.11 Admin Workspace (הגדרות המשרד)
- **Purpose:** roles, permissions, billing rates, integrations, brand.
- **Interaction model:** boring on purpose — the one workspace allowed
  to be a settled form; still LawME materials and typography.
- **NEVER:** operational content, intelligence, anything a lawyer needs
  daily.

---

# 3 · Visual Language ("שיש" — the material system)

Three materials build every screen. Gradients are lighting, never
decoration. One sun: light enters from the top-start corner.

## 3.1 Deep Navy — the anchor material
The product's structure: the sidebar, the Today Focus briefing, דינו's
intelligence surfaces. Machined from tonal layers of one family
(`#17294a → #0d1c36 → #091528 → #060e1c`, 200deg) with a single wide
ivory wash from the top-start and a champagne inner edge
(`inset 0 0 0 1px gold/12–14%`). Navy is scarce by law: **~10% of any
screen**. When navy speaks, everything else listens.

## 3.2 Warm Paper — the workspace material
Ivory paper (`--color-surface`, raised `#fffefc`-family) carries the
work. Two levels: `surface-paper` (resting: inner top highlight +
hairline drawn by shadow, no visible border) and `surface-paper-raised`
(working: adds a 3rem white wash from the top + a deeper seat). Paper is
**~65%** of a screen. Documents get literal paper physicality: layered
edges, sheet thickness, a shelf reflection.

## 3.3 Premium Glass — the live material
`glass` (24px blur, translucent ivory, luminous inner edge, navy pickup
in the shadow) and `glass-navy` for dark surfaces. Glass means ALIVE:
the top command bar, the active timeline event, floating previews,
contextual overlays, hovered launchers, the time cursor. **~20%** of a
screen, never the default container. If it isn't live or floating, it
isn't glass.

## 3.4 Champagne Gold — the attention metal
Gold (`#c9a961` family) is a metal, not a color: the meridian, the
active nav illumination, דינו's seal, the one critical highlight, CTA
edge light. **≤5%** of any screen. Gold is never a background for
content and never appears in two competing places at once.

## 3.5 Light, shadow, depth
- **Elevation ladder:** hairline seat (`shadow-seat`) → resting card →
  raised card → lifted hover (`shadow-lift`) → floating glass → modal.
  Every level exists in tokens; no ad-hoc shadows.
- **Environmental lighting:** `bg-environment` — a champagne dawn radial
  at the top-start and an almost-invisible cool navy depth at the far
  bottom-end, fixed attachment. The room has weather; the user never
  consciously sees it.
- **Reflections:** `reflection-floor` — the faint sheen a dark object
  casts on the desk beneath it (under the briefing, under the document
  shelf). Atmospheric only; never on content.
- **Signature light effects (exactly three, never more):**
  1. **Gold Meridian** — the one thin champagne line meaning "now / the
     live thing": enters the briefing's start edge, threads the active
     timeline node, marks the featured matter and דינו surfaces.
  2. **Context Halo** (`context-halo`) — restrained environmental light
     behind THE focused object only.
  3. **Living Edge** (`living-edge`) — a hairline champagne outline that
     exists only on hover / focus-within / `data-live`.

## 3.6 Borders and whitespace
- Borders are drawn by shadow hairlines (`0 0 0 1px ink/5%`) or
  `border-line/50–70` — never solid dark strokes.
- Section rhythm: `mt-10 md:mt-12` between major objects. Inside
  objects: 4/5/6/7 spacing steps; padding earns its place — V9's law
  stands: reduce empty whitespace, never create clutter.
- Radius scale: xs (chips) → sm → md (controls) → lg (inner objects) →
  xl (operational surfaces) → pill. One scale, no exceptions.

---

# 4 · Color System

Base ramps: `paper-0…300` (warm ivory), `ink-100…950` (blue-black),
`gold-100…700` (champagne). All component color flows through semantic
tokens — **raw hex and generic Tailwind palettes are forbidden in
components** (`--color-*: initial` wipes them on purpose).

## 4.1 The ten status states
Each state exists as ink (`text-status-*`), wash (`bg-status-*-wash`)
and on-navy (`*-onnavy`) tokens:

| State | Meaning | Family |
| --- | --- | --- |
| `urgent` | act now / overload / deadline today | muted coral |
| `today` | due today / missing item | warm amber |
| `waiting` | blocked on someone | blue-grey |
| `progress` | in work | cool blue |
| `new` | just arrived | soft teal |
| `completed` | done / healthy | refined green |
| `risk` | legal/financial exposure | desaturated red-copper |
| `scheduled` | future commitment | steel blue |
| `reviewed` | passed review | deep blue |
| `signed` | executed | ink-green |

## 4.2 Domain accents (mapped, not new pigments)
Research → ink + gold marks on authorities · Court/hearing → urgent
family + court glyph · Client → waiting family · Matter → navy + gold
meridian · Document → scheduled family · Finance → reviewed family +
tabular ink · דינו → champagne gold ONLY · Calendar → scheduled ·
Approval → completed · Review → reviewed · Signature → signed ·
Communication → neutral seats, urgency carries the only color.

## 4.3 The two-accent law (V9, permanent)
At any moment, one viewport shows at most **champagne gold + ONE
semantic color**. Everything else is ink and paper. The critical item
owns the color; the rest stay quiet. Rings, gauges and chips downgrade
to ink when they are not the story.

---

# 5 · Typography

Primary UI face: **Assistant Variable** (modern Hebrew sans, self-hosted).
Display face for rare editorial moments only: Frank Ruhl Libre — never
in operational UI.

## 5.1 The scale (tokens, not px)
`text-hero` (clamp → 4.5rem, weight 700, -0.02em) · `text-display`
(→3.75rem) · `text-title` (→2.25rem) · `text-heading` (1.375rem/600) ·
`text-subheading` (1.125rem/500) · `text-body` · `text-small` ·
`text-caption` · `text-micro`. Nothing below micro exists.

## 5.2 Rules
- **Hebrew hierarchy:** weight + size carry hierarchy; letter-spacing
  tightens only ≥ heading. Hebrew never gets tracking-wide.
- **English inside Hebrew:** English/Latin fragments (TechLine, PDF,
  WhatsApp) inherit the Hebrew line's size; version strings and trends
  get `dir="ltr"` islands so RTL punctuation never breaks.
- **Numbers:** every time, percentage, amount and count is
  `tabular-nums`. The dominant number of a surface (countdown, load %)
  is bold heading/display scale; supporting numbers stay small.
- **Tables/ledgers:** tabular numerals, hairline rules, start-aligned
  text, end-aligned numbers.
- **Buttons:** text-small/caption, font-medium→semibold; never
  uppercase (Hebrew has none — don't fake it with English).
- **Metadata:** micro/caption in `foreground-faint`; metadata never
  competes with content ink.
- **Reading rhythm:** long-form (research) uses relaxed leading and a
  62–70ch measure; operational text uses snug leading and truncation
  with purpose (`line-clamp` for two-line titles, `truncate` for one).

---

# 6 · Iconography

Full specification: `docs/design-system/iconography.md`. The law:

- One outlined language: 24px grid, **1.5px stroke**, rounded caps and
  joins, `currentColor`. Fills only for live/selected/urgent nodes.
- **Semantic sizes** via `ICON` tokens: metadata 14 · inline 16 ·
  action 18 · nav 20 · section 24 · launcher 28 · featured 32 ·
  status 40. Hand-sized icons are a code-review rejection.
- **Containers:** `IconContainer` — the physical seat: semantic wash,
  inner top highlight, hairline seat, interactive lift with
  catch-light; 19 variants × light/navy surfaces; sm/md/lg/xl.
- **Hover/focus:** seats lift 1px with a catch-light; focus uses the
  gold focus ring (`focus-gold`), never browser default.
- **RTL:** icons are direction-neutral or RTL-native (the trend glyph
  rises leftward; filing enters the tray correctly). Any icon with
  reading direction must be drawn for RTL first.
- **Semantics:** every icon answers object / state / action / attention
  / source. Zero decorative icons.
- **Forbidden:** emoji as icons · mixed stroke weights · filled+outline
  soup · gavel/scales clichés as default court identity (the column
  court glyph is the brand) · brand-colored channel icons (channel
  shape yes, loud brand color no) · icon fonts · external image icons.

---

# 7 · Motion Language

Motion is physics, not theater. All durations and easings come from
tokens (`--motion-quick` ≈ 150ms, settle easing `--ease-settle`); all
entrance animation is `animate-rise` (6px rise + fade, staggered by
60–80ms); the only perpetual motion is `animate-breath` /
`shadow-gold-breath` on ONE live node per viewport.

- **Hover:** −1px translate + elevation step + living edge. Nothing
  scales, nothing bounces.
- **Focus:** gold ring appears instantly (no transition on focus ring).
- **Selection:** halo + meridian move to the selected object; content
  re-aims within one `--motion-quick`.
- **Expansion (details/drawers/timeline):** rise-in only; collapsing is
  instant; height animation only where content is bounded (max-h).
- **Workspace transitions:** none for now — instant route change with
  staggered rise inside the new workspace. No cross-fades, no slides.
- **Reduced motion:** `:root` token override collapses every duration
  to 0 and disables breath. This is non-negotiable and already wired —
  new motion must flow through the tokens to inherit it.
- **Forbidden:** bounce, overshoot, spin, parallax, scroll-jacking,
  skeleton shimmer racing, decorative particles.

---

# 8 · Layout Rules

The three-zone shell (V6, permanent):

- **Sidebar (start/right):** fixed, deep navy, `w-20` md → `w-64` lg.
  Logo plate on white (the official logo is never redrawn, recolored or
  restyled), profile, main nav (gold illuminated active state: gold
  edge tick + gold-500/15 fill), workspace placeholders, "פעולה חדשה +",
  settings, `LawME OS · גרסה` footer.
- **Utility rail (end/left):** fixed, `w-72`, xl+ only. Quick action,
  mini calendar, היום הקרוב (first item glass+meridian), התזכורות שלי,
  התראות מערכת, נוכחות צוות. Never a second menu; never crowded.
- **Top command bar:** fixed glass between the zones
  (`top-0 start-20/64 end-72`), search + ⌘K + notifications + דינו +
  profile. Not a website header.
- **Workspace canvas:** the only scrolling region on desktop;
  `max-w-wide = 82rem`, `px-5 md:px-8`, content = few large objects.
- **Context Dock (pattern):** a floating glass column beside a scene,
  sticky, meridian-marked, `aria-live`; becomes a sheet-like expander
  below xl. Use when a workspace needs live context beside focus.
- **Hero rule:** ONE hero object per screen (V9 law). In the Morning
  Workspace it is the navy briefing; other workspaces choose their own
  single dominant object.
- **Timelines:** always meridian-threaded; the "now" cursor is glass;
  the active node breathes gold.
- **Spacing:** major objects `mt-10 md:mt-12`; the page bottom keeps
  `pb-24` so the last object seats above the fold edge.
- **Responsive:** md → icon sidebar + bottom nav hidden; xl → rail
  appears; mobile = recomposition (stack by priority, shelves scroll
  horizontally with snap, docks become sheets) — never a shrunken
  desktop. Zero horizontal overflow at 390/1024/1280/1440 is a release
  gate.

---

# 9 · Operational Objects — the visual grammar

Every object defines: hierarchy (identity → state → consequence →
action), required metadata, states, hover behavior, expansion.

- **Matter:** practice-area icon seat · name (heading) · HealthStateChip
  (state wash + breathing dot when live) · client/area/owner caption ·
  the milestone track (THE signature: gold current node, muted done,
  dashed future, missing-item diamonds, risk pulse, דינו mark) · gating
  facts · one CTA. Hover: latest activity + action. Expansion: פרטים
  נוספים disclosure. Featured/supporting/queue tiers — never identical
  anatomy.
- **Client:** person seat · name · waiting state · matter link · channel
  of last contact · one prepared action. Never rendered as a contacts
  row.
- **Document:** a physical sheet — layered edges, face preview lines,
  type chip (PDF coral / DOCX blue washes), version + time, review
  progress, status, דינו issue mark. Hover: lifts off the shelf +
  reveals note/action.
- **Timeline event:** time (tabular) · kind glyph · title · linked
  matter · prep bar. Active = glass + gold node; done = 50% opacity.
- **Task:** verb-first single line + owner + due state. Never a
  checkbox garden.
- **Deadline:** the strongest object in the language: type label, time
  remaining in bold semantic ink, owner, why-it-matters sentence, one
  action. Lives in the risk ledger grammar.
- **Meeting:** time + participants + prep bar + דינו's brief + one door.
- **Finance item:** label + tabular amount + trend (ltr island) +
  exception flag; sentence-first at workspace level.
- **Lead:** name + topic + source + time-since-response + value + one
  action; hot lead carries the gold edge.
- **Notification:** rail-only, icon + one line + time. Never toasts
  raining on the canvas.
- **Court update:** the docket grammar — spine + seal, official source
  line, kind chip, summary, דינו analysis, deadline impact, tasks
  created, client-updated state, one action.
- **Research result:** claim + authority + confidence bar + source +
  pin-to-matter action. No unsourced text.
- **דינו insight:** seal + finding (semibold) + why (one sentence) +
  related chips + evidence (hover glimpse, click drawer) + updated time
  + one action. Always navy or gold-washed paper, never a toast.

---

# 10 · Interaction Principles

- **Selection is state:** selected objects use `aria-pressed`/`data-live`
  + halo + meridian; selection re-aims context elsewhere on screen.
- **Hover reveals, never hides:** secondary info and actions surface on
  hover/focus-within; nothing essential is hover-only on touch (mobile
  surfaces the same content statically).
- **Context menus:** reserved for dedicated workspaces; every menu item
  must exist elsewhere as a visible affordance.
- **Keyboard:** ⌘K command bar everywhere; Esc walks focus back one
  level; every interactive object is a real button/link with the gold
  focus ring; arrow-key traversal is the standard for lists and boards.
- **Search:** one global search (top bar) + per-workspace scoped search;
  search focus makes the canvas recede slightly (opacity/scale token).
- **Quick actions:** the rail's פעולה מהירה and the sidebar's פעולה
  חדשה open the command bar pre-scoped.
- **Progressive disclosure:** `details` disclosures, expandable strips,
  drawers. Default-open only for the single most urgent thing in the
  scenario (the new decision on a hearing day). Everything else opens
  on intent.
- **Focus mode:** any object can own the viewport (future: matter room
  focus); the OS chrome never disappears.

---

# 11 · Workspace Launchers

The doors between applications. A launcher is an entrance, not a tile:
premium icon seat (xl, semantic variant) · workspace name · ONE
functional line · optional contextual badge (a count or בקרוב — never
marketing). Hover: glass + lift + edge light. Grid: 8 across at xl, 4
at sm, 2 on mobile. Launchers never show data previews, never carry
charts, never use consumer-app colors. Generic app-grid tiles are
forbidden.

---

# 12 · System States

- **Loading:** structure-true skeletons (the object's real silhouette in
  paper-300 blocks, no shimmer race); the shell never skeletons.
- **Errors:** honest, small, in-place; retry via `unstable_retry`; never
  a full-screen apology for a partial failure.
- **Offline:** a quiet glass banner in the top bar; work-in-view stays
  readable.
- **No data:** never blank — the empty state answers "what's the
  smartest thing to do now": no risky deadlines → quiet confirmation
  ("אין מועדים בסיכון היום") + opportunity; no documents → templates
  and knowledge; no clients waiting → a success state one line tall.
- **Completed work:** collapse to a one-line confirmation with a
  completed-state dot; never celebrate with confetti.
- **Healthy office:** the attention strip renders its quiet form; דינו
  offers strategic recommendations instead of alarms.

---

# 13 · Accessibility

- **Contrast:** AA minimum everywhere; on-navy text uses the dedicated
  `*-onnavy` ramps; faint metadata never drops below 4.5:1 on paper.
- **Keyboard:** everything reachable; visible gold focus ring
  (`focus-gold`); Esc semantics; `aria-pressed`, `aria-expanded`,
  `aria-current`, `aria-live` on re-aiming context.
- **Screen readers:** every glyph is `aria-hidden` unless it carries
  meaning (then role="img" + Hebrew label); rings and tracks expose
  `role="img"` with a full Hebrew sentence; the meridian and halos are
  `aria-hidden` always.
- **Reduced motion:** token-level collapse (see §7).
- **RTL:** logical properties ONLY (`start/end`, `ps/pe`, `ms/me`);
  physical translate allowed solely for edge-pinned panels; LTR islands
  for versions/trends; icons drawn RTL-first. `left`/`right` classes
  are a code-review rejection.

---

# 14 · דינו — the constitution

1. **Never a chatbot.** דינו has no chat bubble UI in operational
   workspaces. He speaks in single evidence-backed sentences inside the
   work. (The assistant panel is a tool surface, not a personality.)
2. **Never a mascot.** No face, no body, no animation. His entire
   identity is the meridian seal in champagne gold.
3. **Always contextual.** דינו appears attached to the object he speaks
   about — a matter, a document, a deadline — never as a floating
   oracle.
4. **Always useful.** Every appearance = finding + why it matters + one
   action. If דינו has nothing actionable, he is silent.
5. **Always evidence-based.** Every claim carries provenance (source,
   updated time, confidence). Evidence is one hover away (glimpse) and
   one click away (drawer). Unsourced דינו output is a product bug.
6. **Language:** "דינו זיהה…", "דינו הכין…", "דינו מצא…", "דינו
   ממליץ…", "שאל את דינו". First person never; hype never.
7. **Restraint:** one seal per object; no seal clusters; no gold
   texture. The seal's scarcity is its authority.

---

# 15 · Forbidden Design Rules — the 50 nevers

1. Generic KPI cards. 2. Repeated identical white boxes. 3. Generic
dashboard grid layouts. 4. Default library charts. 5. Rainbow color
coding. 6. Decorative AI effects (particles, glows, sparkle fields).
7. Random gradients (gradients are lighting only). 8. Tiny unreadable
text below the micro token. 9. Empty marketing hero banners. 10.
Repetitive equal-width section grids. 11. Purple. Anywhere. 12. Neon.
13. Dark-mode dashboards pretending to be premium. 14. More than one
hero object per screen. 15. More than two accent colors per viewport.
16. Gold as a content background. 17. Two gold highlights competing.
18. Solid dark borders instead of hairlines. 19. Ad-hoc shadows outside
the elevation ladder. 20. Glass on non-live surfaces. 21. Navy
exceeding ~10% of a screen. 22. Emoji as product icons. 23. Mixed icon
stroke weights. 24. Icon fonts or external icon images. 25. Gavel /
scales-of-justice as default court identity. 26. Loud channel brand
colors. 27. Decorative icons that answer nothing. 28. Hand-sized icons
bypassing the tokens. 29. Bounce/overshoot/spin animations. 30.
Scroll-jacking. 31. Perpetual motion beyond the single breathing node.
32. Motion outside the tokens (breaks reduced-motion). 33. Toast storms
on the canvas. 34. Full-screen error pages for partial failures. 35.
Blank empty states. 36. Confetti / celebration theater. 37. Physical
`left/right` utilities. 38. Non-tabular numerals in data. 39. Uppercase
faux-emphasis. 40. Serif type in operational UI. 41. Text truncation
that hides the only meaningful word. 42. Hover-only critical actions
(touch users exist). 43. Focus styles removed or browser-default. 44.
Charts as permanent residents on non-finance workspaces. 45. A second
scrollbar inside the canvas on desktop. 46. Sidebars that scroll away.
47. Redrawing, recoloring or restyling the official logo. 48. דינו as
a character, a face, or a chat bubble. 49. Unsourced דינו claims. 50.
Raw hex values or generic Tailwind palette colors inside components.
51. Shipping a module that informs but has no action. 52. New signature
light effects beyond the sealed three.

---

# 16 · Component Inventory

**Legend:** ✅ existing (V10-frozen) · 🔧 needs refinement · 🕳 not built.

### Shell
| Component | Status |
| --- | --- |
| SideRail (navy navigation) | ✅ |
| UtilityRail (daily companion) | ✅ |
| TopBar (glass command bar) | ✅ 🔧 (search recede effect) |
| MobileNav (bottom) | ✅ |
| CommandBar (⌘K) | ✅ 🔧 (scoped modes) |
| AssistantPanel (דינו tool surface) | ✅ 🔧 |
| ShellProvider (focus/keyboard state) | ✅ |

### Primitives
| Component | Status |
| --- | --- |
| IconContainer (19 variants, 4 sizes) | ✅ |
| Glyph set (40+ icons, tokens, practice map) | ✅ 🔧 (grows per workspace) |
| DinoMark / AIMark (meridian seal) | ✅ |
| StatusText / StatusTag / StateLine | ✅ |
| MicroProgress / ConfidenceBar | ✅ |
| HealthRing | ✅ |
| Button / Kbd | ✅ 🔧 (full button spec) |
| Tooltip | 🕳 |
| ContextMenu | 🕳 |
| Sheet (true mobile bottom sheet) | 🕳 |
| Drawer (generic evidence/detail drawer) | 🔧 (exists ad-hoc in DinoOffice) |
| Skeleton (structure-true) | 🕳 |
| Toast/Inline notice system | 🕳 |

### Patterns
| Component | Status |
| --- | --- |
| Workspace (canvas) | ✅ |
| SectionHeading (gold tick) | ✅ |
| PageHeader / SectionChapter / Placeholder | ✅ 🔧 |
| ContextDock | 🔧 (built in V7–V9, retired from /today; returns in Matter Workspace) |
| GlassSurface / PremiumSurface / IntelligenceSurface utilities | ✅ (as CSS utilities) |

### Morning Workspace (frozen)
| Component | Status |
| --- | --- |
| TodayWorkspace (orchestrator) | ✅ |
| TodayFocus + CompactTimeline + דינו band | ✅ |
| OfficeAttentionStrip + risk ledger | ✅ |
| MatterBoard (Featured / Supporting / Queue) | ✅ |
| MatterSignature (milestone track) + HealthStateChip | ✅ |
| WorkspaceLaunchers | ✅ |
| DinoOffice (intelligence footer + evidence drawers) | ✅ |

### Designed in V7–V9, awaiting their dedicated workspaces
TeamWorkload (bench + CapacityGauge) · ClientWaiting (action inbox) ·
CourtUpdates (docket stream) · DocumentShelf (physical sheets) ·
LeadStrip (pipeline) · FinanceStrip (executive instrument) — all 🔧:
resurrect from git history into their workspaces, upgraded to V10 icon
and composition law.

### Not built (per workspace)
Matter room (list, spine, parties, time ledger) 🕳 · Document inspector,
compare view, signature flow 🕳 · Research thread, authority object 🕳 ·
Client room, client timeline 🕳 · Calendar grid, event inspector 🕳 ·
Knowledge entry, template object 🕳 · Automation recipe 🕳 · Admin forms
🕳 · role switcher 🕳 · true bottom sheets 🕳.

---

# 17 · Roadmap — the build order and why

The Morning Workspace is the foundation: it already exercises the
materials, the icon system, the milestone track, the attention grammar,
דינו's constitution and the launcher doors. Every next workspace reuses
those assets in this order:

1. **Matter Workspace** — first because it is the product. Every other
   workspace references matters; the matter room defines the deep-work
   patterns (spine navigation, context dock's return, task/time
   objects) that everything else borrows. The Morning Workspace already
   sells it: every door on /today leads here first.
2. **Document Workspace** — second because documents are the matter's
   heaviest artifact and the shelf/inspector/compare grammar is already
   half-designed (V7 shelf). Matters without documents are a shell.
3. **Research Workspace** — third: it feeds matters and documents with
   authorities, and it is דינו's deepest showcase. Requires the
   evidence-drawer pattern matured in 1–2.
4. **Client Workspace** — fourth: communication references matters,
   documents and research outcomes; the action-inbox grammar (V8) is
   ready to resurrect.
5. **Calendar Workspace** — fifth: by now every event type (hearing,
   deadline, meeting) exists as a mature object; the calendar composes
   them rather than inventing them.
6. **Finance Workspace** — sixth: billing needs matters (rates, time
   entries from the matter room) and clients (collection) to mean
   anything. The executive-strip grammar is ready.
7. **Automation Workspace** — seventh: automations orchestrate objects
   from ALL previous workspaces; building it earlier would automate
   nothing.
8. **Admin Workspace** — last: roles, rates and integrations configure
   a system that must first exist.

(Team and Knowledge slot in beside 5–6 as capacity allows: Team after
Calendar — it needs real workloads; Knowledge after Research — it
curates what research produces.)

Each workspace ships only when it passes: the blur test, the two-accent
law, the one-hero law, zero overflow at the four widths, keyboard + RTL
+ reduced-motion gates, and this Bible's forbidden list.

---

*End of the LawME Design Bible v1.0. Amendments require a founder-
approved revision with a changelog entry in this file.*

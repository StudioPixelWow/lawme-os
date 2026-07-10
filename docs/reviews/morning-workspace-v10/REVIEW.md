# Morning Workspace V10 — Approved Composition + Premium Icon System

**Sprint:** implement the approved visual reference exactly — a focused
workspace of five large product objects — and make iconography a brand
asset. No new business modules; typed mock data only.

---

## 1. The approved composition, implemented

Center = exactly five objects, in order: **Today Focus briefing** →
**Office Attention Strip** → **Active Matters** (featured + 3
supporting + folded queue) → **Workspace Launchers** → **דינו
intelligence footer** + tagline. The long stacked dashboard did not
return: Finance, Leads, Team, Communication, Court updates and the
Document shelf no longer hold permanent blocks — they surface through
the attention strip, the featured matter, the rail and the launcher
doors.

## 2. Removed central components

`context-dock`, `team-workload`, `client-waiting`, `court-updates`,
`document-shelf`, `lead-strip`, `finance-strip`, `focus-timeline`
(superseded by the briefing's internal CompactTimeline). Their data
models remain in `office.ts` for the dedicated workspaces.

## 3. Today Focus — the operational briefing

One full-width navy scene (surface-hero-dark, champagne edge light,
gold meridian at the start edge, context halo):
mission label → objective (title type) → countdown in gold with the
event glyph → time & location → the one missing requirement with its
action → one champagne CTA + one quiet contextual door. The second
column holds the readiness ring and the **compact vertical timeline**
("השלב הבא בלוח הזמנים": next three events on a meridian spine, active
event in navy glass; expandable to the full day; selection re-aims the
briefing). The **דינו band** closes the scene: one insight, one door.

## 4. Office Attention

Titled "מה דורש את תשומת הלב שלך היום" with one full-list door. Six
signals in one strip; ink figures; only the critical item carries
gold + red and expands the legal-risk ledger in place.

## 5. Active Matters

Featured matter = a mini legal workspace: identity (practice-area icon
seat, name, state chip) → the milestone track → gating facts +
"המלצת דינו" panel → always-visible latest activity → the operational
floor (3.5 שעות טרם חויבו · team · פתח את התיק). Three supporting
matters with state rings, matter-state edge accents, one issue, one
דינו line, hover-revealed action. The queue folds under
"עוד תיק אחד במעקב שוטף".

## 6. Milestone visualization

The V7 signature track upgraded by the V8 stage vocabulary: קליטה →
כתבי טענות → הכנה לדיון → דיון הוכחות → הכרעה (per practice area), gold
current node, muted completed nodes, dashed future, missing-item
diamonds, risk pulse, דינו mark. Not a progress bar — the proceeding.

## 7. The icon system

- **Semantic sizes** (`icons/tokens.ts`): metadata 14 → status 40;
  no ad-hoc sizing in V10 components.
- **15 new glyphs**: dino, research, signature, filing, bench,
  legislation, evidence, compare, history, preview, building, shield,
  lock, share, report, plus — same 24px/1.5 grid as the core set.
- **Practice-area marks** (`icons/practice.tsx`).
- **IconContainer** extended: 19 semantic variants × light/navy, xl
  size for launchers, inner top highlight, interactive lift.
- Full documentation: `docs/design-system/iconography.md`.

## 8. The דינו mark

`DinoGlyph` — the **meridian seal**: an instrument ring threaded by the
gold meridian with one filled node. Replaces the sparkle everywhere via
`AIMark`/`DinoMark`. System symbol, not a mascot; champagne gold only;
used solely for AI-generated/prepared/verified content.

## 9. Shell refinements

Sidebar: full workspace navigation (מחקר משפטי, דינו, פיננסים, צוות,
דוחות as בקרוב), "פעולה חדשה +" primary action, "LawME OS · גרסה 0.9"
footer. Rail: reference group labels (היום הקרוב, התזכורות שלי, התראות
מערכת, נוכחות צוות); the communication block removed to keep it
uncrowded. Logo untouched.

## 10. Responsive

Desktop: full composition. Laptop: hierarchy preserved. Tablet: icon
sidebar, launchers 4-across. Mobile: briefing first, matters stacked,
attention strip wraps to a compact list, launchers 2-column. 0px
overflow at all four widths.

## Validation

lint / typecheck / build clean · 0px overflow (1440/1280/1024/390) ·
no emoji icons · one icon language · two-accent rule holds · keyboard
and reduced-motion intact.

## Still requires founder review

1. Supporting-matter density vs. the featured matter's height balance.
2. Launcher descriptions — one line vs. two on narrow desktops.
3. Whether the דינו band's "ראה פרטים" should open the footer drawer
   directly (currently separate objects).
4. The sidebar's "פעולה חדשה" behavior (currently visual only).

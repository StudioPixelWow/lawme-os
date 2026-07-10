# LawME Iconography — the premium icon system (V10)

Icons are a first-class brand asset. One outlined language, drawn on a
24px grid with a 1.5px stroke, rounded caps and joins, `currentColor`
ink. Fills appear only for live/selected/urgent states (e.g. the
timeline's active node, the דינו seal's node).

## Art direction

Precise · architectural · technological · legal · calm. No cartoon
geometry, no mixed fill/outline without purpose, no emoji anywhere in
the product, no external image icons. Every icon must read at 14px by
silhouette alone.

## Semantic sizes (`src/design-system/icons/tokens.ts`)

| Role | px | Where |
| --- | --- | --- |
| `metadata` | 14 | timestamps, micro facts |
| `inline` | 16 | body-text rows |
| `action` | 18 | compact actions, chips |
| `nav` | 20 | navigation items |
| `section` | 24 | section headers, hero countdown |
| `launcher` | 28 | workspace launchers |
| `featured` | 32 | featured operational objects |
| `status` | 40 | major status / empty states |

Components import `ICON` and never hand-size icons.

## The set (`src/design-system/icons/glyphs.tsx`)

Core (V2–V8): search, close, home, briefcase (matter), users (team),
calendar, document, bell, clock, pin, user (client), **court (columns —
no gavel/scales cliché as the default)**, phone, alert (risk), trend
(RTL-drawn), task, check, pen (drafting), book (case law), hourglass
(waiting), gear, ledger (billing), chat (WhatsApp form), mail.

V10 additions: **dino** (the meridian seal), research (magnifier over
text), signature, filing (tray + submission), bench (judge/hearing),
legislation (scroll), evidence (sealed exhibit), compare (mirrored
sheets), history, preview (eye), building (real estate), shield
(insurance/security), lock (privilege), share, report, plus.

## Practice-area marks (`icons/practice.tsx`)

ליטיגציה → court · מקרקעין → building · מסחרי → pen · ירושה →
legislation · ביטוח → shield · default → briefcase. Professional
symbolic marks, never illustrations.

## Icon containers (`primitives/icon-container.tsx`)

The physical seat behind every meaningful glyph: semantic wash, icon
ink, inner top highlight (`before:` gradient), hairline seat shadow,
optional interactive lift with catch-light. Variants: neutral, navy,
gold, urgent, warning, success, info, document, finance, ai/dino,
client, calendar, matter, court, hearing, research, team,
communication — each with a navy-surface equivalent. Sizes: sm 28 ·
md 36 · lg 44 · xl 56.

## The דינו mark

`DinoGlyph` — an instrument ring threaded by the meridian, with one
filled node. Not a sparkle, robot, brain or mascot: a system seal.
Champagne gold on both surfaces (`AIMark` / `DinoMark` in
`primitives/indicators.tsx`). Used ONLY where דינו generated, prepared,
verified or recommends. Never decorative, never repeated for texture.

## Semantics rule

Every icon answers at least one: what is this object · what state is it
in · what action is available · what requires attention · who created
it (דינו?) · is it urgent/complete. If an icon answers none — remove it.

## RTL

Icons are drawn direction-neutral or RTL-native (trend, filing).
Logical properties position every seat; no icon relies on physical
left/right meaning.

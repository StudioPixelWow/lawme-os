# 01 · Wireframes — High Fidelity (FROZEN)

Measured ASCII layouts with real proportions. Not pixel art — true zone widths.
RTL: SideRail at start/**right**, Context Dock at end/**left**. In ASCII (LTR) the
right-most column is the SideRail to preserve real RTL placement.

Fixture: *כהן נ׳ טק-ליין* (פיטורי עובדת בהריון), stage = אימות עובדות, blocked
(missing affidavit, strict deadline overdue). Second render: healthy matter.

## Zone measurements

| Zone | 1440 | 1024 | 390 |
|---|---|---|---|
| SideRail (start/right) | 256px (`w-64`) | 80px (`w-20`, icons) | hidden → ⌘K |
| Top command bar | full, glass, 56px h | full, 56px | 52px sticky |
| Canvas center | 896px (1440−256−288) | fills (−80) | full |
| Context Dock (end/left) | 288px (`w-72`) | drawer (sheet) | accordion + sheets |
| Canvas content max | `max-w-wide` 82rem, `px-8` (32) | `px-5` (20) | `px-4` (16) |
| Section rhythm | `mt-10/12` (40/48) | 40 | 24 |

## Desktop 1440 — blocked matter (default viewport)

```
 0            256                                            1152        1440
 ├────────────┼──────────────────────────────────────────────┼───────────┤
 │ 56px  TOP COMMAND BAR (glass · fixed)                                   │  ← spans 256→1440
 │  ⌘K חיפוש בתיק…                       התראות  ⚑דינו  פרופיל  ◧לוגו      │
 ├──────────┬───────────────────────────────────────────────┬─────────────┤
 │ CONTEXT  │  CANVAS 896px  (px-8 → content 832)            │  SIDE RAIL   │
 │ DOCK 288 │                                               │  256 (navy)  │
 │ (left)   │  ┌─────────────── DECISION CORE (hero) ──────┐ │  ◧ לוגו      │
 │          │  │ [⚖]  כהן נ׳ טק-ליין                       │ │  ◔ פרופיל    │
 │ ◈ מדד     │  │      דנה כהן · דיני עבודה · ל׳ שרון        │ │  ──────────  │
 │ מוכנות    │  │  ┌──────────┐                             │ │  ● היום      │
 │ ▁▃▅ 33%  │  │  │ חסום 🔴  │  ⟲ היום · טעון בדיקת שותף   │ │  ▸ תיקים ◄   │
 │ ↓ חלש:   │  │  └──────────┘                             │ │  מסמכים      │
 │   ראיות   │  │  ״חסר תצהיר עד מרכזי; מועד קשיח חלף.״      │ │  מחקר        │
 │ ↑ חזק:   │  │  ┌───────────────────────────────────┐    │ │  לקוחות      │
 │   מסמכים  │  │  │ ← השלם תצהיר עד מחר · עו״ד · אישור │CTA │ │  יומן        │
 │          │  │  └───────────────────────────────────┘    │ │  פיננסים     │
 │ ◈ מועד    │  └───────────────────────────────────────────┘ │  צוות        │
 │ דיון סעד  │                    mt-12                        │  ──────────  │
 │ בעוד 4 ימ׳│  ┌───────── MILESTONE SPINE (procedure) ──────┐ │  + פעולה     │
 │ ▲ קשיח    │  │  ●────────●────────◉────────○────────○     │ │    חדשה      │
 │          │  │  קבלה   אימות¹  ◆אימות²  שימור  הערכה       │ │  ⚙ הגדרות    │
 │ ◈ נוכחות  │  │                 עובדות  ראיות              │ │  ──────────  │
 │ ל׳ שרון   │  │        ⚑דינו: כיסוי חלקי  ▲ חוסם מעבר       │ │  LawME OS    │
 │ 🟢 זמינה  │  └────────────────────────────────────────────┘ │  גרסה        │
 │          │                    mt-10                        │              │
 │ [פעולה   │  ▸ ראיות(2)  ▸ מסמכים  ▸ משפטי⚑  ▸ לקוח  ▸ סיכון▲│              │
 │  מהירה]  │     Intelligence Lenses (collapsed, one opens)   │              │
 └──────────┴───────────────────────────────────────────────┴─────────────┘
     288                     896                                   256
```

Proportion note: the Decision Core occupies the top ~38% of the canvas height; the
Spine ~40%; the collapsed lens rail ~1 line. One hero (the core on the now-node), one
red (חסום) + gold meridian = two accents.

## Desktop 1440 — healthy matter (same room, calm)

```
 │ DECISION CORE                                                          │
 │ [⚖] מזונות · לוי נ׳ לוי       ┌──────────┐  ⟲ היום                       │
 │     יעל לוי · דיני משפחה      │ במסלול 🟢 │                              │
 │ ״התיק מתקדם כשורה. כל תנאי    └──────────┘                              │
 │   השלב מולאו.״                                                          │
 │ ┌────────────────────────────────────┐                                 │
 │ │ ← קדם לשלב הבא: הגשת בקשה · עו״ד     │                                 │
 │ └────────────────────────────────────┘                                 │
 │ ●────────●────────◉────────○────────○     (no ◆, no ▲, no ⚑)            │
 │ ▸ ראיות✓  ▸ מסמכים✓  ▸ משפטי✓  ▸ לקוח✓   (all ink, no color)            │
```

One green + gold = two accents. The dock's Score rail shows a calm 88% with no
weakest call-out. No manufactured warnings.

## Tablet 1024 — dock becomes a drawer, rail becomes icons

```
 0    80                                              1024
 ├────┼─────────────────────────────────────────────────┤
 │ 52  TOP BAR (glass)   ⌘K …    התראות ⚑ פרופיל  [☰דוק]  │
 ├─────────────────────────────────────────────────┬─────┤
 │ CANVAS (fills, px-5)                             │ RAIL│
 │  ┌───────── DECISION CORE ─────────────────────┐ │ ◧   │
 │  │ [⚖] כהן נ׳ טק-ליין   [חסום 🔴]              │ │ ●   │
 │  │ ״חסר תצהיר; מועד חלף.״   ל׳ שרון · אישור     │ │ ▸◄  │
 │  │ ← השלם תצהיר עד מחר                          │ │ ▪   │
 │  └─────────────────────────────────────────────┘ │ ▪   │
 │  ●────●────◉────○────○   (spine)                  │ +   │
 │  ▸ ראיות(2) ▸ מסמכים ▸ משפטי⚑ ▸ לקוח ▸ סיכון▲     │ ⚙   │
 └─────────────────────────────────────────────────┴─────┘
   [☰דוק] opens Context Dock as a right/end sheet over the canvas.
```

Decision Core preserved at full prominence; the dock is one tap away.

## Mobile 390 — recomposition (stack by priority)

```
 ┌─────────────────────────────┐  0            390
 │ ⌘K  כהן נ׳ טק-ליין      ⚑    │  52 sticky top
 ├─────────────────────────────┤
 │ ┌─────────┐                 │  1 · DECISION CORE
 │ │ חסום 🔴 │  טעון בדיקה      │
 │ └─────────┘                 │
 │ ״חסר תצהיר עד; מועד חלף.״    │
 ├─────────────────────────────┤
 │ ▲ דיון סעד · בעוד 4 ימ׳ · קשיח│ 2 · DEADLINE (pinned when strict)
 ├─────────────────────────────┤
 │ ●─●─◉◆─○─○  ›  (h-scroll·snap)│ 3 · SPINE shelf (now-node centered)
 ├─────────────────────────────┤
 │ ⚑ משפטי: כיסוי חלקי · מומחה  │ 4 · top דינו seal
 ├─────────────────────────────┤
 │ ▸ ראיות (2 חסרות)           │ 5 · lenses (accordion → bottom sheet)
 │ ▸ מסמכים                     │
 │ ▸ לקוח · סיכון ▲             │
 └─────────────────────────────┘
 │███ ← השלם תצהיר עד מחר ███│   STICKY bottom action (always visible)
 └─────────────────────────────┘
   ( ⚑ שאל את דינו → bottom sheet )
```

Mobile order = decision core → deadline → spine → top seal → lenses; the one action is
a sticky bottom bar; דינו is a bottom sheet. Never a shrunken desktop.

## Evidence drawer (all widths — glass, rises in)

```
        ┌───────────────────────── drawer ──────────────────────┐
        │ ⚑ דינו · כיסוי משפטי חלקי                    ⟲ היום    │
        │ מדוע: לא אושרו כל העובדות המכריעות → insufficient_facts │
        │ מקורות: חוק עבודת נשים §9 (מאומת) · פסיקה: מועמד       │
        │ ביטחון: בינוני                                         │
        │ ┌──────────────────────────┐                          │
        │ │ ← העבר לבדיקת מומחה        │  (Esc סוגר · חוזר לאובייקט)│
        │ └──────────────────────────┘                          │
        └────────────────────────────────────────────────────────┘  end/left, w~360
```

## Focus mode (any object owns the canvas)

```
 │ TOP BAR (chrome stays)                                     │
 │  ┌──────────── FOCUS: Legal coverage (טריאדה) ───────────┐ │
 │  │ חקיקה ✓   פסיקה: מועמד — לא מאומת   הליך ✓            │ │
 │  │ מצב: insufficient_case_law · ניתן להמליץ (עם פער מגולה)│ │
 │  │ ← העבר לבדיקת מומחה                                   │ │
 │  └────────────────────────────────────────────────────────┘ │
 │   Esc → returns to the Decision Core (one focus level back)  │
```

All wireframes are RTL-native, one-hero, two-accent, and bound to `MatterProfile`.

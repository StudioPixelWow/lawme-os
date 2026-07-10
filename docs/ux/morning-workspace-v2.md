# Morning Workspace v2 — המכתב והנהר
### The Letter & The River · The new UX vision for LawME

**Status:** proposal for founder approval. No code has been written against this document.

---

## The diagnosis, in one sentence

Sprint 0 is beautiful — and it is still *a layout*: a header, then sections, then boxes
under headings. Every CRM on earth is a layout. An operating system for a law firm must be
something else: **a correspondence between a lawyer and a place that has already done the
thinking.** The unit of the current design is the *section*. The unit of v2 is the
*sentence* and the *moment*.

Two metaphors replace the page-of-sections:

- **המכתב (The Letter).** The workspace opens as a short letter עמית wrote to you this
  morning — real prose, not widgets. Everything in the letter is alive: case names,
  dates and people are *live tokens* you can press. The interface is written, not arranged.
- **הנהר (The River).** Below the letter, scrolling stops being "moving down a page" and
  becomes **moving through time**. One continuous stream: this morning, today, tomorrow,
  the week. A single gold hairline — קו העכשיו, the Now Line — marks where you stand.

Nobody ships this. HubSpot can't write you a letter. This is the moat, made visible.

---

## 1. What the user sees in the first 3 seconds

**Second 0 –1:** Warm paper. Nothing else. No rail, no buttons, no chrome. Then a single
serif line inks itself in, slightly above center, like a fountain pen finishing a sentence:

> **בוקר טוב, טל.**

**Second 1–2:** A second line settles beneath it, smaller, written by עמית:

> הכנתי לך את הבוקר. שלושה דברים באמת חשובים היום — הנה הם.

**Second 2–3:** The letter's first paragraph breathes in (one soft rise, not a cascade of
boxes), and only now the chrome whispers into existence: a nearly invisible wordmark
top-start, the quill line (see §11) faint at the bottom. The user's eye never had a chance
to see "an app". They saw a greeting, then a thought.

The 3-second contract: **greeting → thought → world.** Never "grid → widgets → data".

```
second 0                second 1.5              second 3
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│              │        │              │        │  LawME ·     │
│              │        │   בוקר טוב,  │        │   בוקר טוב,  │
│    (paper)   │   →    │      טל.     │   →    │      טל.     │
│              │        │              │        │  הכנתי לך …  │
│              │        │              │        │  ¶ המכתב…    │
│              │        │              │        │ ‸ ___________ │
└──────────────┘        └──────────────┘        └──────────────┘
                                                  (quill line)
```

## 2. The emotional experience

The feeling to engineer: **arriving at your chambers at 07:00 and discovering your chief
of staff came in at 06:00.** The lights are warm, the desk is clear, and on it lies one
handwritten page: *here is what matters, here is what I've already prepared, here is what
only you can decide.*

Emotions, in priority order:

1. **Being ahead** — never behind. The product opens with work already done, not work demanded.
2. **Being addressed** — by name, in your language, in the second person. Software that
   writes to you is company; software that displays at you is machinery.
3. **Calm authority** — the aesthetics of jurisprudence: serif, ivory, ink. A courtroom's
   gravity without its anxiety.
4. **Quiet pride** — the tool feels expensive, like a fine instrument the firm bought
   because the firm is serious.

Anti-emotions (design failures if felt): monitored, dashboarded, gamified, hurried, sold-to.

## 3. How scrolling works — the River

One axis, one meaning: **vertical scroll = time.** Not "content below", but "later below".

- The letter floats at the top — it is *this morning*, written once, fixed like a letter is.
- Beneath it runs the River: moments in chronological order — a hearing at 11:30, a
  deadline at 16:00, tomorrow's preparation, Thursday's filing. Each moment is a **scene**
  (§4), not a card in a grid.
- **קו העכשיו (the Now Line):** a single gold hairline that lives at the reading line.
  Everything above it has happened (scenes above render in a quieter, "already ink-dry"
  register — softer contrast, past-tense verbs). Everything below is still to come.
  During the day, the line doesn't move — *the river flows up through it.* Come back at
  14:00 and the morning's scenes have drifted above the line, settled and pale.
- Scrolling down past today continues into tomorrow and the week — the type gets slightly
  smaller, the space slightly larger, like distance. Scrolling to the very end never hits
  a wall; it dissolves to one closing serif line at the horizon:
  «זה השבוע. אני שומר על השאר.» — and paper.
- No scroll-jacking, no parallax, no snap. The river is read, not ridden. The only
  scroll-linked event is scenes settling in as they enter the view (once).

## 4. What sections appear (there are no sections — there are movements)

The v1 anatomy (PageHeader → SectionChapter × 4 → Placeholders) is dissolved. The v2
morning has **four movements**, like a piece of music:

| Movement | What it is | Voice |
|---|---|---|
| **א · המכתב** | 4–8 sentences עמית wrote: the state of the firm this morning, with live tokens. Ends with his signature: ✦ עמית | Prose, serif-led |
| **ב · ההחלטות** | "רק אתה יכול להחליט" — the 0–3 things that genuinely need the lawyer's judgment today (a draft to sign, a conflict to resolve, an offer to answer). Rendered as **papers on the desk**: raised ivory sheets, one per decision | Objects, not list rows |
| **ג · הנהר** | The chronological stream of scenes crossing the Now Line: hearings, deadlines, meetings, things עמית did overnight | Timeline as narrative |
| **ד · האופק** | The week ahead, compressed into three quiet lines of prose. Then the horizon sentence | Prose again, fading |

A returning user at 15:00 doesn't get the morning letter again — the letter's place holds
a two-line afternoon note («שני דברים זזו מאז הבוקר…»). The letter is written for the
*visit*, not for the route.

## 5. Which sections are HUGE

- **The greeting.** Full display size, alone in the viewport at open. It owns second one.
- **A decision paper, when touched.** Press a paper in movement ב and it becomes the
  **Stage** (§12): it expands in place to near-full viewport, everything else recedes into
  soft blur behind it. The most important object in the firm at that moment is allowed to
  be the size of the screen.
- **The next hearing, when it is near.** Within ~2 hours of a hearing, its scene swells
  into the letter itself as a glass moment (the only ambient glass on the canvas — §8):
  courtroom, judge, the two documents you need, one line from עמית on what to expect.
- Everything else stays humble. Hugeness is a privilege of *now* and *decision* — never of
  categories, counts, or charts.

## 6. Which sections disappear

Killed, deliberately, from the current implementation:

- **The permanent top rail.** Chrome recedes (§10). The five nav words stop being
  architecture and become a summonable constellation.
- **The section-under-heading pattern** («דורש את תשומת לבך» + box). If it needs your
  attention, it's in the letter or on the desk. Headings-over-boxes is CRM grammar.
- **Placeholder wells / empty-state cards.** Emptiness is written, not boxed: an empty
  morning is simply a shorter letter («בוקר שקט. דיון אחד ביום חמישי, ושום דבר בוער.»).
- **The עמית side panel as home for AI.** עמית doesn't live in a drawer; he wrote the
  page. The panel survives only as a *conversation transcript* when you go deep (§7).
- **Any surviving stat-card instinct.** Counts appear only inside sentences, as ink.
- **The separate "search field" affordance.** Replaced by the quill line (§11).

## 7. How AI becomes the center

Not a feature, not an assistant bolted to the edge — **the narrator of the workspace.**

- **עמית writes the surface.** The letter, the scene annotations, the horizon — the actual
  UI copy *is* model output (constrained, cited, template-scaffolded). The interface is
  the AI's handwriting; using LawME is corresponding with it.
- **The gold signature is the trust seal.** Everything עמית wrote carries the gold
  hairline + ✦ signature; his uncertainty is written in words («לא מצאתי אסמכתה — תבדוק
  אותי כאן»), never hidden. Human ink is navy; עמית's presence is gold light. One glance —
  never a doubt about who wrote what.
- **Decisions, not chores.** עמית's overnight work arrives as finished papers awaiting
  signature (movement ב): a drafted response, a proposed time entry, a prepared filing.
  The lawyer's day is curated down to *judgment* — the one thing only they can do.
- **The quill is a dialogue, not a query box** (§11). Ask in the middle of the river;
  the answer settles inline, in the letter's voice, with citations to the firm's documents.
- **He remembers the correspondence.** Yesterday's «תזכיר לי מחר» appears in today's
  letter. The letter refers to previous letters. Over months, the mornings become a
  written history of the firm — searchable, quotable, *the firm's memoir writing itself*.

## 8. How glass is used — glass means "now"

New law, stricter and stranger than v1's "glass = ephemeral": **glass is the material of
the present tense.** Paper is memory and plan; glass is the living moment.

Exactly three glass objects exist in the entire OS:

1. **The Now Line's badge** — a small floating glass lozenge riding the gold hairline:
   the current time, and (when relevant) «דיון בעוד 40 דק׳». It is the only persistent
   glass on screen.
2. **The imminent-hearing moment** (§5) — a scene made of glass for the two hours it is
   "now-adjacent", returning to paper once it passes into the river's history.
3. **The summoned עמית** — when the quill line is engaged, the response surface is glass
   floating over the paper, because a conversation is always happening *now*.

Everything else — letter, papers, scenes, horizon — is matte ivory. When the user sees
glass, their body should already know: *this is live.*

## 9. How whitespace is used

- **One thought per viewport.** The composition unit is the breath, not the section:
  greeting alone; then letter; then the desk; then the river's first scene. At any scroll
  position, roughly one idea owns the screen.
- **Margins like a book, not padding like an app.** The letter column is a narrow measure
  (~40ch) swimming in paper; on wide screens the emptiness *grows* instead of the content.
  The margin is where עמית's small annotations may sit (a gold footnote beside a scene).
- **Space is the hierarchy.** No dividers anywhere on the morning surface. Distance says
  what borders used to say. If two things feel unrelated, they get further apart, not a line.
- **Silence at the edges.** The first and last viewports of the experience contain almost
  nothing (greeting; horizon sentence). The workspace begins and ends in quiet — like a
  well-set book begins with a half-title page.

## 10. How navigation works — chrome that recedes

**The reader shouldn't see the library's signage while reading.**

- **At rest: nothing.** Once the morning has opened, chrome fades to near-zero — a ghost
  wordmark top-start, the quill line bottom-center at ~40% presence. 96% of pixels are content.
- **On intent: the constellation.** Move toward the top, press ⌘K, or pull down — and the
  five destinations (היום · תיקים · לקוחות · יומן · מסמכים) appear as a sparse glass-less
  row of serif words across the top of the paper, with the gold underline on the current
  one. Choose or dismiss; it recedes again.
- **Entities open as stages, not pages.** A case token pressed in the letter doesn't
  navigate away — the case rises as a Stage over the morning (URL updates, back returns).
  The morning is never lost; it's the ground everything else stands on. Full pages
  (תיקים as an index) still exist for deliberate visits via the constellation.
- **Mobile:** the morning is the app. The quill line sits above the thumb; the
  constellation is a pull-down. No tab bar — a letter doesn't have tabs.

## 11. How command search evolves — from command bar to הקולמוס (the Quill)

⌘K's overlay dies. In its place, **one thin line at the bottom center of every screen** —
a resting caret on paper, like a pen waiting at the margin:

```
                    ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
                          ‸  כתוב, חפש, או בקש…
                    └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

- **Type anywhere.** Any keystroke on the canvas engages the quill (no modifier ceremony;
  ⌘K still honored for muscle memory). The paper dims a breath; a glass thought-surface
  opens *upward* from the line.
- **One grammar, three intents, zero modes.** The quill infers: a *noun* («כהן נגד לוי»)
  finds and offers the Stage; a *verb* («קבע דיון הוכחות ליום שלישי») becomes a proposal
  paper awaiting confirmation; a *question* («מה נשאר פתוח מול המוסך?») is answered
  inline by עמית, cited, in prose. Navigation, creation and conversation stop being
  separate features — they are sentences.
- **Answers are letters, not lists.** Results render as a short written reply with live
  tokens — «יש שלושה תיקים מול כהן. הפעיל שבהם, *כהן נ׳ לוי*, ממתין לתגובתך מיום שני.» —
  with the raw list one keystroke away for power users.
- **The quill remembers.** Its history is a correspondence log, re-askable, part of the
  firm's memoir (§7).

## 12. Story-driven, not dashboard-driven — the grammar shift

The deep rewrite is grammatical. A dashboard asks: *what data do we have? arrange it.*
A story asks: *what happened, what's at stake, what happens next?*

| Dashboard grammar (v1 residue) | Story grammar (v2) |
|---|---|
| Sections named after data types («הדיונים הקרובים») | Movements named after meaning (המכתב, ההחלטות, הנהר, האופק) |
| Cards representing records | Scenes representing *moments*, papers representing *decisions* |
| Counts («3 דיונים השבוע») | Consequence («ביום חמישי אתה מול השופטת ברק — התצהיר עוד לא חתום») |
| Navigation between modules | One ground (the morning) + stages rising over it |
| Empty states | Shorter letters |
| AI in a panel | AI as narrator, signed in gold |

**A matter, too, becomes a story told by עמית** (the same grammar carried inward): its
Stage opens not with fields but with a paragraph — «התיק נפתח במרץ. שלב הראיות. הצד השני
מתמהמה בגילוי מסמכים — הנה ההשתלשלות.» — and the river of that case runs beneath it.
One grammar from the first morning to the deepest dossier. That coherence — every surface
narrated, every moment on one river of time, every decision an object with dignity — is
the thing no one has seen before.

---

## Assembled wireframes (rough, RTL — right edge is the start)

**The morning, at rest (desktop):**

```
┌────────────────────────────────────────────────────────────┐
│ (ghost) LawME·”                                            │
│                                                            │
│                                   בוקר טוב, טל.            │  ← serif display, alone
│               הכנתי לך את הבוקר. שלושה דברים באמת חשובים.  │
│                                                            │
│      התיק של *כהן נ׳ לוי* זז: בית המשפט קבע ⟨דיון הוכחות⟩  │  ← the letter; *live tokens*
│      ליום שלישי. הכנתי ⟨טיוטת תגובה⟩ — היא מחכה לחתימתך.   │
│      מול ⟨מוסך הצפון⟩ עברו 12 יום בלי מענה; ניסחתי תזכורת. │
│                                                   ✦ עמית   │  ← gold signature
│                                                            │
│              ─── רק אתה יכול להחליט ───                    │
│      ┌──────────────────┐  ┌──────────────────┐            │
│      │ טיוטת תגובה      │  │ רישום 3.5 שעות   │            │  ← papers on the desk
│      │ כהן נ׳ לוי       │  │ אתמול · 4 תיקים  │            │    (raised ivory sheets)
│      │ ⟨חתום⟩ ⟨ערוך⟩    │  │ ⟨אשר⟩ ⟨תקן⟩      │            │
│      └──────────────────┘  └──────────────────┘            │
│                                                            │
│  ════════════〔 10:42 · דיון בעוד 49 דק׳ 〕════════════════  │  ← the NOW LINE (gold)
│                                                 (glass)    │
│      11:30 · בית משפט השלום ת״א · אולם 304                 │  ← imminent scene (glass)
│      ⟨תצהיר עדות⟩ ⟨כתב הגנה⟩ · «השופטת מקפידה על זמנים»    │
│                                                            │
│      16:00 · מועד הגשה: סיכומים — *לוי נ׳ עירייה*           │  ← future scenes (paper)
│      מחר · פגישת לקוח חדש · בדיקת ניגוד עניינים הושלמה ✦    │
│                                                            │
│                 זה השבוע. אני שומר על השאר.                │  ← the horizon
│                                                            │
│                   ‸  כתוב, חפש, או בקש…                    │  ← the quill (40%)
└────────────────────────────────────────────────────────────┘
```

**The quill, engaged (glass thought-surface rises from the line):**

```
┌────────────────────────────────────────────────────────────┐
│              (the morning, dimmed one breath)              │
│   ╔════════════════════════════════════════════════╗      │
│   ║  יש שלושה תיקים מול כהן. הפעיל שבהם,           ║ glass │
│   ║  ⟨כהן נ׳ לוי⟩, ממתין לתגובתך מיום שני.          ║      │
│   ║  ⟨פתח את התיק⟩   ⟨הצג כרשימה⟩            ✦     ║      │
│   ╚════════════════════════════════════════════════╝      │
│                    ‸ כהן|                                   │
└────────────────────────────────────────────────────────────┘
```

**A decision paper becomes the Stage (in place, morning recedes):**

```
┌────────────────────────────────────────────────────────────┐
│ ░░░░░░░░░ (morning, soft-blurred, still there) ░░░░░░░░░░  │
│   ┌────────────────────────────────────────────────┐      │
│   │  טיוטת תגובה · כהן נ׳ לוי                       │      │
│   │  ─────────────────────────────                 │      │
│   │  לכבוד בית משפט השלום…                          │      │
│   │  (the full draft, editable, citations in gold) │      │
│   │                                                │      │
│   │        ⟨חתום והגש⟩   ⟨ערוך⟩   ⟨דחה⟩        ✦   │      │
│   └────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────┘
```

**The constellation (on intent only):**

```
┌────────────────────────────────────────────────────────────┐
│      מסמכים     יומן     לקוחות     תיקים     היום          │
│                                      ────                  │
│                 (serif words on paper; gone on dismiss)    │
```

**Mobile (390): the letter is the app:**

```
┌──────────────┐
│  בוקר טוב,   │
│     טל.      │
│              │
│ המכתב…       │
│ ✦            │
│ ────────────  │
│ ההחלטות (2)  │
│ ┌──────────┐ │
│ │ טיוטה…   │ │
│ └──────────┘ │
│ ═〔11:30〕═══ │
│ הנהר…        │
│              │
│ ‸ כתוב/בקש…  │
└──────────────┘
```

---

## What this vision costs (honesty for the founder)

1. **The letter requires real narrative AI** from day one — the surface *is* generated
   prose (guard-railed, cited, template-scaffolded). The moat and the risk are the same fact.
2. **Chrome-that-recedes and type-anywhere** demand exceptional accessibility discipline
   (focus management, discoverability affordances for non-keyboard users).
3. **The Now Line** needs a live clock model of the day — cheap technically, but it makes
   "static screenshots" of the product meaningless: LawME will demo like a place, not a page.
4. Some of v1 survives untouched underneath: the tokens, the materials, the motion laws,
   the RTL discipline. This is a re-staging, not a re-branding.

**Decision requested:** approve המכתב והנהר as the UX north star → next step is a static
"morning-as-theater" prototype of movements א–ג with scripted (non-AI) letter content,
before any feature work resumes.

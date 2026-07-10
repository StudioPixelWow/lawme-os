# 08 · Navigation Philosophy

Navigation is a sentence, not a tree. LawME has **three navigation surfaces, total**:

## 1. The top rail — words, not icons

A slim (56px), glass, constant bar:

```
[LawME wordmark] · היום · תיקים · לקוחות · יומן · מסמכים · ידע     [⌕ חיפוש ⌘K] [●用户]
```

- **Five-ish calm Hebrew words.** No icon sidebar, no collapsible tree, no 14-item menu.
  If a sixth top-level word is proposed, something else must leave.
- The active word carries a small gold underline hairline — the only persistent gold in chrome.
- The rail never grows sub-menus on hover. Depth lives inside pages.

## 2. The command bar (⌘K) — the fast path

A glass overlay with three groups: **ניווט** (jump to any matter/client/document),
**יצירה** ("תיק חדש", "רישום זמן"), **שאל את עמית** (free-text becomes an AI question).
Hebrew-first search with forgiving matching (initials, partial case numbers). Every power
action is reachable here; the UI never depends on it (discoverability first, speed second).

## 3. In-page chapter nav — the story's spine

Long pages (a matter, the day) carry a slim sticky chapter nav: small caption-size words,
active chapter marked in gold, smooth-scroll anchors. This replaces tabs entirely.

## Laws

- **No breadcrumbs.** Hierarchy is shallow (rail word → entity). The entity header states
  context better than a breadcrumb trail.
- **No tabs for content structure.** Tabs fragment a dossier; chapters + scroll keep it whole.
  (Segmented controls may still switch *representations* of one thing — e.g. week/month.)
- **Back always works.** Deep links, searchParams for filters and panels — the URL is the
  state; the browser's back button is a first-class navigation tool.
- **The AI panel is not navigation.** עמית opens as a companion edge (start side), never
  takes you elsewhere; it brings answers *into* your context.
- Keyboard: ⌘K everywhere; rail words reachable by ⌘1–⌘5; Esc always closes the topmost layer.

# Morning Workspace V8 — Office Intelligence · Review Package

**Sprint:** from a personal lawyer dashboard to the live operational map
of the entire firm — plus the global rename עמית → דינו.
**Preserved:** navy sidebar, utility rail structure, logo, routing,
typed-mock-only rule, semantic status system, a11y + responsive
foundations.

---

## 1. The rename — עמית → דינו

Project-wide: every UI label, mock-data string, accessibility label,
comment and review document now says דינו (`askAmit` → `askDino` was the
only latin identifier). Zero occurrences of עמית / Amit / amit remain in
the repository. Product language follows the spec: "דינו זיהה…",
"דינו הכין…", "דינו מצא…", "שאל את דינו".

## 2. The new hierarchy (Partner / Office-Manager mode)

Today Focus → **Office Attention Strip** → Active Matters → **Team &
Workload** → **לקוחות שממתינים** → **חדש בתיקים** → שולחן העבודה
במסמכים → **לקוחות חדשים** → העסק → **דינו · מודיעין המשרד**.
Section order is data-driven (`ROLE_SECTIONS[ACTIVE_ROLE]` in
`office.ts`) with typed configurations for partner / lawyer / intern —
the architecture for role personalization without user settings.

## 3. What the office gained

- **Office Attention Strip** — one horizontal intelligence line (not six
  KPI cards): 2 מועדים בסיכון (critical, champagne highlight), 7 תיקים,
  3 לקוחות ממתינים, 6 מסמכים, 18.5 שעות, 4 הודעות WhatsApp. Every item
  is a button: the critical one expands the legal-risk ledger in place,
  the rest focus their section.
- **Legal-risk ledger** — הגשה לא מוכנה (לוי, נותרו 5:18) and החלטה
  דורשת תגובה (כהן, 14 ימים): type, matter, deadline, owner, why, one
  action. Procedural language, not a generic alert list.
- **Team & Workload** — the capacity bench: four members, machined
  capacity gauge with the 80% overload tick, presence ring, critical
  deadlines and overdue counts; selecting a member surfaces their line,
  blocker and דינו's reassignment suggestion.
- **לקוחות שממתינים** — an action inbox: channel-true icons (WhatsApp /
  email / phone in our line grammar, muted washes), waiting time,
  message summary, and דינו's full prepared reply revealed on selection
  with אשר ושלח.
- **חדש בתיקים** — the procedural docket: a spine with seals, official
  source lines (נט המשפט · בימ״ש השלום ת״א), the new decision expanded
  by default with דינו's analysis, deadline impact, tasks created and
  client-update status.
- **לקוחות חדשים** — a compact pipeline: 4 לידים · 2 לא נענו · 3 פגישות
  היום; the hot ₪80,000 lead carries the gold edge and "חזור עכשיו".
- **Rail communication intelligence** — the utility rail gained a
  compact "תקשורת ממתינה" block (WhatsApp 4 · אימייל 2 · שיחות 1) plus
  דינו's waiting drafts line.

## 4. Active Matters, expanded

The featured matter now also shows today's workload, unbilled time and
the full stage vocabulary (קליטה → כתבי טענות → הכנה לדיון → דיון →
הכרעה, per practice area). Supporting matters gained one דינו insight
each. The board remains featured / supporting / queue — no identical
cards.

## 5. Finance & דינו

Finance leads with the executive sentence ("החודש חויבו ₪184,500, נגבו
₪152,300 ו־₪48,200 עדיין פתוחים."), one דינו insight (18.5 שעות טרם
חויבו → בדוק ורשום), and expands into the chart + forecast + exception
flags (חוב בפיגור, תיק מתחת ליעד רווחיות).
**דינו · מודיעין המשרד** replaces the old drawer: five cross-office
findings (תקדים רוחבי, עומס צוות, לקוחות ממתינים, הכנסה, סיכון לקוח) —
each with finding, why, related objects, evidence drawer and action.

## 6. Conditional display

`OFFICE_SCENARIO` (typed) drives today's expansions: risks active →
ledger reachable from the critical item; clients waiting → comm section
expanded with the first reply open; court update urgent → the decision
expanded; team overloaded → team above documents (partner order);
finance exception → flags visible. A quiet day collapses these to
one-line confirmations by data alone.

## 7. Validation

- lint / typecheck / build — clean, all routes static
- Horizontal overflow 0px at 1440 / 1280 / 1024 / 390
- עמית: 0 occurrences repo-wide · side zones structurally intact
- 18 screenshots incl. every module + interaction states

## Still requires founder review

1. The attention strip's two-row wrap point at laptop widths.
2. Whether the risk ledger should auto-open on a risk day.
3. The rail's communication block placement (above vs. below reminders).
4. Team gauge thresholds (80% tick) and the reassignment flow depth.
5. Leads: whether consultations today deserve their own object.

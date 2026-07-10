# V8 Changelog

## Global rename
- עמית → דינו across every file (UI strings, mock data, comments,
  accessibility labels, docs, review files); `askAmit` → `askDino`.

## Added
- `src/modules/today/office.ts` — all office-intelligence typed mock
  models: OfficeAttentionItem, DeadlineRisk, TeamCapacity,
  ClientCommunication + CommChannel + COMM_SUMMARY, CourtUpdate,
  LeadOpportunity, FinanceSnapshot extras, DinoOfficeInsight,
  OfficeRole + ROLE_SECTIONS + OFFICE_SCENARIO.
- `components/office-attention.tsx` — OfficeAttentionStrip + the
  expandable legal-risk ledger.
- `components/team-workload.tsx` — TeamWorkload + CapacityGauge.
- `components/client-waiting.tsx` — ClientWaiting action inbox.
- `components/court-updates.tsx` — CourtUpdates procedural docket.
- `components/lead-strip.tsx` — LeadStrip pipeline.
- `components/dino-office.tsx` — DinoOffice cross-office intelligence
  with per-insight evidence drawer (replaces intelligence-drawer).
- `icons/glyphs.tsx` — ChatGlyph (WhatsApp form), MailGlyph.

## Changed
- `components/today-workspace.tsx` — role-ordered section rendering,
  attention strip after Today Focus, tighter rhythm (mt-10/12).
- `components/matter-board.tsx` — featured matter: workload + unbilled
  time facts; supporting matters: one דינו insight each.
- `components/document-shelf.tsx` — renamed to שולחן העבודה במסמכים,
  action-first caption; document actions now פתח לבדיקה / השווה
  גרסאות / העבר לאישור (data.ts).
- `components/finance-strip.tsx` — executive sentence primary view,
  דינו 18.5h insight, exception flags in the expansion.
- `focus.ts` — full legal milestone vocabulary per matter.
- `shell/utility-rail.tsx` — compact "תקשורת ממתינה" channel block +
  דינו drafts line (only shell change; structure untouched).

## Removed
- `components/intelligence-drawer.tsx` (superseded by dino-office).

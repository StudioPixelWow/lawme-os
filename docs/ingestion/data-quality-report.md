# LAW ME — Live Pilot Data Quality Report (2026-08-06)

Structured sampling of the real records ingested to dev. Source of record:
`artifacts/live-pilot-results.json`. 34 canonical entities across 5 tracks; every
figure is from live data.

## Qualification findings that changed the plan

Live inspection corrected assumptions from the planning docs:

- **ararim / mishmoret are METADATA-ONLY**, not "full documents." The datastore
  CSVs carry case metadata (case number, court, judge, date, topic); the "PDF"
  resource is an *instructions* sheet, not decisions. Content-level → `metadata_only`.
- **mishmoret** additionally carries **PII** (detainee number, nationality) and a
  **document link on `rfa.justice.gov.il`** — a different domain whose license is
  **not** inherited from data.gov.il's cc-by.
- **judgments** carries a decision **summary** (`פירוט ההחלטה`) + parties +
  district + outcome + costs → content-level `summary` (never full_text).
- **Knesset** real field names differ from the initial mapper (`Id` not `LawID`,
  `LawValidityDesc`, `SubTypeDesc`, `StatusID`) — mapper corrected and re-tested.

## Sampling checks (per source)

**Knesset (laws + bills).** Titles, knesset number, publication date, status,
external ids all present and correct (e.g. `חוק גיל פרישה, התשס"ד-2004`; Bill
`הצעת חוק הגנת הפרטיות…`). Hebrew encoding intact (NFC). External ids
(`knesset_law_id` / `knesset_bill_id`) resolve. No fabricated values (a bill with
StatusID-only stores the code, not a made-up label).

**ararim / mishmoret (case metadata).** Case numbers normalized; court names
resolved to Authorities; topics linked; dates parsed (dd/mm/yyyy and
yyyy-mm-dd both handled). Shared court names deduped to one Authority. mishmoret
has no case number → Case identity falls back to the record id (documented), and
the detainee number is **not** used as an identifier.

**judgments (summaries).** Case numbers (`עת'מ 18102-08-20`), petitioners /
respondents (Party), district, decision date, summary, costs, outcome all
captured. `content_level = summary` — never marked full_text. One row carrying a
publication-restriction notice (`צו איסור פרסום`, minor) was **quarantined**, not
published.

## Quality metrics (dev)

| Metric | Result |
|---|---|
| Provenance coverage | **100%** (34/34) |
| Content-level accuracy | 100% (32 metadata_only, 2 summary, 0 full_text) |
| Duplicates detected & handled | 19 in-run (shared courts/topics/cases) → deduped |
| Quarantine | 1 (publication_restricted), correctly blocked |
| Idempotency | PASS (re-run: 0 new) |
| Version chain | PASS (v2 supersedes v1; is_current moves) |
| Structured / FTS / graph search | PASS |
| Failures / corruption | none |

## Failures / issues logged

- **PII (mishmoret)** — detainee numbers + nationality present in the source.
  Fix: minimize (exclude) before any wider load. → GO_WITH_FIXES.
- **Cross-domain document license (mishmoret)** — decision docs live on
  `rfa.justice.gov.il`; do not fetch/store without a separate license check.
- **cc-by attribution (ararim, mishmoret)** — must be recorded and displayed
  before exposing to users.
- **StatusID without label (Knesset bills)** — needs a `KNS_Status` lookup to
  render human status; code stored meanwhile (no fabrication).

## AI readiness

Knesset legislation metadata and judgments summaries are `RAG_READY_WITH_LIMITATIONS`
(retrieval of laws/outcomes, not full reasoning). ararim/mishmoret are
`NOT_RAG_READY` (metadata only; no decision text). Full-text law ingestion
(KNS_DocumentIsraelLaw) is the next step to raise legislation to RAG-ready.

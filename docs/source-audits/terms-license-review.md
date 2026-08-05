# Terms & License Review — 2026-08-05

Child review run `b1e5c0de-0000-4000-8000-000000000001` (parent audit run
`75f28657`). Retrieved via authorized real-browser session (no bypass). Every
verdict below is backed by an evidence row in `legalai.source_audit_evidence`
with a SHA-256 content hash of the captured clause text.

## Summary

| Source | Terms URL | Automated access | Commercial use | Full-text storage | Redistribution | Attribution | Prev → New | Required action |
|---|---|---|---|---|---|---|---|---|
| **data.gov.il:judgments** (dataset) | CKAN `package_show?id=judgments` | allowed | allowed | allowed | allowed | not required | REVIEW → **OPEN** | build via CKAN API |
| data.gov.il (domain) | CKAN `license_list` | allowed (API) | per-dataset | per-dataset | per-dataset | per-dataset | REVIEW → **REVIEW** | classify each legal dataset |
| judgments.org.il | `/תנאי-שימוש-באתר/` | prohibited w/o permission | **prohibited** w/o prior written | needs permission | **prohibited** w/o written | — | REVIEW → **ASK** | obtain written permission (ToS 4.2/6.2) |
| הרשות השופטת (court.gov.il) | gov.il ToS | **restricted** (interface-only) | allowed (§6 content) | allowed (§6) | allowed (§6 content) | cite source | REVIEW → **ASK** | official data feed — do not scrape |
| בית המשפט העליון | gov.il ToS | **restricted** + anti-bot | allowed (§6) | allowed (§6) | allowed (§6) | cite source | REVIEW → **ASK** | official data feed — do not scrape |
| unicourt.justice.gov.il | gov.il ToS | **restricted** (interface-only) | allowed (§6) | allowed (§6) | allowed (§6) | cite source | REVIEW → **ASK** | official data feed — do not scrape |
| רשות ניירות ערך (isa.gov.il) | not fetched | unknown | unknown | unknown | unknown | unknown | REVIEW → **REVIEW** | fetch isa.gov.il ToS |

## Evidence & reasoning

**data.gov.il — per-dataset licensing (NOT domain-wide).** CKAN `license_list`
exposes both open (odc-pddl, odc-odbl, odc-by, cc-zero, cc-by, uk-ogl) and
non-open (cc-nc, other-closed, notspecified) licenses. Of 12 legal datasets
found: 6 `other-open`, 1 `cc-by`, 5 unlicensed. The domain therefore stays
REVIEW; reuse is decided per dataset.

**data.gov.il:judgments → OPEN.** Dataset "היחידה לחופש המידע – מאגר פסקי דין"
(משרד המשפטים), `license_id=other-open` (od_conformance = **approved** per the
Open Definition → reuse, commercial use, and redistribution permitted). Resources:
CSV + PDF. Scope: 2021 freedom-of-information judgments (case number, parties,
district, summary, costs) — a bounded dataset, not the full corpus. Access is via
the CKAN API through the provided interface (no ToS conflict).

**judgments.org.il → ASK.** ToS **4.2**: "השימוש באתר מורשה לצרכים פרטיים בלבד
וחל איסור לעשות שימוש… לצרכים מסחריים שלא אושרו מראש ובכתב." ToS **6.2**: no
copying/redistribution/derivative works "בלי הסכמה בכתב ומראש." → personal-use-only;
commercial use and redistribution require **prior written permission** from the
owner. A permission path exists, so ASK (not BLOCKED). Note ToS 8.1 states the
judgments are auto-collected from official state sites — the underlying judgments
are §6 public-domain, so the lawful alternative is the official source.

**Government judicial sources (court.gov.il, supremedecisions, unicourt) → ASK.**
gov.il ToS: "אין לנסות לגשת… בכל דרך אחרת מלבד דרך הממשק" (access only via the
provided interface → automated scraping restricted), and government-publication
copyright belongs to the State **subject to copyright law**. §6 of the Copyright
Act 2007 removes copyright from judicial decisions → the **content** is
public-domain and reusable (incl. commercially, with source attribution as fair
use). But automated **collection by scraping** is restricted by ToS and blocked by
anti-bot (supremedecisions SearchVerdicts, prior evidence). Lawful path: an
**official data feed** from the courts administration — not scraping. Hence ASK.

**isa.gov.il → REVIEW.** Separate domain; its own ToS was not individually
fetched this run. Left REVIEW pending a dedicated terms fetch.

## Open legal datasets on data.gov.il

| dataset | title | org | license | formats | verdict |
|---|---|---|---|---|---|
| judgments | היחידה לחופש המידע – מאגר פסקי דין | משרד המשפטים | other-open | CSV, PDF | **OPEN** |
| magistrate-court-list | בתי משפט השלום בחלוקה למחוזות | הרשות השופטת | other-open | XLSX | OPEN (reference) |
| court-lost | מאגר בתי משפט ובתי דין לעבודה | הרשות השופטת | other-open | XLSX | OPEN (reference) |
| 862 | פסק דין לגירושין לפי שנים | בתי הדין הרבניים | (none) | CSV | REVIEW |
| 860/861/864/865 | תעריפים / רשימות / ספירות | בתי הדין הרבניים | (none) | CSV | REVIEW |

Reference datasets (court lists) are open but are metadata, not judgment corpus.

## Attribution / storage / redistribution obligations

- **data.gov.il:judgments** (other-open): no attribution obligation asserted;
  full-text storage and redistribution permitted.
- **Government judicial content** (§6): may store and redistribute; cite the
  official source (fair-use practice). Honor per-document publication bans
  (איסור פרסום) and privacy — already enforced by the ingestion quality gates.
- **judgments.org.il**: no storage/redistribution without written permission.

# Knesset Full-Law Source — Live Qualification (2026-08-06)

Answering: where does the full law text come from, in what format, under what
terms — verified over the operator network against the real Knesset systems.

## The official source

**מאגר החקיקה הלאומי** (Knesset National Legislation Database), an Angular SPA at
`main.knesset.gov.il/apps/legislation/main/laws/{IsraelLawID}`, backed by a
public content API:

```
GET https://www.knesset.gov.il/WebSiteApi/knessetapi/LegislationItem/GetLegislationLawItem?ItemId={IsraelLawID}
```

No auth, no token. `ItemId` is the **OData IsraelLawID** (see
`knesset-lawid-resolution.md`). The law page makes exactly ONE content call —
this API — so it is the authoritative data route.

## What the API returns (verified on 2 laws)

- `general`: `hebSubject`, `lawValidity` (תקף/נושן/בטל), `publicationDate`,
  `latestPublicationDate`, `openBookUrl`, `kolZchutUrl`, committee/ministry.
- `corrections.listCorrections[]`: the **amendment/publication history** — per
  entry `itemId`, `name`, `correctionType` (ישיר/עקיף), `correctionNumber`,
  `publicationDate`, `publicationSeries` (ספר החוקים), `pageNumber`, and a
  **`filePath` → a PDF on `fs.knesset.gov.il`** (`…/<knesset>/law/<n>_lsr_<id>.PDF`),
  plus `summaryLaw` (plain-language summary per amendment for recent ones).
- `secondaryLawInstalled[]`: regulations (תקנות) under the law.

**The full text is NOT inline.** It lives in the linked ספר-החוקים **PDFs**
(original enactment + each amendment). Example (חוק התקשורת, in force):
`latestPublicationDate 2026-07-28`, **83 amendments**, each a ספר-החוקים PDF.

## Consolidated current text (נוסח משולב) — the key gap

The API/site give METADATA + the amendment-PUBLICATION document set — **not** a
comprehensive consolidated current text. Consolidated text exists only via
**ספר החוקים הפתוח / OpenLawBook** (`openBookUrl`), which covers a **subset** of
laws and is **often empty** (empty for the obsolete sample; the current-law
`<general>` block sits beyond the API response we could capture — its coverage
must be qualified next). **A comprehensive official free consolidated נוסח משולב
does not exist for all Israeli laws** — a well-known reality; consolidation is
partial (Knesset OpenLawBook) or commercial (Nevo).

## Format summary

| Layer | Format | Route |
|---|---|---|
| Law metadata + amendment index | XML/JSON API | `GetLegislationLawItem?ItemId=<IsraelLawID>` |
| Publication documents (original + amendments) | PDF | `fs.knesset.gov.il/.../*_lsr_*.PDF` (ספר החוקים) |
| Consolidated current text (partial) | HTML | OpenLawBook (`openBookUrl`) |
| Rights guide (secondary) | HTML | Kol Zchut (`kolZchutUrl`) |

## Terms / robots / reuse

- `www.knesset.gov.il/robots.txt` → **404** (API host unrestricted).
- `main.knesset.gov.il/robots.txt` → `Disallow: /` for **named aggressive bots
  only** (Yandex, Semrush, MJ12, dotbot, PetalBot, BLEXBot, Barkrowler,
  laboraybot). No `User-agent: *` disallow → a polite, identified collector is
  **not** blocked.
- Content reuse: **§6 (no copyright in laws) → OPEN**. Technical access:
  **apparently_allowed** (public gov API, no auth, robots permits `*`). Record the
  Knesset ToS as `license_evidence` (url+hash). Gazette PDFs are public gov docs.

## Versioning / freshness

**Full publication history** — every amendment is dated (`correctionNumber`,
`publicationDate`, `itemId`, ספר-החוקים page); `lawValidity` gives repeal status.
Incremental sync: poll per law, new `correctionNumber` / `latestPublicationDate`
= update; checkpoint = IsraelLawID + max(correctionNumber); dedup = correction
`itemId` + PDF content hash. Point-in-time consolidated text: only where
OpenLawBook exists (else publication-history-only — do **not** claim
"נוסח נכון לתאריך").

## Verdict

See `knesset-legislation-access-decision.md`. Source route = **GO_WITH_FIXES**;
consolidated-current-text for RAG Beta = **PARTIAL / ASK**.

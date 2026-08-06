# OpenLawBook Coverage Report

Companion to `openlawbook-qualification.md`. Data: `artifacts/openlawbook-coverage.csv`,
`artifacts/openlawbook-qualification.json` (live 2026-08-06). OpenLawBook =
Hebrew Wikisource (`he.wikisource.org`).

## Coverage by validity

| Validity | Laws | With OpenLawBook | Coverage |
|---|---|---|---|
| תקף (in force) | 16 | 16 | 100% |
| בטל (repealed) | 9 | 1 | 11% |
| נושן (obsolete) | 5 | 0 | 0% |
| פקע (expired) | 3 | 0 | 0% |
| **Total** | **33** | **17** | **51.5%** |

The single repealed law with an OB page is Basic Law: Freedom of Occupation
[1992] (2000043), preserved on the wiki for historical reasons. **Practical
reading:** OpenLawBook is a consolidation of *currently in-force* Israeli
legislation; it is not a source for the repealed/obsolete tail.

## Freshness (17 OB pages vs newest official amendment)

Wiki last-revision date compared to the law's `latestPublicationDate` from the
Knesset API. **Caught up: 15 / 17 (88.2%).**

Lagging (wiki behind the newest official correction):

| Law | IsraelLawID | Newest official | Wiki last rev | Lag |
|---|---|---|---|---|
| חוק התקשורת (בזק ושידורים) | 2000002 | 2026-07-28 | 2026-03-18 | ~4 mo |
| חוק שמירת הניקיון | 2000017 | 2026-07-27 | 2026-03-02 | ~5 mo |

Both are heavily/recently amended laws (115 and 34 publications). The pattern:
community consolidation is usually current but can lag on the most active laws —
exactly where a wrong "current text" claim would be most harmful. This is the
core reason the OpenLawBook decision is **REVIEW** and RAG must never assert
"current consolidated text" from it without verification.

## Content presence

All 17 OB pages resolved (0 missing, 0 empty). Wiki page sizes range from ~1.6 KB
(short Basic Laws) to ~581 KB (חוק התקשורת) — full consolidated text is present,
not stubs.

## Identity resolution summary

`exact 0 · high-confidence-via-backlink 17 (1 title-ambiguous) · unmatched 0`.
The OB URL never contains the IsraelLawID; resolution relies on the authoritative
Knesset-API backlink. See `openlawbook-qualification.md` §Identity resolution.

## What OpenLawBook is / is not

- **Is:** a community-maintained, CC BY-SA 4.0, usually-current consolidated text
  of in-force Israeli laws, reachable via an official Knesset backlink.
- **Is not:** an official source, a complete corpus (only in-force laws), a
  guaranteed-current text (can lag months on active laws), or a
  LawID-addressable API.

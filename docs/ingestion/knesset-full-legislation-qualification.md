# Knesset Full-Legislation Qualification (live, 2026-08-06)

Live qualification of the Knesset OData legislation sets, run against the real
API over the operator network. **Headline finding: Knesset OData does NOT expose
full law text.** The Epic's assumed source, `KNS_DocumentIsraelLaw`, is empty.

## Evidence (verified this session)

| Entity set | `@odata.count` | Contents | Full text? |
|---|---:|---|---|
| `KNS_IsraelLaw` | large | Id, Name, KnessetNum, IsBasicLaw, PublicationDate, LawValidityDesc, LastUpdatedDate | No — metadata only |
| `KNS_IsraelLawName` | **2,180** | Id, IsraelLawID, LawID, LawTypeID, Name, LastUpdatedDate | No — names + id mapping only |
| **`KNS_DocumentIsraelLaw`** | **0** | *(empty)* | **No — the set is empty** |
| `KNS_DocumentBill` | present | bill documents (FilePath) — bills, not consolidated laws | Bill files only |
| `KNS_SecondaryLaw` / `KNS_DocumentSecondaryLaw` | present | regulations (secondary legislation) | out of this Epic's scope |

Queries used (public JSON, no auth, no bypass):
`.../KNS_DocumentIsraelLaw?$count=true&$top=2&$format=json` → `@odata.count: 0`;
`.../KNS_IsraelLawName?$count=true&$top=3` → `@odata.count: 2180`, rows carry
`Name` + `IsraelLawID` + `LawID` only. Service root enumerated to confirm the
available legislation sets (`KNS_IsraelLaw`, `KNS_IsraelLawName`,
`KNS_IsraelLawBinding`, `KNS_IsraelLawClassificiation`,
`KNS_IsraelLawLawCorrections`, `KNS_IsraelLawMinistry`, `KNS_LawBinding`,
`KNS_DocumentIsraelLaw` [empty], `KNS_SecondaryLaw`, `KNS_DocumentSecondaryLaw`).

## Consequence for this Epic

A full-text legislation **backfill via `KNS_DocumentIsraelLaw` is not possible** —
there is nothing to fetch. This is exactly the risk the "don't assume a field
holds full text without checking" rule guards against, and the check paid off:
we did **not** build a fetch pipeline against an empty set or fabricate a corpus.

The `LawID` in `KNS_IsraelLawName` (e.g. 171095 for חוק התקשורת) is the key into
the Knesset **national legislation web database** (`main.knesset.gov.il` →
Activity/Legislation/Laws), where the *consolidated full text* ("נוסח מלא") is
published as HTML/PDF. That is a **separate system, not OData**, and reaching it
lawfully requires its own collector + access/robots/terms review + a document
fetch+parse pipeline. That is the correct next Epic — not part of the (empty)
OData route.

## What this Epic therefore delivers instead

Everything that does **not** depend on the unavailable full text, built and
tested now so ingestion is ready the moment a lawful full-text route is
confirmed:

- A Hebrew **legislation section parser** (law title/number/year, chapters
  `פרק`, sub-chapters `סימן`, sections `סעיף`, sub-sections, definitions,
  transitional provisions, references) → `Section` entities + legal `chunks`.
- A **legal chunking** strategy (chunk-by-section, heading path preserved).
- A **citation contract** for RAG (law title, section number, version, source
  URL, span, verification status).
- An **FTS retrieval-evaluation** harness (30 legislation questions), runnable as
  an FTS baseline (embeddings deferred — no approved provider).
- A **demonstration** of the parser → Section → chunk → FTS → retrieval pipeline
  on real consolidated statutory text, ingested to dev on the real schema, to
  prove the machinery end-to-end.

## Reuse basis (legislation)

Israeli primary legislation carries **no §6 copyright** (Copyright Act 2007 §6 —
no copyright in laws). Reuse basis: `statutory_exemption`; commercial use &
redistribution allowed; attribution to the official source recommended
(source_link_required = true). **However**, a document fetched from a specific
web system inherits *that system's* terms for the delivery/formatting layer — so
the future legislation-web collector must record `license_evidence_url` +
`license_evidence_hash` for `main.knesset.gov.il` and treat any externally-hosted
document without a clear basis as `metadata_only` or `quarantined`.

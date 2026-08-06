# Legislation Authority Policy (RAG serving)

Binding policy for how the legislation corpus may be used in retrieval and
answers. It enforces the central distinction of this workstream: **an official
publication of a law and its amendments is NOT a consolidated current text.**

## Source tiers

| Tier | Source | authority_level | consolidation_status | May serve as… |
|---|---|---|---|---|
| Official publications | Knesset API + ספר-החוקים PDFs | `primary_official` | `non_consolidated_publication` | original text, a specific amendment, a legislative timeline |
| Community consolidation | OpenLawBook = Hebrew Wikisource | `community_reference` | `community_consolidated` | a *non-authoritative* current-text aid, with attribution, after human review |
| Reconstructed candidate | internal, test-only | non-authoritative | `reconstructed_candidate` | never served |

There is **no free official consolidated source**. Do not build or answer as if
one exists.

## What RAG MAY do with official publications

- Locate the original enactment text of a law.
- Locate a specific amendment / correction publication.
- Cite an amendment (law title, publication type, correction number,
  publication date, ספר-החוקים number, page, official PDF URL, document version,
  source span, last verified).
- Build a legislative timeline; explain what a given amendment published.

## What RAG MUST NOT do

- Claim any publication (or the set of publications) is **the current
  consolidated text**, unless `consolidation_status = verified_consolidated_current`
  — a status that this workstream does **not** produce.
- Present OpenLawBook / Wikisource text as official or as guaranteed-current.
- Assemble a consolidated נוסח משולב by merging amendment texts on the fly.

## Mandatory disclosure

When a query asks for the current/consolidated text of a law and only
publications (and/or a community consolidation) are available, the answer MUST
include, verbatim:

> המקורות הזמינים כוללים את הפרסום המקורי ואת פרסומי התיקונים, אך לא נוסח משולב רשמי מלא.

If a community-consolidated (OpenLawBook/Wikisource) text is used as an aid, the
answer must additionally attribute it (CC BY-SA 4.0, ויקיטקסט) and state it is
community-maintained and may lag the newest official amendment.

## Serving gate (enforced)

- Only chunks passing the citation contract gate
  (`legislation/citation-contract.ts`) may back an answer: published +
  license-allowed + provenance-complete + not quarantined + current version +
  complete citation.
- `legalai.law_publications`, `law_publication_edges`, and
  `amendment_operations` are RLS deny-by-default (service-role only); nothing is
  `published` (verified on dev after the live PDF run: 0 published publications,
  0 published chunks, 0 published sections). Real sections extracted from
  official PDFs (`source_platform='knesset_legislation_pdf'`) are stored
  `version_status='validated'` with `published=false` and license
  `statutory_exemption_sec6` — indexed and FTS-searchable via the service role,
  but not served until they pass the citation gate + review. The demonstration/
  demo legislation remains gated (`non_authoritative_demo`, `published=false`)
  and is never searchable or RAG-served.
- Amendment operations are stored as assertions with `status` in
  (`parsed`/`needs_review`/`unsupported`) and a confidence; `needs_review` /
  `unsupported` operations never drive an authoritative modification claim.
- A DB CHECK (`law_publications_no_publish_as_consolidated_chk`) blocks
  publishing a publication row as an authoritative consolidated text.

## OpenLawBook usage rule

Per the OpenLawBook license verdict **OPEN_WITH_ATTRIBUTION** and decision
**REVIEW**: metadata + link may be stored freely; full-text persistence only
under CC BY-SA (attribution + ShareAlike), labelled `community_consolidated`,
never shown as the official current text, and requiring human verification
before any authoritative use.

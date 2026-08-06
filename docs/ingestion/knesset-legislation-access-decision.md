# Knesset Legislation Access — Decision

## Verdict

- **Source route (official API + ספר-החוקים PDFs): GO_WITH_FIXES.**
- **Consolidated current text (נוסח משולב) for RAG Beta: PARTIAL / ASK.**

## Why GO_WITH_FIXES for the route

Content is §6-open; the public API (`GetLegislationLawItem`) needs no auth;
robots permits a polite identified agent; **LawID resolution is exact**
(ItemId == IsraelLawID); the amendment-publication PDFs (ספר החוקים) are official
primary documents; structure is parseable (the section parser is built + tested).

Required fixes before a collector runs:

1. **PDF fetch + text extraction** for `fs.knesset.gov.il` documents (text-layer
   extraction; OCR only where no text layer, per §5 rules).
2. **Qualify OpenLawBook** (`openBookUrl`) coverage — how many laws have a
   consolidated נוסח משולב, and its endpoint/format.
3. **Record ToS** as `license_evidence` (url+hash); implement attribution /
   source-link.
4. **Policy for laws without consolidated text**: ingest amendment documents at
   *document level*, clearly labelled — never presented as a current consolidated
   text or "נוסח נכון לתאריך".

## Why the consolidated-text goal is PARTIAL / ASK

The Knesset provides law metadata + amendment-publication PDFs, and a *partial*
consolidated set via OpenLawBook. **A comprehensive official free consolidated
current text does not exist for all Israeli laws.** Therefore RAG Beta on
*consolidated current text* is achievable only for the OpenLawBook subset; for
the rest, the corpus is document-level (original + amendments), which is NOT a
substitute for a consolidated נוסח משולב. We will not build the corpus as if full
consolidated text exists.

## Recommended access architecture

`official_api` (metadata + amendment index, keyed by IsraelLawID from OData) +
`direct_pdf` (ספר-החוקים PDFs) + PDF extraction + the existing section parser;
`OpenLawBook` for consolidated text where present. Stability: high (gov API).
Volume: ~thousands of laws × N amendments. Incremental: per-law poll on
`correctionNumber`. Checkpoint: IsraelLawID + max(correctionNumber). Dedup:
correction itemId + PDF hash. Risks: PDF quality/OCR; partial consolidation;
ToS confirmation.

## Exact next task

Qualify **OpenLawBook (ספר החוקים הפתוח)** consolidated-text coverage + endpoint,
then build the `fs.knesset.gov.il` **PDF fetch + text-extraction collector** that
feeds the existing section parser → Section → chunk → FTS → citation pipeline.

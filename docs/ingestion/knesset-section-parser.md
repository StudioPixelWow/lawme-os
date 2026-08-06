# Hebrew Legislation Section Parser

`src/modules/legal-ai-israel/ingestion/legislation/section-parser.ts` +
`section-chunker.ts`. Pure/offline; 10 unit tests
(`__tests__/section-parser.test.ts`).

## What it produces

`parseLegislation(normalizedText)` → `ParsedLaw` with an ordered list of
`ParsedSection`. Each section carries: `sectionNumber` (incl. inserted numbers
like `1א`), `sectionLabel` (`סעיף N`), inline `heading`, `bodyText`,
`headingPath` (enclosing פרק/סימן/תוספת), `ordinal`, `subsections` ((א)(ב)/(1)(2)),
`references` (cross-refs to other sections/laws), `sectionType`
(definitions/transitional/commencement/amendment/general), `sourceSpan`
(char offsets), and `contentHash`.

## Signals used (not a single regex)

Section start `^\d+[א-ת]{0,2}\.` , chapter `פרק`, subchapter `סימן`, schedule
`תוספת`, subsection markers `(א)`/`(1)`, title line `חוק … , התש..-YYYY`. It
combines numbering + headings + structural keywords + document order, and is
conservative at ambiguous boundaries (keeps text together rather than splitting
mid-provision). It never removes section numbers and never blind-cuts by
character count.

## Chunking (`chunkLaw`)

Chunk-by-section; a section longer than `maxChars` is split along its
subsections (never mid-subsection); short sections stay whole. Every chunk
prefixes the law title + hierarchical heading path and the section number, and
records `sourceSpan`, `tokenCount`, `contentHash`, `language`.

## Status vs real corpus

The parser is proven on Israeli statutory STRUCTURE. It is not yet fed an
authoritative corpus because Knesset OData exposes no full law text (see
`knesset-full-legislation-qualification.md`); it is ready for the
legislation-web collector's output.

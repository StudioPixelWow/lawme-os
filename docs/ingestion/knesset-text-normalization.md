# Knesset Text Normalization (pre-parse)

`publication/pdf-normalize.ts` — turns RAW pdf.js text-layer output into stable
structured legal text before the section parser, amendment parser, chunker and
FTS indexer run. **Deterministic, no LLM.** Version `legal-normalize-1`.

## Three separate layers (raw is never mutated)

```
raw_extracted_text      immutable — exactly what pdf.js produced (raw_text_hash)
normalized_legal_text   the output of this module (normalized_text_hash)
structured_parse_output sections / operations produced downstream
```

A normalization version bump does **not** overwrite a prior version, and reparse
runs from `raw_extracted_text` — no PDF re-download needed.

## Rules (built against real pilot failures)

| Rule | Fixes (real example) | Confidence |
|---|---|---|
| `collapse_spaces` | pdf.js multi-space runs | — |
| `remove_running_head` | repeated `רשומות` / `ספר החוקים` / page number / recurring date | 0.9 |
| `fix_reversed_parens` | RTL-flipped `)ה(` → `(ה)`, `9א)א(` → `9א(א)` | 0.9 |
| `fix_glued_year` | `תשי"ט1959` → `תשי"ט-1959` | 0.85 |
| `fix_missing_hyphen` | `בחוקיסוד` → `בחוק-יסוד` | 0.95 |
| `glyph_remap` | lone mis-mapped `פ` glyph → `;` (flagged) | 0.5 |
| `line_rejoin` | mid-sentence line breaks joined; **never** across a structural marker | 0.8 |

## Guardrails

- **Never joins across a structural marker:** a section number (`13.`),
  subsection (`(א)`), list item (`(1)`), chapter/part/schedule heading
  (`פרק`/`סימן`/`תוספת`), or an amendment side-heading (`תיקון`/`הוספת`/`ביטול`).
- **Never removes real content:** running-head removal requires the line to
  match a boilerplate pattern AND (repeat across pages OR be an exact gazette
  masthead); a law name, chapter title, amendment heading, commencement clause,
  or a once-only short section is never removed.
- **Glyph remap is context-bounded:** only a whitespace-bounded lone `פ` is
  touched (a `פ` inside a word is never changed), at 0.5 confidence with a
  warning → downstream `needs_review`, never a silent global replace.
- Every transformation is recorded in an optional `trace`
  (`{rule, before, after, confidence}`); risky ones lower `confidence` and add a
  `warning`.

## Measured on the real pilot samples

Section-numbering accuracy on חוק-יסוד: מקרקעי ישראל (pub 147462): **3/3 = 100%**.
Header/footer contamination after normalization on the reprocess samples: **0**.
Concrete wins on messy real text: the reversed-paren fix is what lets
`delete_section (ה)` (pub 147018) and `replace_words §7(4)` (pub 173930) parse at
all — without it both fail. Tests: `__tests__/normalize-and-parse.test.ts`.

Known residual: some malformed mixed parens (`( 1 (`, `)א)`) are not fully
canonicalized; the affected operation is flagged `ambiguous` rather than
mis-parsed (pub 2140800) — no high-confidence false mutation results.

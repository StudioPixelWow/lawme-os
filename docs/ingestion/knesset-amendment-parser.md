# Knesset Amendment-Operation Parser

`publication/amendment-operations.ts` — turns the formulaic text of an Israeli
amending law into structured mutation **assertions**. It is rule-based; **there
is no LLM in the loop and it computes no semantic diff**. Its output feeds
`--modifies--> Section` edges only where a target section is resolved with
literal textual evidence.

## Input

The **extracted, normalized text** of an amendment publication PDF (from
`pdf-extract.ts`). Amendment laws are written in a highly regular register
("בסעיף 4, במקום … יבוא …", "אחרי סעיף 7 יבוא", "סעיף 9 — בטל"), which the
parser matches with ordered rules.

## Operations detected

```
modified_section     "בסעיף N …" / "תיקון סעיף"
replaced_section     "במקום סעיף N יבוא …" / "… יבוא במקומו"
added_section        "אחרי סעיף N יבוא …" / "הוספת סעיף" / "יתווסף"
deleted_section      "סעיף N — בטל" / "יימחק" / "ביטול סעיף"
term_change          "בהגדרת …" / "במקום ההגדרה …"
commencement         "תחילתו של חוק …" / "יום התחילה"
transitional         "הוראת/הוראות מעבר" / "הוראת שעה"
```

## Assertion shape

Each clause yields at most one operation; a clause matching no rule but shaped
like an amendment is emitted as `unsupported` (nothing is silently dropped).

```
opType, targetSection, status, confidence (0..1), evidence (literal clause), sourceSpan
```

Status:

```
parsed        supported operation with a resolved target section
needs_review  operation recognized but target/content ambiguous (confidence capped)
unsupported   amendment-shaped text no rule could classify
```

The persisted mutation assertion (per Epic step 8) carries: target law, target
section label, operation, replacement text, effective date if explicit,
confidence, source span, publication ID.

## Guardrails

- **No LLM-only section diff.** Confidence and status make uncertainty explicit;
  low-confidence / `needs_review` operations do not create authoritative Section
  modifications.
- **No fabricated consolidation.** The parser never assembles a merged נוסח
  משולב. A `reconstructed_candidate` may be produced **only in a test
  environment** and only when the full original text + every subsequent amendment
  are available and every operation parsed at high confidence with no unresolved
  commencement — and even then it is non-authoritative, unpublished, never a
  final RAG answer, and requires human verification.

## Pilot status

In the 2026-08-06 pilot, `amendment_operations_parsed = 0` and
`unsupported_operations = 0` **by design**: amendment operations are parsed from
the **PDF text**, and PDF download+extraction is the operator step (this
container has no network egress). The parser is fully implemented and unit-tested
(`__tests__/amendment-operations.test.ts`) against representative Hebrew
amendment clauses; it runs the moment extracted text is available.

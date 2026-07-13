# Matter Narrative — Hebrew Language Rules (Epic 4.2)

`src/modules/matter/narrative/formatters.ts`

## Principles

Hebrew-first, modern and professional, short sentences, RTL-safe, no outdated
legalese (unless quoting a source), no marketing language, no emotional
anthropomorphism, no excessive "AI" language, consistent LawME terminology.

## Deterministic formatters

- `daysHe(n)` — Hebrew day count with correct number agreement:
  1 → "יום", 2 → "יומיים", else "N ימים".
- `relativeDaysHe(daysRemaining)` — "היום" / "מחר" / "אתמול" /
  "בעוד N ימים" / "לפני N ימים" / "במועד שטרם נקבע" (null-safe).
- `elapsedDaysHe(days)` — elapsed duration.
- `overdueHe(days)` — "באיחור של N ימים".
- `countHe(n, singular, dual, plural)` — count with Hebrew singular/dual/plural.
- `dimensionStateHe(state)` — Hebrew label for each dimension state
  (strong→"חזק", at_risk→"בסיכון", unavailable→"לא זמין", …).
- `isoToHebDate(iso)` — `dd.mm.yyyy`, deterministic, no locale, null-safe.
- `joinHe(items)` — natural Hebrew list join ("א, ב ו-ג").

All formatters are pure and relative to the supplied `asOf` — no wall clock, so
output is reproducible.

## Prohibited language (enforced by tests)

The narrative must never contain: first-person/persona ("אני תיק כהן", "אני חושב",
"אני מרגיש"), outcome probability ("הסיכוי לזכות הוא…"), false certainty ("התיק
בטוח", "מובטח"), or "no risk" when an engine is unavailable. The narrative test
asserts a banned-phrase list is absent from every scenario briefing.

## Tone

Impersonal, factual, partner-grade. Recommendations are framed as "מומלץ…", system
statements as observations. Numbers and dates are formatted for readability; mixed
Hebrew/English (e.g. a field name or a case identifier) is passed through safely.

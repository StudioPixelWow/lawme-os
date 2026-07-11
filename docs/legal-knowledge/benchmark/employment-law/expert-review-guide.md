# Expert Review Guide — Employment-Law Gold Set

**Audience: the reviewing employment lawyer (עו"ד דיני עבודה).**
Your review is what turns draft questions into a real benchmark. Nothing
in `questions.draft.json` is authoritative until you complete this
process per question.

## What you provide, per question

| Field | What we need |
|---|---|
| Correct legal sources | The statute sections, regulations, extension orders and judgments (public citations) that actually answer the question — pinned to `law_as_of` |
| Mandatory authorities | The sources WITHOUT which any answer is failing |
| Acceptable alternative authorities | Other authorities that legitimately support the same answer |
| Expected answer elements | The propositions a complete, correct answer must contain (bullet list) |
| Common traps | Known wrong answers: outdated amounts, repealed provisions, confused doctrines, wrong forum |
| Current-law date | Confirm or correct `law_as_of` — amounts and thresholds in employment law change yearly |
| Difficulty | Confirm basic/practitioner/expert from a practitioner's standpoint |
| Review notes | Anything the evaluation team must know |

## Process
1. Work in a copy of `questions.draft.json`; change nothing in git
   directly — hand the file back for a reviewed commit.
2. For each question set `"status": "expert_validated"` and
   `"expert_validated": true` ONLY when every gold field is complete.
3. Cite public sources only (National Legislation DB links, published
   judgments by case number). No commercial-database content (headnotes,
   editorial summaries) may be pasted into gold fields.
4. If a question is legally ill-posed — rewrite it or mark
   `"status": "retired"` with a note. Better fewer, correct questions.
5. Flag any question whose answer materially changed in the last 3 years
   (these become "validity" test candidates too).
6. Time expectation: ~15-25 minutes per question, ~10-12 hours for the
   full set. Batch by category.

## Ground rules (from the trust model)
- Free-to-view ≠ authoritative: pin to the OFFICIAL source when it exists.
- Every amount/threshold carries its year.
- If the law is genuinely unsettled — say so in `review_notes`; unsettled
  questions become contradiction-detection material, not research gold.

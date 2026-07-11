# LILB — Employment-Law Gold Set (Epic 1)

**Status: DRAFT framework. Every question here is synthetic/public-material
based and NOT expert validated.** No question may be treated as a measure
of legal correctness until an employment lawyer completes the review
process below.

## Files
- `questions.template.json` — the schema every gold question must follow.
- `questions.draft.json` — 28 draft questions across 14 required
  categories (2 each), all marked `"status": "draft"`,
  `"expert_validated": false`.
- `source-ground-truth.template.json` — how gold sources are pinned.
- `evaluation-rubric.md` — scoring rubric per category.
- `expert-review-guide.md` — the employment-lawyer review process.

## POC scoring note (honesty)
Until the real corpus exists, `npm run legal:benchmark:run` scores ONLY
retrieval mechanics against the synthetic fixture corpus (does the engine
retrieve the fixture documents tagged with the question's topics, with
citations and warnings intact). This measures the MACHINERY, not legal
quality. Real gold sources are pinned by the reviewing lawyer against
public primary sources at review time.

## Category coverage (14, per founder spec)
severance pay · notice period · pension rights · section 14 · overtime ·
vacation · sick leave · maternity rights · equal opportunity · workplace
harassment · termination procedure · employee vs contractor · collective
arrangements · extension orders.

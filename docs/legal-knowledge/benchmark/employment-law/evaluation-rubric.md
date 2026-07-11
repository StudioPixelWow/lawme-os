# Employment-Law Gold Set — Evaluation Rubric

## Two scoring layers

### Layer 1 — Machinery (automatic, runs today via `npm run legal:benchmark:run`)
Scores the ENGINE's mechanics against the synthetic fixture corpus:

| Check | Pass condition |
|---|---|
| Topic retrieval | ≥1 retrieved document tagged with an `expected_topics` value |
| Citation integrity | every evidence item carries a resolvable anchor + formatted citation |
| Warning honesty | fixture/unverified warnings present on all fixture-derived evidence |
| Label discipline | no claim exceeds `secondary_supported` on fixture data |
| Missing-source honesty | zero-evidence questions produce the explicit notice, never a fabricated answer |

Machinery score = fraction of questions passing all checks. **This is NOT
a legal-quality score.**

### Layer 2 — Legal quality (human, after expert validation)
Per answered question, the reviewing lawyer scores 1–5 on:

1. **Correctness** — legally accurate as of `law_as_of`.
2. **Completeness** — contains every `expected_answer_elements` item.
3. **Authority discipline** — mandatory authorities cited; binding/
   persuasive/secondary labeled correctly; nothing over-claimed.
4. **Citation accuracy** — every citation resolves and supports its
   proposition; quote matches source (gate: one fabricated citation = 0
   for the whole question).
5. **Trap avoidance** — none of the `common_traps` committed.
6. **Actionability** — a practitioner could act on the answer.

Question score = mean of axes, with the citation gate override.
Category score = mean of its questions. Difficulty bands reported
separately. Two raters; ≥2-point disagreement → third rater.

## Metrics rollup (mirrors LAWME_ISRAELI_LEGAL_BENCHMARK.md)
Recall@K on mandatory authorities · citation accuracy · quote accuracy ·
hallucination rate (target 0, hard gate) · authority accuracy · lawyer
correction rate · confidence calibration.

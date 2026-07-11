# POC Benchmark Plan

## Layers
1. **Machinery benchmark (running today)** — `npm run legal:benchmark:run`
   scores the ENGINE against the 28-question draft set on the fixture
   corpus: topic retrieval, citation integrity, warning honesty, label
   discipline, missing-source honesty. Current: **28/28 (100%)**.
   Explicitly NOT a legal-quality score.
2. **Legal-quality benchmark (after expert validation)** — the employment
   lawyer pins gold sources per `expert-review-guide.md`; scoring per
   `evaluation-rubric.md` (correctness, completeness, authority
   discipline, citation accuracy w/ hallucination gate, trap avoidance,
   actionability).

## Assets (docs/legal-knowledge/benchmark/employment-law/)
README · questions.template.json · questions.draft.json (28 drafts, 14
categories × 2, all `draft`/`expert_validated:false`) ·
source-ground-truth.template.json · evaluation-rubric.md ·
expert-review-guide.md.

## Benchmark-driven development — demonstrated in this task
First machinery run: 78.6% → analysis showed topic-retrieval misses →
two controlled-dictionary entries + one fixture enrichment + a
normalization bug fix (space-swallowing regex) → 100%. The benchmark
caught a REAL bug (invisible-char class deleting U+0020) before any real
corpus existed. That is exactly the loop the founder approved.

## Path to the full LILB employment subset
1. Expert validation of the 28 drafts (≈10-12 lawyer-hours).
2. Extend to the POC-plan volumes: 40 research + 20 precedent-retrieval +
   10 validity + 10 deadline tasks.
3. Real-corpus machinery run (after migration apply + lawful ingestion).
4. Legal-quality run with two raters; gates from
   LAWME_ISRAELI_LEGAL_BENCHMARK.md (hallucination 0, citation ≥98%,
   Recall@10 ≥85%, authority ≥95%).
5. Every engine change re-runs both layers; results append to
   benchmark_runs/benchmark_results when the DB exists (today: `.poc-runs/`
   JSONL).

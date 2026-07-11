# LILB — LawME Israeli Legal Benchmark

This directory holds the benchmark assets. Design: see
`../LAWME_ISRAELI_LEGAL_BENCHMARK.md`.

## Contents
- `sample-tasks.json` — 12 synthetic sample tasks, one per category,
  demonstrating the task format. **Synthetic or public-reference only**:
  fictional parties, real legal rules referenced by citation, no
  copyrighted bulk content.

## Task format
```jsonc
{
  "task_id": "LILB-<category>-<serial>",
  "category": "research | precedent_retrieval | authority_ranking | validity | citation_verification | deadline_extraction | judgment_summary | contradiction_detection | hearing_preparation | drafting | red_team | hallucination_detection",
  "difficulty": "basic | practitioner | expert",
  "domain": "labor | torts_nii | civil | real_estate | contracts | ...",
  "law_as_of": "YYYY-MM-DD",
  "prompt_he": "המשימה בעברית — כפי שתוצג למנוע",
  "inputs": { "...task-specific fixtures (synthetic documents, source sets)" },
  "gold": { "...gold answer, gold authority list, or rubric reference" },
  "scoring": { "method": "exact | recall_at_k | rubric | gate", "metrics": ["..."] },
  "notes": "authoring notes, contamination flags"
}
```

## Rules for task authors
1. Never copy commercial-database content into a task.
2. Real citations must be verifiable public documents; synthetic fixtures
   must be clearly fictional (parties like "אלמוני נ' פלונית בע\"מ").
3. Every validity/citator task carries `law_as_of` — gold answers are
   date-pinned.
4. Expert-band tasks go to the private split (contamination control).
5. Hallucination-detection tasks must plant realistic-looking fabricated
   citations (correct format, plausible numbers) — that is the point.

## Running (future)
The evaluation harness is a POC-phase deliverable. It will consume this
directory, execute tasks against the research/drafting pipelines, compute
the metric table from the design doc, and publish a scorecard per engine
version. The hebrew-llm-eval-suite skill provides the Hebrew-quality
evaluation utilities.

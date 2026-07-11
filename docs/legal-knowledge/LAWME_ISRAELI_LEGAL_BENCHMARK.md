# LawME Israeli Legal Benchmark (LILB) — Design

**Status: benchmark DESIGN + synthetic samples only (Epic 0, Phase 15).
The engine is designed against the benchmark — not the other way around.**
No copyrighted bulk dataset is included; tasks reference public documents
by citation or use synthetic fixtures.

## Task inventory (680 tasks at full build-out)

| # | Category | Count | Tests |
|---|---|---|---|
| 1 | Legal research questions | 200 | end-to-end research pipeline quality |
| 2 | Precedent retrieval | 100 | find the controlling/leading cases for an issue |
| 3 | Authority ranking | 50 | order mixed authorities by binding force for a forum |
| 4 | "Is this still valid?" | 50 | citator validity verdicts (statutes + judgments) |
| 5 | Citation verification | 50 | verify/refute that a citation supports a proposition |
| 6 | Deadline extraction | 50 | extract procedural deadlines from documents/rules |
| 7 | Judgment summary | 50 | faithful ratio/outcome/parties summaries |
| 8 | Contradiction detection | 30 | find the conflict inside a source set |
| 9 | Hearing preparation | 30 | build prep sheets: issues, authorities, weak points |
| 10 | Drafting tasks | 30 | structure + citation discipline in drafts |
| 11 | Red Team tasks | 20 | attack a position; find the best counterarguments |
| 12 | Hallucinated-citation detection | 20 | catch fabricated/mismatched citations planted in text |
| | **Total** | **680** | |

Each category ships in three difficulty bands (basic/practitioner/expert)
and records: task_id, category, difficulty, domain, prompt (Hebrew),
gold answer or rubric, source requirements, scoring method.

## Metrics

| Metric | Definition | Applies to |
|---|---|---|
| Recall@K | gold authorities found in top K (K=5,10,25) | 1,2 |
| Precision@K | top-K results that are relevant | 1,2 |
| Authority accuracy | binding/persuasive/secondary labels correct | 1,3 |
| Citation accuracy | citations resolve + support the proposition | 1,5,10 |
| Quote accuracy | quoted text matches source at anchor (exact/normalized) | 5,7,10 |
| Page-location accuracy | pinpoint anchor within ±1 paragraph/page | 5,12 |
| Freshness | answer reflects law as of eval date (version-dated) | 1,4 |
| Contradiction recall | planted/known conflicts surfaced | 8,13→ |
| **Hallucination rate** | fabricated authorities per 100 citations — **the headline safety metric; target 0** | 1,7,10,12 |
| Lawyer correction rate | % of claims corrected in human review | 1,7,9,10 |
| Time saved | expert-estimated minutes vs manual baseline | 1,9,10 |
| Actionability | rubric 1–5: can a lawyer act on this output? | 1,9,10,11 |
| Confidence calibration | Brier score of self-reported confidence vs correctness | all |

## Evaluation rubric (categories without exact gold answers)
Human rubric, 1–5 per axis: correctness · completeness · authority
discipline (labels, no over-claiming) · Hebrew legal register ·
actionability. Two raters; disagreement ≥2 → third rater. Model-assisted
pre-scoring allowed, human decides.

## Sourcing rules
- Public/synthetic only: tasks reference public judgments/statutes by
  citation (no bulk copying) or use fully synthetic fixtures (fictional
  parties, real legal rules).
- Gold answers for validity/citator tasks pinned to an as-of date —
  the law moves; each task carries `law_as_of`.
- No task may embed commercial-database content.
- Contamination control: expert-band tasks kept in a private split.

## Build plan
Epic 0 ships: structure (this doc), README, and 12 synthetic sample tasks
(one per category) in `benchmark/sample-tasks.json`. Full task authoring
is a POC-phase work item with lawyer involvement (see
LEGAL_KNOWLEDGE_POC_PLAN.md) — benchmark tasks for the chosen POC domain
get authored first (labor law recommended).

## Pass gates for the future engine
- Hallucination rate = 0 on categories 10/12 (hard gate — a single
  fabricated citation fails the release).
- Citation accuracy ≥ 98%, quote accuracy ≥ 99%.
- Recall@10 ≥ 85% on domain-scoped precedent retrieval.
- Authority accuracy ≥ 95%.
- Calibration: confidence within 10 points of measured accuracy.

# POC Relevance Gate — LawME Fails Closed

**Mandate (founder, 2026-07-12):** the deployed POC answered an
out-of-domain question ("ירושת דירה") with weakly-related labor passages,
because lexical scores were normalized relative to the best available
result. This gate fixes that failure mode BEFORE any real corpus is
ingested. LawME must prefer
"לא נמצאו בקורפוס הנוכחי מקורות ברמת רלוונטיות מספקת לשאלה זו."
over returning weakly related legal content.

## Architecture

`src/modules/legal-knowledge/research/relevance-gate.ts` — deterministic,
no model in the loop, no network. Runs inside `runDbResearch` AFTER
ranking and BEFORE answer assembly. On failure the result becomes a
structured `no_answer` state; weak passages move to `weakEvidence`,
explicitly marked "מתחת לסף הרלוונטיות — אינו עונה על השאלה", collapsed
by default in the dev UI.

### Raw vs normalized — both preserved
Every evidence item now carries `scoreBreakdown.raw`:
- `lexicalRank` — raw ts_rank/trigram retrieval score
- `lexicalCoverage` — ABSOLUTE coverage: fraction of the query's
  content-bearing tokens found in the passage (stopwords excluded; light
  Hebrew prefix + inflection stemming, התפטרה↔התפטרות; expansions are
  deliberately EXCLUDED — they help ranking, they must not manufacture
  relevance)
- `vectorCosine` — raw mock-semantic cosine

Normalized scores continue to rank. Raw scores decide whether an answer
exists. A weak result stays weak even if it ranks first.

### The ten gate signals
1. absolute lexical relevance (`rawLexicalTop`)
2. semantic relevance (mock cosine; advisory floor — never passes alone)
3. domain compatibility (below)
4. legal-entity overlap (institutional entities per domain profile)
5. statute/issue overlap (statute references per domain profile)
6. source authority (primary = legislation + case law of any instance;
   secondary/guidance alone never carries an answer)
7. independently relevant passages/documents
8. result-score separation (top coverage − median)
9. corpus coverage (reported on every answer)
10. query confidence (length / Hebrew ratio / content tokens)

### Domain gate
9 domain profiles (employment active + 8 foreign). Combines controlled
vocabulary, statute references, institutional entities, deterministic
mock-semantic centroid classification, and retrieved-source agreement.
NOT keyword-lists-only; statute/entity references are decisive, semantic
classification breaks vocabulary ties. Limitations are stated in every
report (`domain.limitations`) — conservative by design until real
embeddings are approved.

### Minimum evidence rule
Answer requires ONE of:
- a strongly relevant primary source (coverage ≥ 0.50), or
- a primary source at coverage ≥ 0.40 (domain gate acts as second lock;
  measured negative-set maximum coverage is 0.333), or
- two independently relevant documents (each ≥ 0.30)

AND: no unresolved domain mismatch · valid citation anchors ·
query confidence ≥ 0.4. A secondary/guidance source alone → no_answer
with weak results shown.

### Thresholds (calibrated 2026-07-12)
| Threshold | Value | Basis |
|---|---|---|
| ABSOLUTE_LEXICAL_MIN | 0.30 | negatives max 0.333 is domain-blocked; covered positives ≥ 0.36 |
| ABSOLUTE_LEXICAL_STRONG | 0.50 | strong single-source answers |
| PRIMARY_SINGLE_SOURCE_MIN | 0.40 | single primary + domain lock |
| SEMANTIC_FLOOR | 0.05 | advisory (mock quality) |
Change ONLY with both benchmarks green.

## Negative-query benchmark
`npm run legal:benchmark:negative` — 42 questions (5×8 foreign domains +
2 vague), plus the 28-question gold set as gate-regression. Report:
`.poc-runs/negative-benchmark-report.json`.

Results (2026-07-12):
| Metric | Result | Target |
|---|---|---|
| false-answer rate | 0 | 0 |
| weak-source answer rate | 0 | 0 |
| out-of-domain reject rate | 100% | ≥95% |
| exact-domain detection | 87.5% | measured |
| no-answer recall | 100% | ≥95% |
| no-answer precision | 100% | — |
| calibration accuracy | 88.6% | measured |
| fabricated claims | 0 | 0 |
| unsupported answers | 0 | 0 |
| answerable gold questions answered | 100% (20/20) | 100% |
| honest-uncertainty questions handled | 100% (8/8) | 100% |

8 gold questions are classified `UNCERTAINTY_OK` (vacation, sick leave,
harassment ×2, equal-opportunity interview, contractor offsetting):
their ONLY corpus coverage is a secondary review or guidance document —
per the minimum-evidence rule the CORRECT behavior is honest uncertainty.
When Epic 3 ingests real primary sources for these topics, remove them
from the list; the benchmark will then require answers.

## Real embeddings (future)
A real provider replaces ONLY the semantic signal via the existing
`EmbeddingProvider` interface — the research API is unchanged. The
deterministic gate remains as fallback, safety layer and regression
baseline. Real embeddings may improve retrieval; they must never remove
the absolute relevance gate.

## Dev interface
`/dev/legal-intelligence` now shows: gate PASS/FAIL badge, raw lexical /
raw semantic / normalized scores, detected vs active domain, evidence
counts, failure reasons, the structured no-answer state with suggested
actions, weak results collapsed and marked non-authoritative, corpus
coverage (documents, types, verified-update = none, missing categories),
and a one-click gate fixture: "ירושת דירה" → expected no-answer.

## Validation (all seven checks)
1. Pregnancy-dismissal query → answered, correct top evidence ✓ (test)
2. Inheritance query → structured no-answer, exact Hebrew message ✓ (test)
3. Weak in-domain queries → honest uncertainty (8 UNCERTAINTY_OK) ✓ (benchmark)
4. Normalization cannot inflate an irrelevant result ✓ (dedicated test)
5. Gate covered by deterministic tests — 12 tests, no network ✓
6. Negative benchmark PASSED (table above) ✓
7. All honesty warnings remain visible (asserted in tests + UI check) ✓

Full suite after integration: 98 tests (97 pass, 1 credential-gated
skip) · lint clean · typecheck clean · production build green ·
positive machinery benchmark 28/28.

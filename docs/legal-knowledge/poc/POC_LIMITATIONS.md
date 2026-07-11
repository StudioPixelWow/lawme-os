# POC Limitations — honest list

**This POC proves machinery, not legal intelligence.** Anyone evaluating
it must know exactly where the edges are:

1. **The corpus is 13 synthetic fixtures.** No real judgment text exists
   in the system. Retrieval quality numbers say nothing about real-corpus
   recall.
2. **The "vector" search is a trigram-hash mock** — a deterministic
   lexical-similarity proxy. Real semantic retrieval (Hebrew embedding
   model) is unselected and unmeasured; hebrew-llm-eval-suite is the
   selection harness.
3. **The benchmark is machinery-only.** The 28 questions are drafts, not
   expert-validated; 100% pass means the plumbing works, not that answers
   are legally right.
4. **No citator.** Validity ("is this still good law?") is designed
   (Epic 0) but not implemented — answers explicitly warn about it.
5. **No live adapter.** supremedecisions access permission is unresolved;
   the adapter is fixture-backed by design. Real ingestion is blocked on
   permission verification + founder approval.
6. **Migration not applied.** Everything runs in memory; multi-tenant
   isolation is proven on a local cluster, not on the hosted project.
7. **PDF page anchors missing** (flattened text layer); OCR path is a
   stub decision-point (no OCR engine wired).
8. **Hebrew lexical search has no stemmer** — final-letter folding +
   trigram only. Morphology-heavy queries will under-recall until a
   Hebrew analyzer decision is made.
9. **Expansion dictionary covers employment law only** (17 entries) and
   grows manually, benchmark-driven.
10. **No UI.** CLI + JSON outputs only, per scope.
11. **Matter context is a plumbing hook** (`matterContext` string), not a
    real Matter integration — the Matter workspace doesn't exist yet.
12. **Answer prototype is extractive-only** — it cannot synthesize an
    argument; that is the point at this stage, and also a limitation.

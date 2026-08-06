# Legislation Retrieval Evaluation (FTS baseline)

Harness: `src/modules/legal-ai-israel/ingestion/legislation/retrieval-eval.ts`
(`evaluateRetrieval(questions, retriever, k)` → Recall@5, Recall@10, MRR,
citation-correctness, wrong-version-rate). Retriever is injectable — an FTS
retriever plugs in now; a vector/hybrid retriever later. No chat agent.

## Live dev results (demonstration corpus)

Run against `legalai.legal_chunks` FTS on dev:

- `רשות מוסמכת` → סעיף 5 (rank 0.33), then סעיף 2 (rank 0.19) — correct section
  ranked first, complete citation.
- `הוראות מעבר` → סעיף 6 — correct.
- **citation_contract_complete = true** (every chunk carries section number,
  heading path, source URL, span, content hash, published).

Demonstration metrics (targeted queries): Recall@5 = 1.0, MRR = 1.0, citation
correctness = 1.0, wrong-version rate = 0.0. The full 30-question suite runs once
an authoritative corpus is ingested. Embeddings deferred (no approved provider)
→ FTS baseline; the harness accepts a vector retriever unchanged.

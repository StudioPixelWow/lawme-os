# Limitations (POC honesty)

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

- Corpus is SYNTHETIC (13 docs) — nothing is a real legal source; outputs
  are for mechanism validation, not legal reliance.
- Embeddings are MOCK (deterministic trigram hash) — not production
  semantic quality; the absolute Relevance Gate is the safety floor.
- Classifiers, planners and issue templates are DETERMINISTIC and closed —
  no model assists yet; coverage of subdomains is limited to reviewed
  templates (pregnancy dismissal, severance, hearing duty + generic).
- Contradiction temporal/version detection is limited by missing real
  metadata.
- No live provider, no paid API, no production write, no real client data.
- Every legal claim requires human lawyer review (POC baseline).
- Dino is not autonomous: it never sends messages, files documents, or
  performs legal actions.

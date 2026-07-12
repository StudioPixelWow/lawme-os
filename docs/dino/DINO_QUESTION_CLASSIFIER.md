# Question Classifier

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

classification/question-classifier.ts. Deterministic; reuses the Relevance
Gate's `detectDomain` as the single source of truth for domains.
Outputs domain, subdomain, jurisdiction, procedural/substantive,
factual/legal/mixed, temporal scope, source requirements (primary/case-law/
regulation/extension-order/guidance/firm), urgency, risk, complexity,
likely ambiguity, confidence, limitations. Subdomain patterns tolerate the
Hebrew definite article (e.g. "פיצויי הפיטורים"). High-risk subdomains
(pregnancy dismissal, harassment, severance, constructive dismissal) are
inherently high-risk regardless of surface form. Extensible to civil,
torts, NII, real-estate, family, criminal, tax, corporate, insolvency,
administrative, IP.

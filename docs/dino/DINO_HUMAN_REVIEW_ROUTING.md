# Human Review Routing

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

review/human-review-router.ts. Routes by risk, domain, claim type, source
confidence, confidentiality, client policy, objective, deadline,
destination. Targets: no_review_internal_list, lawyer_review,
senior_lawyer_review, partner_review, compliance_review, privacy_review,
finance_review, do_not_proceed. Partner/specialist triggers: filing-ready
document, conflicting binding authority, unresolved version issue,
high-value/limitation/ethical risk, low-confidence client advice,
AI-restricted client, unverified commercial source. POC baseline: every
legal output requires at least lawyer review; mandatoryBeforeAction=true.

# Controlled Drafting

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

drafting/controlled-drafting-engine.ts. Produces ONLY structured research
artifacts: research summary, issue outline, source memorandum, evidence
matrix, questions for human review, next-research recommendations. NEVER a
filing-ready pleading, final opinion, client-facing advice, autonomous
strategy, or unverified conclusion. Every paragraph traces to atomic
claims; every substantive claim carries citations; unsafe_to_state claims
are omitted (recorded in omittedClaimIds). Mandatory label:
"טיוטת מחקר משפטי — נדרשת בדיקת עורך דין" (enforced by Legal QA).

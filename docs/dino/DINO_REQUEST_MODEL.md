# Request & Intent Model

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

`DinoRequest` (core/request.ts): question (required) + optional user/org/
matter/client ids, legalDomain, jurisdiction, court, documentObjective,
requestedOutputType, dateContext, temporalCutoff, sourceRestrictions,
confidentiality, aiPolicy, language, tone, urgency, humanReviewer,
allowed/forbiddenTools, suppliedContext (each item tagged by asserter).

Intent (16 types) classified by **deterministic rules first**
(intent-classifier.ts, closed reviewed rule set with visible evidence);
a provider may later assist but never replace the rules. Returns primary +
secondary intents, confidence, evidence, ambiguity, requiredClarification,
allowed + prohibited pipeline. POC executes only: legal_research,
legal_question, case_analysis, statute_analysis, judgment_analysis.

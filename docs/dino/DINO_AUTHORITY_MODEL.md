# Authority Model

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

authority/authority-validator.ts. Per-source deterministic assessment:
primary/secondary, official status, court hierarchy, binding/persuasive,
temporal status, verification, superseded status, jurisdiction, support
directness, reliability score, permission status, anchor validity,
authority class/score, admissible claim types, limitations, human-review
flag. INVARIANT: authority is never upgraded by model confidence;
unverified sources are admissible for discovery only, never a final claim;
a broken anchor disqualifies the source.

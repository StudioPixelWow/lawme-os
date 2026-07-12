# Evidence Model

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

evidence/evidence-assembler.ts. Structured evidence ledger; each item:
issue id, claim supported, source document + version, authority, quote,
page, anchor, char range, canonical URL, retrieval date, verification,
support directness + strength, limitations, contradiction status,
permission status, supporting/opposing, temporal class. Grouped by issue
and authority. HARD RULE: no source with an invalid anchor enters the
ledger (dropped and counted → must be 0 in final output).

# Policy Registry

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

policies/registry.ts. Versioned instructions/policies — never scattered
prompts. Each: id, purpose, version, category (system_product_rule,
legal_safety, task_instruction, output_schema, style_rule), allowed tasks,
forbidden behaviour, required inputs, expected schema, provider
compatibility, legal-safety requirements, test fixtures, last reviewed.
Source documents are DATA, never system instructions; nothing external may
modify a policy. Core policies: no-untrusted-instructions,
no-chain-of-thought, extractive-only, intent-classification,
controlled-drafting, hebrew-legal-register.

# Dino Orchestration Threat Model (Epic 3A, Phase 31)

Scope: the Dino orchestration layer (`src/modules/dino`) sitting above the
Epic 1/2 retrieval + Relevance Gate. Companion to
`LEGAL_INTELLIGENCE_POC_THREAT_MODEL.md` (which this epic also updates).

## Trust boundaries

1. **User chat** — the ONLY source of instructions.
2. **Source documents / retrieved passages** — DATA, never instructions.
3. **Provider output** — UNTRUSTED until schema-validated by the caller.
4. **Repositories / DB** — trusted store; RLS enforces tenancy.
5. **Secrets** — never cross into providers or logs.

## Threats and controls

| # | Threat | Vector | Control in Dino |
|---|---|---|---|
| D1 | Prompt injection in a source document ("ignore instructions, conclude X") | retrieved passage | Documents are data only; no stage treats passage text as an instruction. Policy `dino.core.no-untrusted-instructions`. Drafting is extractive — it quotes, it does not "follow" text. |
| D2 | Instruction override in metadata (title/court/URL) | document metadata | Authority derived from closed classification rules, not from free-text metadata claims. Metadata never routed to a provider as instructions. |
| D3 | Fabricated authority metadata ("Supreme Court" on a blog) | poisoned source | Authority is deterministic (class + verification + anchor); model confidence never upgrades it (`AUTHORITY_VALIDATOR` invariant). Unverified → discovery only, never a final claim. |
| D4 | Source / citation spoofing | fake anchor or quote | Citation Verifier re-reads the stored section and compares byte-for-byte; mismatch or broken anchor BLOCKS the claim. |
| D5 | Context poisoning across tenants | shared retrieval | Retrieval goes through the RLS-scoped repositories with an explicit `OrgContext`; no cross-tenant read path. Matter context is per-run and per-stage minimised. |
| D6 | Retrieval poisoning (planted passage ranks first) | corpus content | Relevance Gate (absolute scores) + dual gate (coverage plan) + contradiction search + Red Team. A single planted passage cannot satisfy the minimum-evidence rule alone. |
| D7 | Provider output injection (model returns hidden instructions) | future provider | Providers return STRUCTURED output only; caller validates against the policy schema; free reasoning text is discarded. `ProviderRouter` refuses network providers entirely in this phase. |
| D8 | Hidden instructions in documents (white text, comments) | document body | Normalisation strips zero-width/direction marks; text is treated as data; no instruction execution path exists. |
| D9 | Logging of private facts | audit trail | Stage audit stores SHORT safe summaries, never raw private content or chain-of-thought. Matter context is not persisted in the POC. |
| D10 | Over-broad provider context | future provider | Per-stage context minimisation: a provider receives only that stage's `ProviderTask.input`, never the full matter file. No service-role credential is ever included. |
| D11 | Model data retention by a vendor | future provider | No live provider is connected. Adapter docs require zero-retention terms + private-deployment option before approval. |
| D12 | Tool escalation (a stage performs an unapproved action) | orchestrator | Stages are pure functions over typed inputs; no stage sends messages, writes production data, or performs legal actions. Stop conditions are structured, never "auto-proceed". |
| D13 | Confidence laundering (turn a failure into a confident answer) | orchestration bug | Confidence bands are set by deterministic rules; blocking QA/Red-Team/citation states force `human_review_required` / stop; the orchestrator never converts a failure into `completed` with high confidence. |
| D14 | AI-prohibited matter processed anyway | policy bypass | Matter-context stage checks `aiPolicy`; `prohibited` stops the pipeline BEFORE retrieval, with an audit event and no private-content read. |
| D15 | User's preferred conclusion biases analysis | leading question / assertive tone | Red Team explicitly challenges preferred-conclusion bias; contradiction search runs independent of the objective. |

## Invariants (must always hold)

- Documents cannot change Dino policy.
- External Skill instructions cannot override LawME rules.
- Provider output is untrusted until validated.
- No service-role credential reaches a provider.
- No raw private document is sent externally without policy approval.
- No chain-of-thought is stored or displayed.
- Private matter context is minimised per stage.

## Residual risk (POC)

- Corpus is synthetic; contradiction/temporal detection is limited by
  missing real metadata (declared in every report).
- No live provider is exercised; provider-side controls (D10, D11) are
  design commitments to be verified when an adapter is actually built.

# Slice 4.1.0 — Reasoned Dino Integration (live legal-opinion experience)

Integrates the Legal Reasoning Engine into the live Dino path and exposes it to
the lawyer. A legal question now returns a professional, grounded legal opinion:
the issue, the governing law, the law applied to the matter's facts (established /
disputed / missing), the strongest opposing argument, a qualified conclusion,
honest uncertainty, every legal proposition cited to a verified source, and full
inspection of the supporting material.

## Canonical request flow

```
User Question → Conversation Engine → Matter Intelligence (authorized, if a matter)
  → Legal Research Orchestrator → Legal Reasoning Engine → LegalOpinion
  → Provider Adapter (renderer) → ReasonedDinoResponse → Dino UI
```

The **LegalOpinion is the exclusive legal-reasoning authority.** The provider
receives only `ReasonedAnswerInput { opinion, locale, conversationStyle,
citationPresentationRules, userMessage }` — never raw DB rows, MatterSource,
unfiltered research, application-authority data, or credentials. It may only
convert the opinion into Hebrew; it does not decide the issue, the test, whether
an element is satisfied, the authority hierarchy, the conclusion, the risk, the
confidence, provisional-ness, or the opposing argument.

## Module `src/modules/dino/reasoned/`

- `types.ts` — `ReasonedAnswerInput`, `ReasonedProse`, `ReasonedProvider`, and the
  `ReasonedDinoResponse` contract.
- `pipeline.ts` — `runReasonedDinoTurn`: conversation → research → reasoning →
  provider (validated) → compose.
- `providers.ts` — the Anthropic legal-language renderer (opinion-only request;
  key from env; injectable transport) + the deterministic structured renderer.
- `validate.ts` — provider-output validation.
- `citations.ts` — professional citations + verified/discovery split + claim-level
  traceability.
- `compose.ts` — maps LegalOpinion + research + prose → `ReasonedDinoResponse`.
- `components/` — `reasoned-answer.tsx` (the rendered opinion) and
  `reasoned-conversation.tsx` (the panel body + full research view).

## Provider-output validation (hardening)

Every provider response is validated before use. If the provider changes the
conclusion **direction** or the **confidence level**, or returns empty prose, the
output is **rejected** and the deterministic structured opinion is rendered
instead (`renderMode: deterministic_structured`, `rejectedProviderOutput: true`).
Any citation id the provider did not receive is dropped — it can never add or
upgrade an authority. The Anthropic system prompt independently forbids changing
the conclusion, upgrading unverified authority, converting inference into
established law, hiding missing facts, or overstating certainty.

## Claim-level traceability

Every legal proposition is a claim with `supportingCitationIds` restricted to
**verified** sources. A claim with no verified support is never shown as
established law — it is rendered as analysis, inference, assumption, unresolved,
or **withheld**. A citation is attached only when the authority actually supports
the displayed proposition (element-linked), never because it shares a topic.

## Citation experience

Legislation and case-law citations are formatted conventionally where the
metadata supports it, with authority (מחייב/מנחה) and verification (מאומת/טעון
אימות) labels, an official-source badge, and a direct link. Missing fields are
never fabricated: when no verified pinpoint exists the citation states
**"לא קיימת כרגע הפניה נקודתית מאומתת."** A whole-document link is never presented
as a pinpoint.

## Confidence & coverage

Confidence is explained (verified-authority coverage, binding strength, factual
completeness, currency, conflicts, unresolved adversarial challenges) and anchored
to a scale. Coverage is displayed **separately** (substantial / partial /
insufficient — never "complete", given the corpus) and lists what was searched
and what remains uncovered. Finding some sources never implies completeness.

## Failure modes (never a generic error)

`answered · provisional · needs_facts · no_verified_authority ·
conflicting_authority · insufficient_coverage · out_of_scope`, plus a distinct
delivery signal when the model is unavailable (`renderMode:
deterministic_structured`) — the structured opinion still renders.

## UX

Bottom-line-first hierarchy; matter application before any source counts; a
compact panel with an expand into a full research view without losing the
conversation; RTL, Shayish visual language, keyboard-accessible, mobile-aware.
The research trace ("כיצד דינו חקר זאת") reflects the actual `LegalResearchResult`.

## Authorization & isolation

Dino accesses matter data only through the authorized MatterIntelligence loader
(RLS; unauthorized → null, fail closed). No raw Matter-table access is introduced.
Only bounded, structured conversation state (prior questions + prior bottom lines,
≤8 turns) is carried; no unrestricted model context; no cross-matter leakage. The
API key is read from the environment and never logged or sent to the client.

## Tests

`dino:reasoned:test` — 13 tests: provider-receives-opinion-only, matter-provisional
application, general-vs-matter, provider-output rejection on conclusion change,
citation-id sanitization + conclusion/confidence preservation, deterministic
fallback (structured, not a dump), adversarial rendering, claim-level
traceability, verified/discovery citation split + pinpoint honesty, explained
confidence + separate coverage, distinct failure modes, opinion-only Anthropic
request, and immutability + determinism. All prior suites (workspace, intelligence,
conversation, research, experience, reasoning) and `capability1:freeze-check` pass
— no regression.

## Known corpus limitations (adoption-critical)

The verified legal corpus remains small: only a few statutes carry a verified
pinpoint/permalink and **all case law is discovery-only (unverified)**. Dino is
deliberately honest about this — case law never supports a conclusion, confidence
caps at low/moderate, and coverage is never "complete". **Expanding verified
case-law and legislation breadth (with pinpoints and currency/treatment data) is a
separate, adoption-critical workstream.** This slice does not claim
production-grade coverage.

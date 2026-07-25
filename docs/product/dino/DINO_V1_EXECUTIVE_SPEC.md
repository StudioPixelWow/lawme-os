# Dino V1 — Executive Spec

**Companion to** [`DINO_MASTER_SPECIFICATION.md`](./DINO_MASTER_SPECIFICATION.md). This is the shippable-scope summary for founders, first hires, design partners and QA. Where this document and the master spec differ, the master spec governs.

| | |
|---|---|
| **Status** | Draft for founder review — specification only (no code, no commits, no push) |
| **Scope of V1** | Israeli labor law · grounded analysis with honest coverage |
| **Trust core** | Already shipped (Reasoned Dino): LawME reasons, the model only phrases |
| **Pacing constraint** | Verified legal-corpus breadth, not model quality |

---

## 1. The promise, in one paragraph

Dino V1 is a senior labor-law partner that is present on every LawME screen, understands the matter in front of you, and answers legal questions with a bottom line, the governing law, how it applies to *your* facts, the strongest opposing argument, the risks, what's missing, and real citations — or an honest "I can't conclude on this yet". It never fabricates authority, never lets the model decide the law, and never overstates how much it covered.

## 2. What V1 does

- **General legal research** — ask any Israeli labor-law question with no matter open.
- **Matter-aware analysis** — with a matter open (authorized), Dino applies the law to established / disputed / missing facts.
- **Reasoned opinions** — bottom-line-first, element-by-element, with adversarial self-challenge and a qualified conclusion.
- **Document upload (basic)** — bring in a PDF/DOCX; Dino reads and grounds quotes with pinpoints (deep document intelligence is V2).
- **Professional citations** — source cards with authority (מחייב/מנחה) and verification (מאומת/טעון אימות) labels, official links, copy and export to Word.
- **Full research view** — expand any answer into the research workspace without losing the conversation.
- **Conversation refinement** — "only Supreme Court", "cases after 2020", "now apply it to this matter", "what's the opposing argument?".
- **Honest failure modes** — `answered · provisional · needs_facts · no_verified_authority · conflicting_authority · insufficient_coverage · out_of_scope`.
- **Deterministic fallback** — if the model is unavailable, the true structured opinion still renders.

## 3. What V1 does NOT do

Drafting/filing · hearing & witness prep · practice/office execution (calendar/task side-effects) · multi-matter or cross-office intelligence · autonomous agents · providers beyond the single renderer seam · any law outside Israeli labor law.

## 4. The trust guarantees (non-negotiable)

1. **The model never decides the law.** LawME computes an immutable `LegalOpinion`; the provider only converts it to Hebrew. Output that changes the conclusion or confidence, or invents a citation, is rejected and the structured opinion is shown instead.
2. **No fabricated authority.** Conclusions rest only on verified sources; unverified material aids discovery but cannot support a conclusion.
3. **Epistemic honesty.** Verified law, analysis, inference, assumption, disputed fact, allegation, missing fact and uncertainty are visibly separated.
4. **Coverage is never "complete".** Confidence is explained and scaled; coverage is shown separately and lists what remains uncovered.
5. **Authorization is never widened.** Dino reads only what the user could read directly; matter data flows solely through the authorized MatterIntelligence loader; fail-closed.

## 5. Honest limits stated to users

- The verified corpus is developing; **case law is discovery-only** until the case-law verification phase (P2), so it cannot yet support a conclusion.
- Confidence caps at low/moderate where authority is unverified.
- Israeli labor law only; other areas are declined as out-of-scope.

## 6. Launch blockers (must all be closed before GA)

| ID | Blocker |
|---|---|
| LB-1 | Verified-citation accuracy = 100% on the benchmark (no fabricated or mis-linked citation) |
| LB-2 | Zero authorization / cross-matter leakage in red-team and tests |
| LB-3 | Minimum viable verified corpus met for the covered doctrines (legislation + regs with pinpoints) |
| LB-4 | Deterministic fallback verified to always render the true opinion |
| LB-5 | Provider-output validation verified (conclusion / confidence / citation whitelist) |
| LB-6 | Any answer reproducible from stamped source/matter/reasoning/provider versions + timestamp |
| LB-7 | Honest-coverage and pinpoint-honesty behaviors verified |

## 7. Beta vs Production

- **Beta (design partners):** LB-1, LB-2, LB-4, LB-5 closed; corpus partial; framed as "grounded analysis, developing corpus".
- **Production (GA):** all LB-1…LB-7 closed; verified corpus fully met for the marketed doctrine set; expert-partner sign-off.

## 8. Success signals

Verified-citation accuracy, fact-classification accuracy, contrary-authority recall, confidence calibration, and an authorization-leak rate of zero. **Answer length is explicitly not a success metric.**

## 9. First-90-days focus

Corpus MVP (verified legislation with pinpoints) and citation polish (P1) — the highest-leverage work — while keeping the trust core green. Everything visible to a lawyer sits on top of that.

---

*Specification only. No implementation, code, SQL, migration, provider or source connection was created or changed; nothing was committed or pushed; Production was untouched.*

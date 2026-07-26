# Matter Workspace — AI & Intelligence Surfaces (Epic 5)

Defines every place intelligence appears, what runs automatically vs on request,
and the safety rules each surface obeys. The governing distinction:

> **Deterministic intelligence is ambient and free; Dino's pipeline is on-request
> and fail-closed.** Automatic surfaces are already computed in `MatterProfile`;
> they cost nothing to show. Dino runs a real pipeline only when the attorney asks.

---

## 1. Two tiers of intelligence

### Tier 1 — Ambient (automatic, deterministic, always current)
Everything in `MatterProfile` (state, score, narrative, prioritized actions). These
are pure rule-based engine outputs — no model call, no latency, no cost. They are
shown by default because they are always safe and always sourced:

- Posture + dimension states + numeric where measurable.
- The narrative briefing (deterministic templates).
- Urgent items, blockers, missing items, next actions.
- Coverage flags: insufficient legal coverage → `requires_review`; specialist
  routing; contradictions/verification gaps from the legal engine; deadline risk;
  missing mandatory evidence/documents; policy blocks.
- Limitations & disclosures (unavailable/stale/degraded).

Tier 1 refreshes whenever the matter's inputs change (event-driven, per the
Execution Model) and on explicit refresh. It never runs Dino.

### Tier 2 — On-request (Dino pipeline)
Deep legal work that requires the 26-stage Dino pipeline: legal research answers,
controlled drafting, issue decomposition, retrieval + citation-verified answers.
Launched only from Region G (or the `/` shortcut). Reasons it is never automatic:
cost, latency, and the fail-closed principle — Dino must be asked a specific
question so it can scope coverage and refuse when sources are insufficient.

---

## 2. Ambient AI surfaces (where Tier 1 shows)

| Surface | Signal | Source |
|---|---|---|
| Posture badge | overall posture | `score.summary.posture` |
| Dimension chips | per-area state | `score.dimensions[].state` |
| Briefing | situation in prose | `narrative.headline/currentState` |
| Urgent strip | what needs you now | `narrative.urgentItemsHe` |
| Blockers | what stops progress | `score.summary.topBlockers` |
| Next actions | what to do | `prioritizedActions` |
| Legal flag | coverage sufficiency | `matter-legal` `data.canRecommend`/`triadState` |
| Specialist routing | needs a specialist | dimension `reviewRoute.primaryTarget = specialist_review` |
| Deadline risk | overdue/imminent | `matter-deadline` `data` |
| Review-required | human decision needed | `state.requiresHumanReview` |
| Limitations | what we can't assess | `narrative.limitationsHe` |

None of these run Dino; all are sourced and can be drilled to provenance.

## 3. Dino surface (Region G) — behavior

- **Scoped to the matter.** Dino receives a bounded context package (facts with
  epistemic status, matter identity, AI policy, confidentiality) — never more than
  the question needs, and always through the application layer (Dino and Matter do
  not import each other).
- **Suggested questions** are derived from ambient open questions (missing legal
  coverage, an unresolved issue, a contradiction), so the attorney can launch the
  most useful query in one click — but the run is still explicit.
- **Fail-closed output.** When coverage is insufficient, Dino returns the
  no-answer state ("לא נמצאו בקורפוס מקורות ברמת רלוונטיות מספקת") rather than a
  weak answer. This is shown plainly, with what is missing and a specialist-review
  route.
- **Every answer shows:** coverage state, confidence (decomposed, never a single
  unexplained number), citations (verified; candidates labelled unverified),
  limitations, and the human-review route.
- **Output is a draft/answer, never an executed action.** Drafting produces a
  labelled draft ("טיוטת מחקר משפטי — נדרשת בדיקת עורך דין"); sending/filing is a
  human step (Class 3).

## 4. Human-review surface

Review routing is first-class, not buried:
- The Region A review indicator reflects `state.requiresHumanReview`.
- Each dimension and each Dino answer carries a `ReviewRoute` (target, reasons,
  severity, blocking). The Workspace shows the **primary target** (lawyer / senior
  lawyer / partner / specialist / compliance / privacy / finance / do-not-proceed)
  and whether review is blocking before any external action.
- A `do_not_proceed` route visibly halts Class-2 drafting affordances for that item.

## 5. AI-policy & confidentiality gating (per client)

Every AI surface obeys the client's `aiPolicy` and `confidentiality`:

- `prohibited` → **no AI-derived content** for this matter. Ambient Tier-1
  narrative/score are suppressed in favor of a manual-handling notice; Dino is
  disabled. The matter is handled by humans; the Workspace still shows identity,
  stage, deadlines, and structured facts (non-AI data), and flags the policy.
- `restricted_no_private_context` → Dino runs only with private/identifying context
  stripped; ambient surfaces avoid exposing private context beyond need.
- `allowed_with_review` → AI content is shown but always carries the review route;
  drafting is Class-2.
- `allowed` → standard behavior.

Privilege (`privileged`) tightens what provenance/audit exposes and what may be
included in any draft.

## 6. What AI never does here

- Never executes an external action (send/file/serve/pay/share/delete) — Class 3.
- Never runs Dino automatically.
- Never shows chain-of-thought (none exists) or an outcome probability (banned).
- Never presents an allegation as a confirmed fact or an unverified case number as
  authority.
- Never fabricates an owner, due date, balance, or citation — unknown stays
  "לא ידוע"; unavailable stays unavailable.

## 7. Trust affordances

- **"Why?" everywhere** — one interaction from any AI-surfaced claim to its
  structured evidence (Region I).
- **Freshness on every AI surface** — `computedAt` + stale, so the attorney knows
  how current the intelligence is.
- **Coverage honesty** — insufficient/unavailable is shown as itself; the product
  never manufactures confidence.

These affordances are what let a partner rely on the Workspace: every automatic
statement is cheap, current, sourced, and reversible to its evidence; every
expensive statement (Dino) is explicit, scoped, and fail-closed.

# Matter Intelligence — Architecture Review (Epic 4)

Official architectural review performed before the Epic 4 commit freezes the
Matter Intelligence foundation. This review is deliberately critical. It does not
defend the current implementation; it looks for the structural weaknesses that
would be expensive to fix after commit and after more intelligence domains are
built on top.

**Scope**: review and architecture only. No code was changed, no UI added, no
migration created, nothing committed, pushed, or deployed. Epic 4 tests, Dino
tests, and Triad tests remain green; `/today` is unchanged.

---

## 1. Executive recommendation

**B — Approve with a small, type-level refactor before (or immediately after)
commit.**

Epic 4 is well-built: the engines are pure, deterministic, provider-independent,
fail-closed, structured-output-only, and already cleanly separated from Dino
(zero cross-imports). It is a suitable permanent foundation. There is **one**
structural weakness worth acting on before it freezes into that foundation, and
it is cheap to fix now and expensive to fix later:

> **LawME models the same core concepts twice** — most importantly a matter's
> *facts and their epistemic status* — once in Dino (`ContextItem`/
> `ContextItemStatus`/`ContextProvenance`) and once in Matter (`MatterFact`/
> `FactStatus`/`source`), with divergent enum values; and it defines the client's
> **AI policy and confidentiality** as byte-identical string unions in two files.
> If these freeze, every future domain copies one of the two shapes and "is this
> fact confirmed?" / "what did the client authorize?" acquire two answers.

The fix is a small, additive, **type-only** extraction of shared primitives
(ADR-0002). It changes no logic, no UI, no database, and is guarded by the full
existing test suite. Because it is type-level and reversible, it can equally be
done as the very first task *after* commit — the important thing is that it
happens before a third intelligence domain is built. Hence **B**, not **C**: the
architecture is sound; one seam needs tightening.

Everything else in this review is forward-looking design (event model, scale,
score, narrative, shared context, persistence, failure, observability) that Epic
4 correctly does **not** build yet, and that the current design cleanly *permits*.

---

## 2. What Epic 4 got right (verified, not assumed)

- **Clean domain separation.** Import audit: `matter/**` imports only
  `legal-knowledge/procedure` and `legal-knowledge/triad`; it does **not** import
  `dino/**`, and `dino/**` does not import `matter/**`. No cycle. Both are peer
  clients of the Legal Knowledge base. This is the correct permanent shape.
- **Pure, deterministic engines.** Every engine is a side-effect-free function of
  `(Matter, asOf)`. No `Date.now`, no `Math.random`, no I/O, no network. Same
  input → identical output (there is a determinism test asserting exactly this).
- **Structured output only.** Every engine returns a typed `EngineAssessment`
  (status, score, coded findings by dimension, actions with owner/why/approval,
  structured `data`, confidence, review flag). No free-text-only answers.
- **Fail-closed legal reasoning.** The Legal engine bridges to Triad coverage and
  refuses substantive recommendations when coverage is insufficient — routing to
  specialist review instead of manufacturing confidence.
- **Human-in-the-loop by construction.** Externally-effective actions carry
  `requiresHumanApproval: true`.
- **Rule-based, honest Outcome engine.** Explicitly not ML, emits a qualitative
  position band with a disclaimer, never a win-probability — and there is a test
  guarding that no engine emits a bare probability.
- **Provider independence.** The engines call no model and no provider; the Legal
  engine's only external dependency is the deterministic Triad evaluator.

This is a strong base. The critique below is about *unification and future
scale*, not correctness.

## 3. Dependency direction (see DEPENDENCY_MODEL + ADR-0001)

Dino and Matter are **peer domain orchestrators**; neither imports the other;
cross-domain flows are composed by the application layer as bounded packages. The
ten ownership questions are answered in the dependency model. Headlines: Dino
does **not** orchestrate Matter and Matter does **not** call Dino stages; both are
clients of shared engines; facts are owned by the matter record; the law is owned
by Triad; audit is owned by the data layer; the final matter narrative is owned by
a future deterministic Narrative Engine.

## 4. Duplication review (see SOURCE_OF_TRUTH_MATRIX + ADR-0002/0008)

| Concept | Dino | Matter | Classification |
|---|---|---|---|
| Facts + epistemic status | `ContextItemStatus`, `ContextProvenance` | `FactStatus`, `source` | **dangerous duplicated source of truth** — extract |
| AI policy / confidentiality | `DinoAiPolicy` / `DinoConfidentiality` | `MatterClient.aiPolicy` / `confidentiality` | **shared primitive to extract** (identical unions, 2 files) |
| Confidence | `ConfidenceReport` (decomposed) | bare `confidence: number` | shared primitive; Matter should adopt Dino's shape |
| Human review | `ReviewRoute` (targets/reasons) | bare `requiresHumanReview` | shared primitive; Matter should adopt |
| Provenance | `ContextProvenance` | bare `source` string | shared primitive |
| Coverage | `CoverageState` (answer scope) | Triad `TriadState` (matter scope) | legitimate domain-specific **but** share sub-state terms + document the boundary |
| Risk / adversarial | `RedTeamReport` (challenge an answer) | `risk` engine (matter exposure) | legitimate domain-specific (different subjects) |
| Evidence | `EvidenceLedger` (retrieved sources) | `MatterEvidenceItem` (case evidence) | naming collision only — different meanings |
| Next action / recommendation | review route + controlled draft | `RecommendedAction` plan | share the `RecommendedAction`/`Finding` *shape*, not one list |
| Severity / status | `DinoStageStatus`, `ConfidenceBand` | `Severity`, `EngineStatus` | different axes; keep separate, name carefully |

Smallest safe refactor: extract the four **value-primitives** already duplicated
(`EpistemicStatus`, `AiPolicy`, `Confidentiality`, `Provenance`). Confidence and
review-route unification are enrichments Matter can adopt afterwards. Coverage is
*not* merged — the boundary is documented and sub-states shared.

## 5. Shared intelligence layer (see ADR-0002)

Recommended: a neutral `src/modules/intelligence/core/` owning the *shapes* of the
shared primitives, imported by both Dino and Matter (no cross-domain edge).
Urgent slice = the four value-primitives; the rest (`ConfidenceReport`,
`ReviewRoute`, `Finding`) can migrate incrementally. Ownership, boundaries,
migration path, backward-compatibility (alias old names), and versioning are in
ADR-0002. **Not performed in this review** — it is a founder decision.

## 6. Event-driven vs on-demand (see EXECUTION_MODEL + ADR-0003)

All engines are cheap pure functions, correct to run on demand for a single
matter. For scale, adopt **cache + event-driven invalidation**: an
`event → dirty engines` map, lazy/priority recompute, with Deadline as the only
always-live engine and Health/Next-Action as pure aggregators recomputed whenever
any component is dirtied. `asOf` day-rollover is modeled as an event. Not built in
Epic 4; the pure-function design makes it a drop-in later.

## 7. Scale (see SCALE_MODEL)

The engine layer scales well precisely because it is DB-free and deterministic;
the scaling burden is loading, caching, materialization, and queueing. Single-
matter view is fine to 100k; the **list/dashboard path must read materialized
Health/Score snapshots, never run engines**. The worst case (a corpus update
dirtying Legal/Outcome for every matter) is handled by a priority queue with
backpressure and honest `stale` signaling. No engine change is required to reach
100k.

## 8. Matter Score (see SCORE_MODEL + ADR-0004)

Replace any single opaque percentage with a **multi-dimensional, categorical-
first** score: each dimension reports a status (always), an optional bounded score
(null where numeric precision is false — Legal, Deadline, Client, Outcome),
confidence, and freshness; overall status = worst dimension. Explainable, partner-
suitable, UI-scannable, resistant to false precision.

## 9. Narrative Engine (see NARRATIVE_ENGINE + ADR-0005)

Design only. **Deterministic templates first**, not LLM prose: every sentence
traces to a structured finding; reports legal *coverage* not outcome; no
personification; respects AI policy; flags human review; `generatedAt = asOf`. A
typed `MatterNarrative` output is proposed. An LLM phrasing layer is a strictly-
downstream future option under Dino's fail-closed rules.

## 10. Shared Context Engine (see SHARED_CONTEXT_ENGINE + ADR-0007)

One canonical RLS-scoped source of truth per entity + **bounded per-engine context
packages** (never a giant object passed everywhere), with AI-policy and tenant
minimization enforced inside the assembler. Prerequisite: reconcile the fact/
policy/provenance primitives first (§4/§5), or the SCE just formalizes the
divergence. Design only.

## 11. Source of truth (see SOURCE_OF_TRUTH_MATRIX + ADR-0008)

Full matrix delivered; every concept has exactly one owner. Three current
violations (facts, AI policy, legal coverage) are recorded — the same three the
duplication review flags. This is the concrete near-term work list.

## 12. Persistence (see PERSISTENCE_RECOMMENDATION + ADR-0006)

**No migration created.** Defer tables (consistent with Dino). When they land:
snapshot trend-bearing outputs, current-state rows for the rest, append-only
transitions + review decisions, per-tenant RLS, `engineVersion`+`inputsHash` for
deterministic replay/correction. Snapshotting for outputs; append-only events only
for the audit spine.

## 13. Failure & degraded modes (see FAILURE_MODES)

Governing rule: **a Matter must never look healthy because an engine failed
silently.** Proposed completeness states: complete / partial / stale / unavailable
/ blocked / requires_review, rolling up to the worst. One concrete gap in the
current code: `assessMatter` calls engines with no failure isolation — safe for
fixtures, not for messy production inputs. Adding orchestrator-level try/catch +
a `state` field is a **small additive follow-up**, listed as recommended
(non-blocking, since the failure surface is empty under trusted fixtures).

## 14. Performance & observability (see OBSERVABILITY)

Telemetry per engine run (version, inputsHash, event, cache/stale, duration,
counts, review route, tenant/matter/correlation id); strict never-log list
(secrets, raw docs, privileged content, fact values, cross-tenant). Budgets:
single view ~150–250 ms (cached), Morning Workspace ~300–500 ms (materialized),
full 17-engine recompute < ~50 ms CPU. Engines are already sub-millisecond; real
budgets are dominated by I/O, so materialization/caching are the levers.

## 15. ADRs created

- ADR-0001 Dino vs Matter ownership
- ADR-0002 Shared intelligence primitives
- ADR-0003 Event-driven computation
- ADR-0004 Matter Score model
- ADR-0005 Narrative Engine
- ADR-0006 Persistence strategy
- ADR-0007 Shared Context Engine
- ADR-0008 Source-of-truth ownership

## 16. Final recommendation & next step

**Recommendation: B — approve with a small refactor.**

The small refactor (founder-approval required; **not performed**):

- **Goal**: extract the duplicated value-primitives so facts and policy have one
  definition before more domains copy them.
- **Exact files affected** (type-level, additive):
  - New: `src/modules/intelligence/core/` (`epistemic-status.ts`, `policy.ts`,
    `provenance.ts`, `index.ts`).
  - `src/modules/matter/types.ts` — `FactStatus`, `MatterClient.aiPolicy`/
    `confidentiality`, `MatterFact.source` → import shared types (alias to
    preserve names).
  - `src/modules/dino/core/request.ts` + `src/modules/dino/context/types.ts` —
    `DinoAiPolicy`/`DinoConfidentiality`/`ContextItemStatus`/`ContextProvenance`
    → import/align to shared types.
- **Complexity**: low. Type-only, no logic change; reconciling the two fact-status
  enums (choosing one canonical value set + mapping) is the only judgment call.
- **Risk it prevents**: two frozen, incompatible definitions of "confirmed fact"
  and "client AI policy" propagating into every future intelligence domain.
- **Guard**: full existing suites (matter/dino/triad) must stay green after the
  change.

If the founder prefers to **commit Epic 4 as-is first** (option A in spirit) and
schedule the primitive extraction as the immediate next task, that is acceptable —
the divergence is not yet load-bearing (the unions currently agree by value). The
firm requirement is only that the extraction happen **before a third intelligence
domain (Client/Document/Office) is built**.

**Recommended immediate next step**: **commit Epic 4**, then do the ADR-0002
shared-primitives extraction as the very next, small, isolated change — before
starting the Matter Narrative Engine or any new domain. Corpus expansion and
Matter Workspace UI both come after the primitive seam is unified.

---

### Validation performed for this review

Documentation only. No source files were modified. Confirmed: no UI added, no
migration created, no commit/push/deploy. Epic 4 (`matter:test` = 16), Dino
(`dino:test` = 12) and Triad (`legal:triad:test` = 24) suites remain green;
`/today` untouched. All review documents cross-reference consistently.

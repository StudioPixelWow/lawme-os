# Founder Review — Epic 4.1: Shared Intelligence Primitives

Status: complete, awaiting founder review. **Not committed. Not pushed.**

Small, isolated architectural refactor: extract the duplicated foundational
concepts the Epic 4 architecture review identified, plus the pre-approved Matter
engine failure-isolation follow-up. No new product features, no UI, no migration,
no behavior change beyond canonical type representation + additive failure fields.

## 1. Shared primitives created

`src/modules/intelligence/core/` (`intelligence-core-1.0.0`): `severity`,
`epistemic-status`, `provenance`, `ai-policy`, `confidentiality`, `confidence`,
`review-route`, `finding`, `recommended-action`, `warning`, `blocking-condition`,
`assessment` (envelope + `EngineStatus` + `ExecutionState`), `result`, `index`.
Neutral shapes only; no domain logic; imports no domain.

## 2. Canonical epistemic model

`EpistemicStatus` (8 values: confirmed_fact, document_derived_fact,
client_allegation, opposing_party_allegation, disputed_fact, inference,
assumption, unknown) with `FACT_STATUSES`/`ALLEGATION_STATUSES` sets and
`isConfirmedFact`/`isAllegation`/`isUnestablished`. The "allegation is never a
fact" rule now lives in exactly one place and is test-enforced.

## 3. Legacy mappings

Matter `FactStatus` ↔ canonical (`fromMatterFactStatus`/`toMatterFactStatus`,
round-trip lossless; `inference`/`assumption` return `null` rather than coercing).
Dino `ContextItemStatus` → canonical (typed identity). Dino confidence bands and
review targets → canonical via `dinoConfidenceBandToShared` /
`dinoReviewTargetToShared`. All conversions tested, including the invariant that no
allegation maps to a confirmed fact (Matter and Dino).

## 4. Provenance model

One `Provenance` contract (origin + reference required; everything else optional:
sourceType/id, document/matter/user id, verification, confidence, extraction
method, url, version, reviewer). Adapters `provenanceFromSource`,
`fromDinoContextProvenance`.

## 5. AI-policy unification

`AiPolicy` defined once; Dino (`DinoAiPolicy` alias + context assembler) and Matter
both import it. Byte-identical values → zero behavior change. Helpers:
`aiProcessingProhibited`, `aiRequiresReview`, `aiRequiresPrivateContextStripping`.

## 6. Confidentiality unification

`Confidentiality` defined once; `DinoConfidentiality` aliases it; Matter imports it.
`isPrivileged` helper.

## 7. Confidence contract

Neutral `ConfidenceReport` (decomposed, freshness + sourceCoverage, no
outcome-probability). Dino keeps its POC calc internally; adapter maps its bands.
Matter can adopt incrementally (`AssessmentEnvelope.confidence` accepts report or
bare number).

## 8. Human-review contract

Canonical `ReviewRoute` (9 targets incl. `specialist_review`, `no_review`).
`dinoReviewTargetToShared` + `reviewRouteFromFlag` adapters. Domains keep their
current routing; contract is the convergence target.

## 9. Finding/action contracts

Neutral `Finding`, `RecommendedAction`, `Warning`, `BlockingCondition` shapes.
Matter keeps its richer domain finding/action (with the seven-question
`dimension`), now using the shared `Severity`. Convergence is incremental.

## 10. Assessment-envelope decision

Created `AssessmentEnvelope<TData>` — generic over a typed payload (no `data: any`)
— plus `DomainResult<TPayload>` for application-layer composition. Adopted now:
shared `EngineStatus`. Matter's `EngineAssessment`/`MatterState` remain the domain
specialization; the new `MatterState.degraded` implements `ExecutionState` in
domain form. Full envelope adoption is a documented follow-up.

## 11. Dino files migrated

`dino/core/request.ts` (policy aliases), `dino/context/matter-context-assembler.ts`
(`aiPolicy: AiPolicy`). No pipeline/stage/scoring change; 12 dino tests + benchmark
green.

## 12. Matter files migrated

`matter/types.ts` (adopt shared Severity/EngineStatus/AiPolicy/Confidentiality),
`matter/intelligence.ts` (failure isolation), `matter/index.ts` (export new types).
16 pre-existing matter tests unchanged and green.

## 13. Coverage boundary result

Documented and enforced by policy (COVERAGE_BOUNDARIES.md): Dino coverage (answer),
Triad coverage (topic), Matter coverage (matter) stay distinct; only identical
low-level sub-state names are shared; no universal coverage engine; no domain's
coverage becomes another's source of truth. No code merge performed.

## 14. Engine failure-isolation result

`assessMatter` now wraps every engine (components, health roll-up, next-action) in
`safeAssess`. A thrown or structurally-invalid engine becomes a degraded
assessment (`status: "unknown"`, `requiresHumanReview: true`, coded
`engine:unavailable` finding) — never `healthy`. `MatterState` gains
`degraded { hasFailures, executionComplete, failedEngines[] }` and a rolled-up
`requiresHumanReview`. A degraded run can never present as healthy (guard +
health roll-up). No raw exception/stack leaks into output (tested). Deterministic
failure-injection tests included (7).

## 15. Circular-dependency checks

Automated boundary test passes: Dino does not import Matter; Matter does not import
Dino; shared core imports no domain orchestrator; both domains do import the shared
core. No circular dependencies.

## 16. Test results

typecheck PASS · lint PASS · intelligence 19/19 · matter 23/23 · dino 12/12 ·
triad 24/24 · poc 97 pass (1 pre-existing skip) · corpus 32/32 ·
`dino:benchmark` PASSED · `legal:benchmark:run` 100% (28/28) · `npm run build`
PASS (routes unchanged: `/today`, `/dev/legal-intelligence`, etc.).

## 17. Exact files created

`src/modules/intelligence/core/*` (14 files), `src/modules/intelligence/core/__tests__/primitives.test.ts`,
`src/modules/intelligence/__tests__/boundaries.test.ts`,
`src/modules/matter/__tests__/failure-isolation.test.ts`,
`docs/intelligence/*` (10 docs incl. this one).

## 18. Exact files modified

`src/modules/dino/core/request.ts`, `src/modules/dino/context/matter-context-assembler.ts`,
`src/modules/matter/types.ts`, `src/modules/matter/intelligence.ts`,
`src/modules/matter/index.ts`, `package.json`.

## 19. Behavior changes

None to existing outputs. Additive only: `MatterState` gains `degraded` +
`requiresHumanReview`; `assessMatter` gains an optional `options.engines` param
(defaulted). No scoring, pipeline order, or engine output changed. Canonical type
representation only where values were identical.

## 20. Founder decisions required

1. **Depth of convergence now vs later.** Adopted the urgent value-primitives
   (policy/confidentiality/severity/epistemic) fully; provided confidence/review/
   finding/envelope as contracts with adapters, adopted incrementally. Approve this
   split, or request deeper adoption (e.g. Matter `FactStatus` value convergence,
   full `ReviewRoute` emission) now.
2. **Deprecated aliases.** `DinoAiPolicy`/`DinoConfidentiality` kept as
   `@deprecated` aliases for API stability. Approve keeping, or request call-site
   updates to the shared names + alias removal.
3. **Remote state.** `origin/dev-preview` on GitHub still shows `f08ff2f` — the
   Epic 4 commit `8846aae` does not appear to have landed on the remote yet (see
   note below). Confirm the Epic 4 push before Epic 4.1 is committed on top.

## 21. Recommended immediate next step

Review and approve Epic 4.1; commit it as its own isolated commit on top of the
Epic 4 commit (once `8846aae` is confirmed on the remote). Then the next domain
(e.g. Matter Narrative Engine, or the first new intelligence domain) can be built
on the unified primitives. Do not build the Narrative Engine or a new domain until
this is reviewed.

---

### Remote-state note

At the start of Epic 4.1, `git fetch` showed `origin/dev-preview = f08ff2f` while
local `HEAD = 8846aae`. The Epic 4 commit was created in the cloud checkout and
delivered as a git bundle for you to push from your Mac; the remote had not yet
advanced when 4.1 began. Epic 4.1 is built correctly on local `8846aae`
regardless, but please confirm Epic 4 reached `origin` so the two commits stack
cleanly.

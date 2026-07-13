# Matter Source-of-Truth Matrix (Epic 4 Architecture Review)

Each concept must have exactly **one** authoritative owner. Derived engines may
consume it but must never silently overwrite it. This matrix is the permanent
ownership contract; it is also where the current implementation's one structural
defect is recorded.

## Matrix

| Concept | Authoritative owner (source of truth) | Consumers (read-only) | Notes |
|---|---|---|---|
| Matter stage (current) | Matter record (`currentStageId`) | all engines, Dino context | mutated only by an explicit stage-transition action |
| Procedure stage definitions | **Procedure Graph** (Triad Pillar C) | State machine, all engines | law/rules, not per-matter; versioned |
| Facts + epistemic status | **Matter record** (data layer) | Matter engines, Dino context assembler | ⚠ see defect below — two representations exist today |
| Allegations | Matter record (fact with `client_alleged`/`opposing_alleged`) | all | an allegation is a fact-row with non-confirmed status, never a separate truth |
| Documents | Matter record (documents) | Document engine, Dino evidence | possession/stage-fit only |
| Evidence | Matter record (evidence) | Evidence engine, Readiness | provenance of *why required* lives in Procedure Graph |
| Deadlines | Matter record (deadlines) | Deadline, Risk, Timeline, Next-Action | strict/basis carried per deadline |
| Tasks | Task system (future) / Team openTasks | Team, Next-Action | Next-Action *proposes*; the task system *owns* task state |
| Client status | Matter record (client) | Client, Communication, Risk | responsiveness/policy/confidentiality |
| Communication status | Communication log | Communication, Timeline, Client | awaiting-response flags |
| Billing / finance | Finance system (future) / financials block | Financial engine | engine reads; never computes authoritative balances |
| Team assignments | Team/staffing record | Team, Next-Action | |
| Legal authorities (statutes/cases/procedure) | **Legal Knowledge (Triad)** | Legal, Outcome, Dino | single legal truth; versioned; provenance-bearing |
| Legal coverage | **Triad coverage** (`evaluateTriad`) | Matter Legal engine, (future) Dino for real matters | ⚠ Dino has its own `evaluateCoverage`; see defect |
| Recommendations | each engine (its own actions) | orchestrator/UI merge | no single global list; merged for display only |
| Confidence | the shared confidence primitive (shape) + each engine (values) | orchestrator, narrative | ⚠ Matter under-models (bare number) vs Dino `ConfidenceReport` |
| Human-review routing | shared `ReviewRoute` primitive (shape) + each engine | orchestrator, application | ⚠ Matter under-models (bare boolean) vs Dino `ReviewRoute` |
| Narrative | Matter Narrative Engine (future) | UI | derived; owns nothing |
| Audit events | Data/application audit store (`audit_events`) | — | engines emit, never own persistence |
| Matter Health / Score | Health engine output → `matter_*` snapshots (future) | dashboards, trend | derived; snapshot is the read model |

## The recorded defect (must be resolved before the foundation freezes)

Three concepts currently have **two owners / two representations**:

1. **Facts + epistemic status.** Dino models a matter fact as `ContextItem`
   with `ContextItemStatus` (`confirmed_fact | client_allegation |
   opposing_party_allegation | document_derived_fact | inference | unknown |
   disputed_fact`) and structured `ContextProvenance`. Matter models it as
   `MatterFact` with `FactStatus` (`confirmed | client_alleged |
   opposing_alleged | document_derived | disputed | unknown`) and a bare `source`
   string. **Same concept, same "allegations are never facts" rule, divergent
   values and divergent provenance richness.** If both persist, "is this fact
   confirmed?" has two answers.
   → *Owner going forward:* the Matter record, via **one shared epistemic-status
   enum + one `Provenance` shape** that Dino's assembler also uses.

2. **AI policy & confidentiality.** `DinoAiPolicy`/`DinoConfidentiality` and
   `MatterClient.aiPolicy`/`confidentiality` are **byte-identical string unions
   defined twice**. Today they agree by luck; a future edit to one silently
   forks what "the client authorized". → *Owner:* one shared `AiPolicy` /
   `Confidentiality` primitive, imported by both.

3. **Legal coverage.** Dino's `evaluateCoverage` (`CoverageState`, issue-graph
   scoped) and Triad's `evaluateTriad` (`TriadState`, matter-topic scoped)
   overlap in sub-states (`insufficient_case_law`, `insufficient_facts`). They
   serve different scopes today (a QA answer vs a matter), which is defensible —
   but the boundary must be **documented and the sub-state vocabulary shared**,
   or a real matter routed through Dino will get two coverage verdicts. → *Owner:*
   Triad owns *matter* coverage; Dino owns *answer* coverage; both draw shared
   coverage sub-state terms from the shared primitive. Documented, not merged.

## The invariant

> Every concept above has exactly one owner. Engines are pure readers. The three
> ⚠ rows are the only violations, all introduced by Dino and Matter modelling the
> same concept independently. They are cheap to fix now (type-level) and
> expensive to fix after commit + more consumers. This is the basis for the
> review's Recommendation B.

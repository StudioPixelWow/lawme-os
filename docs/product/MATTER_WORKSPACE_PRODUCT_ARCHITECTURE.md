# Matter Workspace — Product Architecture (Epic 5)

The Matter Workspace is the single most important screen in LawME. It is where an
attorney lives. This document defines the **product** — not pixels — completely
enough that the screen can be built without making further product decisions.

It binds directly to the intelligence already built: `MatterState` (17 engines +
failure isolation), `MatterScore` (12 categorical dimensions + posture),
`MatterNarrative` (deterministic briefing), prioritized actions, the Procedure
Graph, the Legal Knowledge Triad, and Dino. Every surface named here maps to a
concrete field of `MatterProfile` (see MATTER_WORKSPACE_DATA_BINDING.md).

Companion documents:
- MATTER_WORKSPACE_INFORMATION_HIERARCHY.md — the 5-second test, above-fold vs
  progressive disclosure, never-show.
- MATTER_WORKSPACE_SECTIONS.md — every region, panel, collapse state, drill-down.
- MATTER_WORKSPACE_INTERACTIONS.md — interactions, action catalog, keyboard shortcuts.
- MATTER_WORKSPACE_AI_SURFACES.md — Dino & intelligence surfaces (auto vs on-request).
- MATTER_WORKSPACE_DATA_BINDING.md — exact surface → engine-output binding.

---

## 1. The product thesis

A Matter is a living object that already knows its own state. The Workspace does
not ask the attorney to reconstruct that state from folders, emails, and memory —
it **presents the matter's own understanding of itself**: what is happening, what
is at risk, what is missing, what blocks progress, what to do next, who, by when,
why, and where a human must decide.

The Workspace is therefore a **decision surface, not a file browser**. Its success
metric is: *how fast can a partner make the right next decision?*

## 2. The six product questions (answered)

**What should an attorney see immediately after opening a Matter?**
The matter's briefing and its decision state — in one glance, without scrolling:
(1) matter identity + current stage, (2) the posture badge, (3) the one-sentence
narrative headline, (4) the nearest hard deadline, (5) what is blocking progress,
(6) the top recommended action with owner + due + approval requirement, and (7)
whether human review is required. This is the "briefing card".

**What decisions must become obvious within five seconds?**
- Is this matter on track, or does it need me now? (posture badge)
- What is the single most urgent thing? (dominant concern / top urgent item)
- Is a hard deadline about to bite? (nearest strict deadline)
- What is stopping progress, and can I clear it? (top blocker + its action)
- What should happen next, who does it, by when? (top prioritized action)
- Do I need to review something before the system proceeds? (review flag)

**What information must never require scrolling?**
The briefing card (Region A+B), urgent items and nearest deadline (Region C), top
blockers, and the top 1–3 next actions (Region D), plus the posture badge and the
review/confidentiality/AI-policy indicators. Everything a partner needs to triage
the matter in one screen.

**What information belongs behind progressive disclosure?**
The full 12-dimension score grid; per-dimension findings and evidence; full
document/evidence/deadline/communication lists; legal coverage detail (triad
breakdown + sources); finance; team/workload; risk register; procedure graph;
trend history; and full assessment provenance/audit. All reachable in one expand
or one drill-down, none shown by default.

**What should Dino surface automatically?**
Only **flags derived from deterministic engines** — coverage insufficiency,
specialist-review routing, contradictions, deadline risk, missing mandatory items,
policy blocks. These are cheap, fail-closed signals already in `MatterState`.
Dino's expensive pipeline (research, drafting, deep issue analysis) is **never run
automatically**.

**What should never be shown unless requested (or ever)?**
Never shown unless requested: full legal research answers, drafting output, deep
source text, full audit trail, financial detail (subject to role/confidentiality).
Never shown at all: model chain-of-thought (none is produced), any legal-outcome
probability (banned), unverified case numbers presented as fact, and private client
context beyond what the current task needs under the client's AI policy.

## 3. Product principles (non-negotiable)

1. **Briefing before data.** The narrative headline and posture come first; raw
   lists are always one level deeper.
2. **Categorical before numeric.** Posture and dimension states lead; numbers are
   secondary and only where measurable (never an opaque overall %).
3. **Fail closed, visibly.** Unavailable/stale/insufficient states are shown as
   themselves, never as "healthy" and never hidden. A degraded matter never reads
   as on-track.
4. **Every claim is sourced.** Every narrative sentence and every dimension traces
   to findings/blockers/actions/assessments; the attorney can always ask "why?"
   and get the evidence.
5. **Human-in-the-loop is explicit.** Actions that have external effect show their
   approval requirement; review routing is a first-class surface.
6. **AI is a flag by default, an engine on request.** Automatic intelligence is
   deterministic and free; Dino's pipeline runs only when asked, with its coverage
   and limitations shown.
7. **Respect the client's AI policy and confidentiality** on every surface.
8. **Hebrew-first, RTL, professional.** No marketing, no anthropomorphism, no
   false certainty.

## 4. Region model (product regions, not layout)

The Workspace is composed of nine regions. Regions A–D are the **always-visible
decision core** (no scroll). Regions E–I are **progressive**.

| Region | Name | Visibility | Primary source |
|---|---|---|---|
| A | Matter Header / Identity | always | `state` identity, `state.stage`, `score.summary.posture`, indicators |
| B | The Briefing (Narrative) | always | `narrative.headlineHe`, `currentStateHe` |
| C | Needs You Now (urgent + deadline + blockers) | always | `narrative.urgentItemsHe`, `score.summary.topBlockers`, nearest `state.questions.when` |
| D | Recommended Next Actions | always | `prioritizedActions` (top 3) |
| E | Score / Dimension Overview | summary always, grid on expand | `score.dimensions`, `score.summary` |
| F | Intelligence Panels (Legal, Evidence, Docs, Deadlines, Client, Team, Finance, Risk, Procedure) | progressive | per-engine `state.engines`, `score.dimensions`, triad, procedure graph |
| G | Ask Dino / Research | on request | Dino pipeline |
| H | Trend / History | progressive | `computeTrend` (fixtures now; snapshots later) |
| I | Provenance / Audit | on request | `sentenceEvidenceMap`, `sourceAssessmentIds`, engine versions |

See MATTER_WORKSPACE_SECTIONS.md for each region's full definition.

## 5. Layout intent (RTL, not pixels)

Two-column intent on desktop, single-column stack on narrow/mobile:

- **Primary column (right, in RTL):** Regions A → B → C → D → E summary. This is
  the decision core and fits one screen.
- **Secondary column (left):** Region F intelligence panels as an accordion, plus
  the Region G Dino launcher and Region H trend. Progressive; scroll lives here.
- Region I (provenance) is a drawer/overlay reachable from any sourced element.

The Design Bible determines the actual visual system; this document fixes *what*
occupies the decision core and *what* is deferred, not how it looks.

## 6. Build-readiness

Every region, panel, collapse state, drill-down, action, keyboard shortcut, and AI
surface is enumerated in the companion documents, and each is bound to a concrete
field of `MatterProfile` in MATTER_WORKSPACE_DATA_BINDING.md. The empty, loading,
degraded, and stale states are defined there too. A front-end team can build the
Matter Workspace from this set without making further product decisions; open
choices are limited to visual presentation, which is the Design Bible's domain.

## 7. Explicit non-goals for Epic 5

No UI, no components, no routes, no Design-Language changes, no persistence, no new
engines, no LLM narrative. This epic is the product architecture only.

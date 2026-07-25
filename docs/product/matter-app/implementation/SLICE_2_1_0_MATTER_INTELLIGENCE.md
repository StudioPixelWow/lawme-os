# Slice 2.1.0 — Matter Intelligence Layer (Domain Intelligence, Read Model)

One canonical, immutable, **AI-free** read model — `MatterIntelligence` — that
turns a Matter from a collection of records into an intelligent domain object.
Every future capability (Dino, Legal AI, hearing prep, draft generation,
timeline reasoning, missing-information detection) consumes ONLY this object and
never reconstructs context from raw tables. No LLM, no embeddings, no vector
search, no chat, no automation.

## The "read once" architecture

The intelligence layer is now the foundation. One authorized read produces the
canonical raw source; two consumers derive from it — nothing else reads the
tables.

```
loadMatterSource (authorized, RLS, read ONCE)
        │  → MatterSource  (canonical raw records)
        ├──────────────► buildWorkspaceView    → MatterWorkspaceView   (presentation, 2.0.0)
        └──────────────► buildMatterIntelligence → MatterIntelligence   (domain model, 2.1.0)
```

- `intelligence/source.ts` — the canonical `MatterSource` vocabulary (moved here
  from the workspace; the workspace re-exports it, so 2.0.0 is unchanged).
- `intelligence/read.ts` — `loadMatterSource`: the single authorized read
  (`matter.read` decision BEFORE any content; authenticated RLS client only;
  never a service client / DEMO_SEED). The Workspace loader now calls this too.
- `intelligence/derive.ts` — `buildMatterIntelligence(source)`: a pure,
  deterministic, deep-frozen deriver (no wall clock — the reference "now" is
  injected).
- `intelligence/loader.ts` — `loadMatterIntelligence`: authorize + read + derive.
- `intelligence/index.ts` — public surface.

## The model (`MatterIntelligence`)

Immutable (deep-frozen). Contains the full matter plus derived intelligence:

- **Identity** — id, slug, title, file no, forum, legal domain, procedure (+ He
  label), topic, status, confidentiality, opened-at.
- **Stage** — current stage id + Hebrew label.
- **Client** / **Responsible lawyer** — present flag + name (null = unknown,
  never fabricated) + ids where available.
- **Records** — participants, facts (with epistemic status; an allegation is
  never `established`), documents (approved flag), evidence (collected flag),
  deadlines (bucket + signed day delta), timeline (newest first).
- **Relationships** — participant-role counts, roles present, has-client,
  has-opposing-party, fact→source linkage counts.
- **Counts** — facts (by epistemic), participants, documents (+approved),
  evidence (+mandatory/collected/missing), deadlines (+overdue/upcoming/
  unscheduled), timeline events.
- **Timing** — age, last-activity, days-since-activity, recent-activity,
  **dormant** detection, timeline density (per 30d), nearest deadline.
- **Completeness** — per-dimension flags + a 0–100 weighted score.
- **Health** — `healthy | attention | at_risk | critical | dormant` + risk level
  + contributing reasons.
- **Scores** — completeness, **attention** (0–100, how much a human is needed
  now), risk (`low | moderate | high | critical`), priority.
- **Outstanding issues** — typed, severity-ranked (missing client, overdue strict
  deadline, missing mandatory evidence, dormant, …) with related record ids.
- **Known unknowns** — the open questions a human/AI must resolve, each flagged
  blocking or not (e.g. "מיהו הלקוח בתיק?", "אילו ראיות חובה חסרות?").

All derivations are explicit rules (see `derive.ts`): epistemic mapping, deadline
bucketing, dormancy (>30d idle & open), recent activity (≤14d), imminent strict
(≤7d), completeness weights, attention weights, and the risk→health→priority
ladder. Deterministic and fully unit-tested.

## Tests

`matter:intelligence:test` — 12 tests: identity/labels, counts, epistemic facts,
deadline buckets + nearest, relationships, timing, completeness + score,
outstanding issues + known unknowns, health/risk/priority/attention, empty-matter
(critical + honest unknowns), dormant detection, and deep-immutability +
determinism. `matter:workspace:test` still green (source refactor is transparent);
full `capability1:freeze-check` passes — no regression.

## Success criterion

Capability 3 (Dino) can answer questions using `loadMatterIntelligence` →
`MatterIntelligence` alone, without reading raw tables: the model already exposes
the parties, the epistemic-graded facts, the evidence gaps, the deadline risk,
the timeline, the completeness/known-unknowns, and the health/attention scoring.

## Not built (per scope)

No chat, prompts, OpenAI/Anthropic, embeddings, RAG, Workflow, or automation.
The layer is a pure read model; wiring it to the workspace UI or to Dino is a
later slice.

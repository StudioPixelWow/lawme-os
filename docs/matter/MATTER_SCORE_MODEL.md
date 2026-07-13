# Matter Score Model (Epic 4 Architecture Review)

Reviews whether Matter Health should stay one aggregate number, or become a
decomposed multi-dimensional score.

## Recommendation: decomposed, categorical-first, no opaque percentage

A single opaque "Matter Health: 72%" is **false precision** for a legal file and
should not be the product's headline metric. A partner does not act on 72%; they
act on "evidence is complete, but a strict deadline is in 4 days and the client
is unreachable." The recommended model is a **vector of dimensions**, each with a
categorical status first and an optional bounded score second, plus explicit
confidence and freshness.

The current Epic 4 Health engine already supports this: it roll-ups component
statuses (worst-status dominates) and exposes `statusByEngine` / `scoreByEngine`.
The Score Model formalizes that payload into a stable, UI- and partner-facing
contract.

## Dimensions

| Dimension | Backing engine(s) | Primary signal | Numeric score appropriate? |
|---|---|---|---|
| Readiness | Readiness | can it advance? | yes (gate ratio, but capped by blocks) |
| Legal | Legal | triad coverage sufficient? | **no** — categorical (triad state) |
| Evidence | Evidence | mandatory evidence collected | yes (ratio) |
| Documents | Document | stage documents present | yes (ratio) |
| Timeline/Deadline | Deadline, Timeline | strict deadlines under control | **no** — categorical (overdue/imminent/clear) |
| Risk | Risk | exposure across 5 sub-dimensions | bounded index, shown as band |
| Client | Client | responsiveness + AI policy | categorical |
| Communication | Communication | outstanding responses | yes (light) |
| Finance | Financial | arrangement + collection | yes (light) |
| Team | Team | staffed + supervised + load | yes (light) |
| Progress | Progress | position in procedure | yes (completion %) |
| Outcome (position) | Outcome | rule-based position band | **no** — categorical band only |

## Per-dimension contract

Each dimension reports:

- **status** — `healthy | attention | at_risk | blocked | unknown` (the primary,
  always present). Colour semantics: healthy→green, attention→amber,
  at_risk→orange, blocked→red, unknown→grey.
- **score** — `0..1` **or null**. Null where numeric scoring implies false
  precision (Legal, Deadline, Client, Outcome). Never invent a number to fill a
  column.
- **confidence** — `0..1` decomposed (shared confidence primitive), because a
  score computed from partial data is less trustworthy than one from complete
  data.
- **freshness** — `computedAt` + `stale`. A dimension computed from stale inputs
  is labelled, not silently trusted.
- **blocking** — the blocking conditions that pin this dimension (if any).

## Aggregation rules

- **Overall status = worst dimension status.** A single `blocked` dimension makes
  the matter `blocked`, regardless of how green the rest are. Legal work does not
  average away a barred claim.
- **No single overall percentage is shown as the headline.** An optional
  aggregate index MAY exist for *sorting* lists, but it is explicitly labelled an
  ordering aid (same discipline the Outcome engine already applies to its
  `positionIndex`), never "chance of success" or "matter quality".
- **Comparable over time** via dimension snapshots — trend is per dimension
  ("evidence went from at_risk to healthy last week"), which is actionable, where
  a moving blended percentage is not.

## Why categorical-first

- **Explainable** — a status maps directly to findings and actions.
- **Resistant to false precision** — no pretending a legal position is 63%.
- **Partner-suitable** — mirrors how a supervising partner triages.
- **UI-suitable** — a row of coloured dimension chips with a "worst" headline is
  scannable across many matters (Morning Workspace) and drillable on one.

## Relationship to Health engine

The Health engine remains the **roll-up mechanism**; the Score Model is the
**contract for its output**. When persistence lands, the `matter_score_dimensions`
snapshot (one row per dimension per recompute) is what dashboards and trend views
read — never the live engines.

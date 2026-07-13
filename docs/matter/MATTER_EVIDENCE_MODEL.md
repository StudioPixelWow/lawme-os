# Matter Evidence Model (Epic 4)

Engine: `matter-evidence` · `src/modules/matter/engines/evidence.ts`

## Question

Is the evidentiary base for the matter in place? The engine separates
**mandatory** from optional evidence and lets the mandatory gaps drive the
score.

## Logic

- Mandatory evidence not collected → `high` finding on `what_is_missing` plus a
  `collect-evidence` action.
- Optional evidence not collected → `low` finding (surfaced, not scored hard).
- `score` = collected mandatory / total mandatory (1.0 when there is no
  mandatory evidence).
- `requiresHumanReview` when any mandatory evidence is missing.

## Provenance boundary

*Why* a given piece of evidence is required lives in the Procedure Graph
(each `EvidenceRequirement` carries `SourceLink`s). This engine reasons over
what the matter has actually collected against the stage's mandatory set; it
does not restate the legal basis, which keeps a single source of truth for
provenance in the Triad.

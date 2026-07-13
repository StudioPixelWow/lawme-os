# Matter Team Model (Epic 4)

Engine: `matter-team` · `src/modules/matter/engines/team.ts`

## Question

Is the matter properly staffed and supervised, and is anyone overloaded?

## Logic

- **Unstaffed** (no team members) → `high` finding + a partner `assign` action,
  score 0. A matter with no owner is a serious operational gap.
- **No supervisor** (no `partner` or `senior_lawyer` on the team) → `medium`
  finding + an `add-supervisor` action. Senior oversight is required for
  professional-responsibility reasons.
- **Overload** — any member with `capacityLoad ≥ 0.85` → a `medium` finding
  naming them.
- `score` = `0.5 × (has supervisor) + 0.5 × (1 − average load)`.

`data` exposes team size, supervisor presence, average load, total open tasks,
and the names of overloaded members. `requiresHumanReview` when there is no
supervisor (or no team).

## Who

Team findings feed the matter's **who** dimension alongside the owner roles the
Next-Action plan assigns.

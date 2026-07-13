# Matter Financial Model (Epic 4)

Engine: `matter-financial` · `src/modules/matter/engines/financial.ts`

## Question

Is the matter on sound commercial footing for the firm? This engine flags
operational financial risk. It gives **no financial advice** — only firm-side
operational flags.

## Logic

- No documented fee arrangement → `medium` finding + a partner-level
  `set-arrangement` action (an undocumented arrangement raises both collection
  and dispute risk).
- Open balance ≥ 50% of amount billed → `medium` finding + a `collect` action.
- A disclosed write-off risk (`writeOffRiskHe`) → `medium` finding.
- `score` = `1 − penalties` (each flag subtracts 0.2).

`data` exposes `hasArrangement`, `billed`, `collected`, `outstanding`,
`currency` (ILS), and any `writeOffRisk`. The engine does not require human
review by default — these are operational nudges, not blocks.

## Boundary

Amounts are read as given on the matter; the engine performs no billing
calculations, no rate advice, and no forecasting.

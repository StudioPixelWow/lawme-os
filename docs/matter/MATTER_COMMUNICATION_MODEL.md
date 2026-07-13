# Matter Communication Model (Epic 4)

Engine: `matter-communication` · `src/modules/matter/engines/communication.ts`

## Question

Is anything waiting on us, and how long has the matter been quiet? Communication
reads the matter's communication log.

## Logic

- Inbound items with `awaitingResponse: true` are the primary driver. An item
  awaiting a response for more than 3 days (relative to `asOf`) becomes a
  `medium` `what_is_missing` finding plus a `respond` action; newer ones are
  `low`.
- `data.daysSinceLast` reports the recency of the most recent communication;
  `data.lastDirection` the direction of the latest touch.
- `score` = `1 − 0.2 × (awaiting count)` (1.0 when there is no communication
  logged).

## Why it matters

An unanswered inbound item is both a client-service risk and, sometimes, a
substantive one (a missed settlement overture, an unacknowledged demand). The
Timeline engine separately flags long silence as staleness; this engine focuses
on outstanding obligations.

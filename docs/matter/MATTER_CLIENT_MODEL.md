# Matter Client Model (Epic 4)

Engine: `matter-client` · `src/modules/matter/engines/client.ts`

## Question

What does the client relationship constrain or risk? This engine reads the
client dimension — responsiveness, AI-processing policy, confidentiality, and
contact recency.

## AI policy is a hard constraint

The client's `aiPolicy` directly governs what LawME may do with the matter:

- `prohibited` → `high` `blocking` finding; the matter must be handled manually.
  This is also enforced at the State Machine as a `policy` block, so it
  propagates to Readiness and Health. `requiresHumanReview` is set.
- `restricted_no_private_context` → `medium` finding (AI allowed without
  private/identifying client context).
- `allowed_with_review` → `low` finding (AI allowed subject to human review).

## Other signals

- **Responsiveness**: `unreachable` → `high` finding + a `reengage` action;
  `slow` → `medium`.
- **Contact recency**: no contact for >30 days (relative to `asOf`) → `low`
  finding.
- **Confidentiality**: `privileged` matters get an informational classification
  reminder.

`score` = `1 − penalties`. The engine feeds the matter's **who** and **why**
dimensions.

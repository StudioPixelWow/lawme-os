# CLDM — Versioning Strategy

Every substantive entity is an **immutable version chain**: a stable canonical
identity plus an ordered series of write-once versions. The "current" state is a
pointer to the head version, never a mutated row. The model is **bitemporal** —
it distinguishes when something is true in the world (`valid_time`) from when the
system believed it (`system_time`).

## The four change kinds

`change_kind` on each version record:

| Kind | When | Effect |
|---|---|---|
| **new_version** | The real-world thing changed (a Law section amended; a company's status moved to liquidation; a case status changed). | Append an immutable version; `supersedes` the prior; `valid_time` opens a new interval; prior version's `valid_time` closes. |
| **correction** | The source was re-read or fixed and a prior version was *wrong* (parser bug, OCR error, source erratum). | Append a version with same `valid_time` as the one it corrects, new `system_time`; the corrected version is retained and marked superseded, not deleted. |
| **snapshot** | A periodic full capture of an entity's state even absent change (e.g. quarterly registry snapshot), for point-in-time proof. | Append a version identical in content but with a fresh `last_verified`/`system_time`; enables "as-of" evidence. |
| **diff** | Only a delta is available/needed (large documents where storing full copies each time is wasteful). | Store the change against a base version; the full state is reconstructable; used for big texts, not for identity/structured fields. |

## Decision rules — when to create what

- **Content differs from head (semantically)?** → `new_version` if the world
  changed; `correction` if the head was an error. The collector decides using the
  source's own change signals (amendment events, status fields, publication
  dates); ambiguous cases default to `new_version` with lower confidence and a
  review flag rather than silently overwriting.
- **Content identical to head?** → no new version; update `last_verified` on the
  head (a lightweight "still true" touch), OR a `snapshot` if point-in-time proof
  is required for that entity class.
- **Only part of a large document changed?** → `diff` against the base.
- **Relationship changed?** → new edge version (append), old edge closed by
  `valid_time`; entity versions unaffected.

## Immutability boundaries

- **Immutable (write-once):** Decision/Opinion bodies, Section text per version,
  Amendment events, Document Sources, Government/Regulatory decision documents.
  These are legal primary text — corrections append, never overwrite.
- **Versioned-mutable:** entity identity attributes (status, current
  officers/panel-of-record), classifications, structural groupings.
- **Assertion-mutable:** identity links, topic tags, AI derivations — revised
  freely but always versioned and attributed.

## Point-in-time queries

Because content and edges carry `valid_time`, the system can answer "what did
this Law say, who administered it, and what cases had been decided under it, as of
date D" by selecting versions/edges whose `valid_time` contains D. `system_time`
additionally supports "what did we *believe* on date D" for audit and dispute
handling.

## Retention and tombstones

- Nothing is hard-deleted. Retirement sets `lifecycle_state = retracted` or
  `deleted_tombstone`, preserving history and provenance.
- A source retracting a document is itself recorded as a versioned event (the
  content stays, flagged retracted), so the audit trail survives source changes.

## Interaction with identity resolution

Merge/split events (see `03`) are versioning events on the *identity* layer: they
create new identity-version records with `supersedes` pointers to the pre-merge
identities, keeping merges reversible and explainable.

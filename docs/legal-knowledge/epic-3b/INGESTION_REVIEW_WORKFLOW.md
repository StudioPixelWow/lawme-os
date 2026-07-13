# Ingestion Review Workflow (Epic 3B, Phase 9)

## Document lifecycle statuses
discovered → fetched → extracted → (normalization_failed) → pending_review
→ {verified_primary | verified_secondary | metadata_only | rejected} ;
plus superseded, withdrawn as terminal transitions.

Only `verified_primary` (and, for explanatory context only,
`verified_secondary`) documents may support substantive claims. Everything
else is discovery/metadata only and can never back a confident legal claim
in Dino.

## Review checks (per document, before promotion to verified)
official publisher · canonical URL resolves · title match · identifier
match · publication date · effective date (or explicitly unknown) ·
version state · completeness · anchor quality · OCR quality · duplicate
status (hash) · permission status · authority status · amendment status ·
superseded status.

## Gate
A document reaches `verified_primary` only when: publisher is official,
canonical URL resolves, full-text permission is allow_full_text_dev_poc,
version state is known (or the claim is explicitly version-uncertain),
anchors validate byte-exact, and no synthetic marker remains. Manual
verification of ≥20% of the corpus (Phase 12) is required before the
corpus is used for real answers.

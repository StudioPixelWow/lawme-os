# POC Citation Model

## The anchor
A citation is never "document X says so" — it is an exact, verifiable
location:

```ts
CitationAnchor {
  documentId, versionHash,     // WHICH content, cryptographically
  anchorKey,                   // block anchor (p:0007 / h:0002)
  pageNumber, charStart, charEnd,
  sourceUrl, retrievedAt,
  verificationStatus,          // verified_against_fixture | verified | unverified
}
```

`versionHash` (sha256 of the retrieved content) binds the anchor to a
specific version: re-extraction or source change breaks anchors
DETECTABLY (`findBrokenAnchors`), never silently.

## Utilities (all test-covered)
- `createAnchor` — from an extraction block; throws on unknown anchors.
- `validateAnchor` — offsets must still match the block exactly.
- `extractQuote` — the text an anchor points to, from normalizedText.
- `matchQuote` — quote-to-source verification (exact / normalized / none)
  — the drafting pipeline's quote-accuracy gate.
- `findBrokenAnchors` — version drift detection.
- `formatCitation` — Hebrew display:
  `סע"ש 12345-01-20, פסקה p:0003 (אוחזר 2026-07-11)`.

## Verification-status honesty
Fixture-derived anchors are `verified_against_fixture` — verified against
LOCAL content, meaningless as legal verification. Real documents start
`unverified` and become `verified` only when the verification pipeline
re-checks canonical content. Claim labels inherit this ceiling: fixture
evidence caps at `secondary_supported` (tested).

## What a legal answer can reference (all present in the POC output)
Document · version (hash) · page (when the extractor provides it) ·
paragraph anchor · char range · original source URL · retrieval date ·
verification status.

## DB mapping
`legal_document_sections(version_id, anchor_key, char_start, char_end,
page_number)` stores anchors; `legal_claim_citations(anchor_key,
quoted_text, quote_verified)` stores claim evidence; citator edges reuse
the same anchor vocabulary (`legal_citations.anchor_key`).

## Known POC limits (honest)
- PDF page anchors unavailable (flattened text layer) — page-level
  anchoring needs the per-page parse API at go-live.
- Char ranges refer to NORMALIZED text; original-byte offsets are
  recoverable through the stored original but not tracked as columns yet.

# Citation Verification

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

citations/citation-verifier.ts. Re-reads each cited section from the
repository and verifies document/version/anchor existence, byte-exact quote
match, char-range match, source URL, authority correctness, and that the
quote supports the claim (extractive: the claim references the exact
anchored quote). Statuses: verified, verified_with_limitation,
anchor_valid_source_unverified, quote_mismatch, broken_anchor,
insufficient_support, stale_version, superseded, requires_human_review.
Any failed citation BLOCKS the affected claim; a blocked claim in the draft
stops the pipeline.

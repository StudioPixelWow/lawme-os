# Source Permission Review (Epic 3B, Phase 3)

Decision vocabulary: allow_full_text_dev_poc · allow_metadata_only ·
pointer_only · permission_required · rejected.

## Governing rules
- Publicly viewable ≠ bulk reuse permitted.
- Copyright §6 makes the TEXT of law public domain, but the DATABASE's
  access terms and anti-bot controls still govern *how* we may obtain it.
- Unclear permission → metadata-only or pointer-only.
- Restricted / commercial / WAF-protected portals → not autonomously
  ingested.
- Editorial summaries (Kol Zchut, Nevo notes) → never copied.
- Official canonical URLs always preserved.
- No permission inferred without evidence.

## Per-source decisions
| Source | Full-text copyright | Access terms | Decision |
|---|---|---|---|
| Primary statutes (text) via **human-present browser or founder export** | public domain (§6) | targeted, human-in-loop | **allow_full_text_dev_poc** (verified seed) |
| Regulations (text), same channel | public domain (§6) | targeted | allow_full_text_dev_poc (verified seed) |
| Extension orders (text in Reshumot), same channel | official publication | targeted | allow_full_text_dev_poc (verified seed) |
| National Legislation DB — autonomous fetch | n/a | **restricted ToS, no API** | **rejected** (autonomous); permission_required for bulk |
| Reshumot portal — autonomous fetch | n/a | **restricted / WAF** | rejected (autonomous) |
| gov.il extension-order/guidance portals — autonomous fetch | n/a | **WAF block** | rejected (autonomous) |
| NII (btl.gov.il) guidance | official; may include editorial | unclear | allow_metadata_only + pointer |
| Knesset OData metadata | facts, not expressive | API terms unclear | allow_metadata_only (if terms confirm) |
| Kol Zchut | **editorial — copyrighted** | discovery use only | pointer_only (references/terminology; never text) |
| Any commercial DB (Nevo, Takdin, …) | licensed | commercial | rejected |

## Full-text persistence policy for the dev corpus
Full text is persisted ONLY for public-domain primary law
(statute/regulation/extension-order) obtained through a lawful,
human-present or founder-provided channel, with: canonical URL, publisher,
version metadata, retrieval timestamp, parser version, hash, exact
anchors, and `license_status="public_domain_official"`. Everything with
unclear access is metadata-only or pointer-only. No editorial text is
ever persisted.

Reviewer: LawME (automated review, this document). Review date: 2026-07-12.
Founder confirmation of the ToS position for the verified seed is
requested before ingestion (FOUNDER_REVIEW.md).

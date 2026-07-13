# Dry-Run Report (Epic 3B, Phase 10) — NO DATABASE WRITE

This dry run enumerates the candidate corpus and its permission/access
posture. **No document was fetched or written.** Autonomous live fetching
is disabled (see SOURCE_ACCESS_RESEARCH.md).

## Candidate set (CORPUS_TARGET_LIST.csv) — 23 seeds toward the 50–100 target
| Type | Count | Full-text decision |
|---|---|---|
| Primary legislation (incl. 1 historical version) | 13 | allow_full_text_dev_poc (verified seed) |
| Extension orders | 4 | allow_full_text_dev_poc (verified seed) |
| Official guidance (Labor / Equal-Opp / NII) | 4 | allow_metadata_only |
| Secondary discovery (Kol Zchut) | 2 | pointer_only |

The 23 are the P0/P1 backbone; reaching 50–100 means adding regulations
under each statute, more extension orders, and additional guidance/pointer
records — all from the same allowlisted official hosts.

## Permission decisions (SOURCE_PERMISSION_MATRIX.csv)
- Full text: only public-domain primary law (§6), and only via a lawful
  human-present or founder-provided channel — NOT autonomous scraping.
- Metadata-only: gov.il/NII guidance (access unclear / WAF-blocked).
- Pointer-only: Kol Zchut (editorial copyright — discovery use only).
- Rejected (autonomous): National Legislation DB, Reshumot, gov.il portals
  (restricted ToS / WAF). Commercial DBs: rejected outright.

## Blocking finding (critical ambiguity → founder decision required)
Every full-text source is restricted-ToS or WAF-blocked to datacenter IPs.
LawME must not bypass a WAF or mass-fetch a restricted portal. Therefore
the corpus CANNOT be populated by autonomous fetching. The sourcing channel
for the verified full-text seed is a **founder decision** (FOUNDER_REVIEW.md):
(A) human-present browser capture, (B) founder-provided official exports,
or (C) start metadata/pointer-only and defer full text.

Per the spec ("Do not ingest before the dry-run result is reviewed
internally; if critical ambiguity exists, stop and request founder
approval"), ingestion (Phase 11) is HELD pending that decision.

## Risk notes
- Version metadata for statutes requires the amendment history from the
  official source — must be captured at ingestion, not inferred.
- Effective dates for some orders may be unknown → recorded as unknown,
  never guessed.
- No duplicates expected in the seed (distinct statutes/orders).

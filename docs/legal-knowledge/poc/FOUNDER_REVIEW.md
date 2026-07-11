# Founder Review — Epic 1 POC (דיני עבודה)

**Status: awaiting founder review. Nothing committed, nothing pushed,
nothing applied remotely, nothing deployed.**

## What you're approving (or not) — the decision list

| # | Decision | Recommendation | Where to look |
|---|---|---|---|
| 1 | **Apply the first migration** to the dev Supabase project (`npx supabase db push`) | Approve — 23 tables, RLS-first, validated locally incl. 11 leakage tests | docs/database/LEGAL_INTELLIGENCE_POC_MIGRATION_REVIEW.md |
| 2 | **Commit + push Epic 1 work** | After your review of this doc set | final report in chat |
| 3 | **supremedecisions permission path** — pursue data agreement / verify robots from IL egress, or proceed with manually selected public samples | Start with manual public samples (lawful today), pursue the agreement in parallel | ingestion/adapters/supreme-decisions/ACCESS_RESEARCH.md |
| 4 | **Engage the employment lawyer** for gold-set validation (≈10-12h) | Approve — the benchmark is the steering wheel of everything next | benchmark/employment-law/expert-review-guide.md |
| 5 | **Hebrew embedding model selection** experiment (may involve paid API — separate approval) | Defer until after real corpus exists | POC_RETRIEVAL_DESIGN.md |
| 6 | **Israeli egress decision** for gov.il/Knesset fetching | Needed before slices 2-3 of the corpus | POC_SOURCE_SCOPE.md |

## What was proven (all runnable on your machine — POC_RUNBOOK.md)
- 73/73 tests green: ingestion contract, extraction with anchors,
  citation verification, hybrid retrieval, research engine, extractive
  answers, observability.
- 28/28 machinery benchmark — including one REAL bug the benchmark caught
  and we fixed (a text-normalization regex swallowing spaces).
- Migration applies cleanly on PG16+pgvector; RLS suite 11/11 — including
  cross-tenant leakage denial, global-corpus write denial, benchmark
  ground-truth protection, audit immutability.
- Case-number normalizer: 57 tests, 21 procedure codes, quote/hyphen/OCR
  noise tolerant, idempotent, deterministic search keys.

## What was NOT done (per your constraints — verified)
No mass ingestion (13 synthetic fixtures) · no remote migration · no
commercial access · no paid APIs (placeholder throws) · no UI · no
autonomous legal output (extractive-only, labeled "טיוטת מחקר — נדרשת
בדיקת עורך דין") · no deploy · no commit.

## Recommended order after your approval
1. Approve migration → apply to dev → bucket policies → `npm run db:types`
   → advisors check.
2. Commit/push Epic 1 (your call, as always).
3. Kick off lawyer gold-set validation in parallel with the
   supremedecisions permission path.
4. First lawful real-corpus slice (statutes + extension orders — clearly
   public) → re-run both benchmark layers → then judgments.

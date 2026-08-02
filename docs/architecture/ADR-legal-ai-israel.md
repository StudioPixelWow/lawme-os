# ADR: LEGAL AI ISRAEL — foundation on the existing repository

Status: Accepted (Phase 0/1). Date: 2026-07-26.

## Context

The founder specified a large system (LEGAL AI ISRAEL) with a Python/FastAPI/Redis/BullMQ monorepo, ~20-table document/citation/embedding schema, collectors for official Israeli court sources, hybrid search, and a RAG agent. The existing repository (`lawme-os`) is a **Next.js 16 / React 19 / TypeScript** app tested with **Node `node --test`** (type-stripping), Supabase/Postgres, and already contains a verified legal-corpus module and a lawful acquisition framework (`src/modules/legal-corpus/**`).

## Decision

**Extend the existing repository; do not fork a new monorepo in Phase 1.**

1. New code lives under `src/modules/legal-ai-israel/**`, reusing the established TypeScript + `node --test` conventions (union types, relative `.ts` imports, no enums, deep-frozen data). This preserves all existing functionality (994 tests green) and avoids a premature infra split.
2. **Python/FastAPI/Redis/BullMQ/OpenSearch are DEFERRED.** They are justified only when ingestion volume and NLP (OCR, embeddings, heavy parsing) actually require a separate service tier — i.e. after a Pilot proves lawful acquisition is even possible. Introducing them now would add operational surface with zero data to process.
3. **Postgres + pgvector + Postgres FTS** remain the search substrate (Phase 2+); OpenSearch only if FTS proves insufficient — matching the founder's own "OpenSearch only if PostgreSQL is not enough."
4. Migrations are authored locally and **not applied** to any remote project without founder approval (repo guardrail: remote DDL requires approval).

## Consequences

- Phase 1 ships: Source Registry schema + audit-support tables, the collector framework (disabled), and the case-number normalizer — all in-repo, all tested.
- Phase 2 (next): the full `legal_documents / document_sections / statutes / *_citations / judges / topics / parties` schema, text extraction + Hebrew normalization, and FTS/pgvector search.
- Phases 3–7 (collectors → search MVP → backfill → NLP → RAG) proceed per the founder's ordering, each gated on a passing Source Audit.

## Hard constraints carried forward

- Collectors are **disabled by default**; a DB CHECK (`collector_enable_requires_clearance`) forbids enabling one without an audited, non-restrictive mode and non-`unclear` access status.
- No scraping, no bypass of auth/paywall/CAPTCHA/rate-limits, no identity spoofing, no login for the public collector, no third-party editorial content — encoded in `collector/types.ts` constraints and the run guard.
- Official source is always canonical; third-party indexes (Tola'at Mishpat) are discovery-only and never authoritative for text.

## Environment limitation (recorded honestly)

This build environment **cannot reach the Israeli government sites** (fetches to `data.gov.il`, `unicourt.justice.gov.il`, court.gov.il returned empty/timeout). Therefore the **technical** Source Audit (robots.txt, live endpoints, sample documents, session/CAPTCHA probing) could not be completed here. Every source is left `automated_access_status = unclear` → collectors OFF, pending an operator-run technical audit from a network that can reach the sites. This is the safe default, not a blocker.

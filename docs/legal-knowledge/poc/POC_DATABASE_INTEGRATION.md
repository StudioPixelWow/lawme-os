# POC Database Integration (Epic 2 — what actually happened)

**Everything below was executed against the DEVELOPMENT project
udispadsbxqicmawqcuk on 2026-07-11, with founder approval. Production was
never touched.**

## Migrations applied (remote history ↔ repo files aligned)
| Version | Name | Content |
|---|---|---|
| 20260711173213 | legal_intelligence_poc_foundation | 23 tables, 40 policies, RLS 23/23, app helpers, extensions |
| 20260711174022 | legal_source_files_bucket | private bucket + 2 read policies |
| 20260711174702 | advisor_hardening | search_path pins, extensions→extensions schema, 5 initplan policy fixes, 8 FK indexes |

Post-apply verification: 23 tables · RLS 23/23 · 40 policies · 60 indexes
· 11 app functions · pgvector/pg_trgm/pgcrypto present · audit
immutability raises · anon policies = 0.

## Storage
`legal-source-files` bucket: private, 100MB cap, 5 MIME types, global/ +
organizations/<uuid>/ + fixtures/ prefixes, read policies membership-
checked, zero client write policies. (LEGAL_INTELLIGENCE_STORAGE_MODEL.md)

## Types
`src/types/database.types.ts` regenerated from the live schema (all 23
tables, relationships, vector→string, Json-safe). Typecheck green.
Reproducible via `npm run db:types` / Supabase MCP.

## Advisors
All WARNs fixed in 20260711174702; re-run → zero WARN; one intentional
INFO (service-only fetch telemetry). (LEGAL_INTELLIGENCE_SUPABASE_ADVISORS.md)

## Remote RLS
11/11 tests passed live, post-hardening, transactional, zero residue.
(LEGAL_INTELLIGENCE_REMOTE_RLS_VALIDATION.md)

## Fixture corpus seeded
13 synthetic documents → 13 versions · 13 texts · **68 sections
(anchors)** · 13 mock-embedding chunks · 13 fetch-provenance rows · 1
audit event. Deterministic UUIDs (sha256-derived) — **full re-apply
executed and verified: identical counts (idempotent)**. Every document:
`license_status='synthetic_fixture'`, `verification_status='unverified'`,
`authority_type='unknown'`, org NULL (global corpus).

## DB-backed retrieval (proven live)
Section-level FTS query for "פיצויי פיטורים / הרעה מוחשית" returned the
constructive-dismissal judgment first, with exact anchors
(`p:0001`, chars 193–354 — the סעיף 11(א) passage), joined document
metadata, ts_rank scores and deterministic ordering — one SQL round-trip.

## Research slice
`runDbResearch(repos, …)` — same engine contract over repositories:
controlled expansion → searchSections → hybrid decomposition (lexical
40 / mock-vector 25 / authority 18 / trust 10 / freshness 7) →
diversification → evidence with anchors + citations + warnings +
missing-source honesty → optional org-scoped persistence (session,
query, ranked results) → run record with correlationId.

## Environment variables (names only — values live in .env.local / Vercel)
| Name | Purpose | Scope |
|---|---|---|
| SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL | dev project URL | server / client |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | browser-safe key (RLS-gated) | client |
| SUPABASE_SECRET_KEY | service key — ingestion/seed/dev-interface reads | **server only, never committed, never logged** |
| LAWME_SEED_ENV | must equal `development` for seeding | CLI |
| LAWME_DEV_TOOLS | explicit dev-interface escape hatch | server |

## Honest limitations
- The Supabase-repository code path was exercised end-to-end through the
  in-memory twin (identical contract, 12 tests) and the DATABASE side was
  proven via live SQL; the supabase-js integration test exists and runs
  automatically when the founder's local env has the dev keys (it is
  skipped headlessly here because this environment holds no service key —
  by design).
- Mock vectors only; ANN indexing deferred until a real model is chosen.

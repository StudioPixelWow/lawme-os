# Maximum-Lawful Corpus Acquisition — Backlog & Slice 1 Record

Status: **Slice 1 implemented** (framework + registry + first open-official adapter + tests + local migration). No fabricated legal content. No source requiring credentials/payment/licence was connected.

## Legal footing (documented reuse basis)

- **Copyright Act 2007 §6** — *no copyright subsists in statutes, regulations, Knesset Protocols, and judicial decisions of courts or bodies with judicial authority.* → Official **full text** of legislation and judgments is lawfully ingestible from **official** sources.
- **National Legislation Database** (Knesset + Ministry of Justice, since 2014) — primary legislation full text and "as amended" versions, free and open.
- Commercial platforms (Nevo, Takdin) gate content behind paywalls and add **copyrighted editorial** material → `REQUIRES_LICENSE`; never bypass the paywall.
- Firm documents are tenant-owned → `FIRM_OWNED_FULL_TEXT`, isolated per tenant.

The HARD BOUNDARY is encoded as a pure function (`ladder.ts`): no bypass of auth, paywalls, access controls, rate limits, or technical protection measures — any such blocker forces a fall-back down the ladder (FULL_TEXT → STRUCTURED_METADATA → METADATA_AND_LINK → DISCOVERY_ONLY → BLOCKED).

## Registry coverage (this slice)

17 sources across all 11 workstreams (A–K). **15 immediately implementable** with no external approval; **2 STOP** (need a licence).

| Classification | Count |
|---|---|
| OPEN_OFFICIAL_FULL_TEXT | 10 |
| PUBLIC_METADATA | 3 |
| REQUIRES_LICENSE | 2 |
| DISCOVERY_ONLY | 1 |
| FIRM_OWNED_FULL_TEXT | 1 |

Records actually ingested into the shared corpus: **0 new** in this slice (the existing verified seed — D-NOTICE §1, D-MINWAGE §2, wage-rate instrument — is unchanged). The framework is ready; live ingestion is an operator step (below). **Nothing here is described as "complete."**

## Immediately implementable (no approval) — priority order

1. **Official/open legislation** — `il-knesset-legislation-db`, `il-reshumot-gazette` (FULL_TEXT, §6)
2. **Secondary + historical/amendments** — `il-secondary-regulations`, `il-historical-amendments` (FULL_TEXT, §6)
3. **Official/open legislative history** — `il-law-memoranda`, `il-knesset-protocols` (FULL_TEXT)
4. **Supreme Court + National Labour Court full text** — `il-supreme-court`, `il-national-labour-court` (FULL_TEXT, §6)
5. **Public judgment metadata + links** — `il-regional-labour-courts`, `il-district-admin-courts`, `il-magistrates-tribunals` (METADATA_AND_LINK; escalate to full text per-item where officially published)
6. **Regulator guidance** — `il-boi-guidance`, `il-isa-guidance` (FULL_TEXT, official publication)
7. **Discovery aid** — `il-kolzchut` (DISCOVERY_ONLY; never authority for a conclusion)
8. **Firm-uploaded documents** — `firm-owned-corpus` (FULL_TEXT, tenant-isolated)

## STOP — founder action required (do not connect without it)

| Source | Needs | Why |
|---|---|---|
| `il-nevo` (נבו) | Commercial licence + credentials | Paywalled; copyrighted editorial content. Until a licence is on file: link + public metadata only. |
| `il-takdin` (תקדין) | Commercial licence + credentials | Same. |

The underlying primary text on those platforms is §6-exempt, but their **access** is paywalled and their **editorial layer** is copyrighted — so we do not scrape them. If you want their coverage, provide a licence and I'll flip `licenseOnFile` and wire the licensed adapter interface (`J_licensed_providers`).

## What Slice 1 delivered (code)

- `acquisition/types.ts` — classification taxonomy, acquisition-mode ladder, `CanonicalSourceRecord` (full provenance field set), adapter contract.
- `acquisition/ladder.ts` — pure resolver enforcing the HARD BOUNDARY (never exceeds the lawful ceiling; blockers force fall-back).
- `acquisition/registry.ts` — 17 real Israeli sources, classified with lawful basis.
- `acquisition/adapter.ts` — first open-official adapter: holds full text only under a documented basis, hashes only held bytes, marks everything `discovery_only`, fabricates nothing.
- `acquisition/dedup.ts` — canonical-key dedup keeping the fullest lawful record.
- `acquisition/metrics.ts` — honest coverage metrics (registry vs actually ingested).
- `acquisition/__tests__/acquisition.test.ts` — 17 tests (ladder no-bypass, registry integrity, adapter gating, tenant isolation, dedup, metrics).
- `supabase/migrations/20260726120000_corpus_acquisition_records.sql` — additive `corpus.*` tables, RLS deny-by-default, tenant isolation, `full_text_requires_basis` constraint. **Local only — not applied.**

## Operator ingestion loop (how full text actually enters)

Because this environment must not scrape or bypass controls, live retrieval is an operator step, not an autonomous crawl:

1. Operator lawfully fetches items from an OPEN_OFFICIAL source (respecting robots/rate-limits).
2. Items are handed to `createOpenOfficialAdapter(source).acquire(items, ctx)` → canonical records at the highest lawful mode.
3. Editorial verification (existing `verification.ts`) upgrades a record from `discovery_only` to `verified` before it can support any legal conclusion.
4. `dedupeRecords` collapses cross-source duplicates; records persist via the (founder-approved) migration.

## Update schedule & currentness (design)

- Legislation "as amended": re-check on a scheduled cadence; bump `version` and set `currentness`/`valid_to` on supersession (never guessed).
- Judgments: append-only; treatment/overruling set only by editorial linkage.
- `last_checked_at` stamped on every pass; stale records are flagged, never silently trusted.

## Explicitly NOT done (honesty)

- No live crawling/scraping in this session.
- No new legal text ingested; no holdings, citations, or treatment invented.
- Migration not applied to any remote database.
- Licensed providers not connected.

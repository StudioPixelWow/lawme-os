# P1-S1 — Verified Legislation Release — Implementation Record

**Status:** Implemented in Development (local dev-server proof). Not pushed; remote DB migration not applied. Founder review pending.
**Parent:** [`P1_S1_VERIFIED_LEGISLATION_PLAN.md`](./P1_S1_VERIFIED_LEGISLATION_PLAN.md) · [`../DINO_MASTER_SPECIFICATION.md`](../DINO_MASTER_SPECIFICATION.md).

## Scope delivered
Exactly **D-NOTICE** and **D-MINWAGE**. No other doctrine reached conclusion-grade. No case law, drafting, document intelligence, hearing prep, or agents.

## Source strategy actually used
Gate A closed by founder authorization. Operative provisions were retrieved and editorially cross-checked against an authoritative Israeli legal-information source (Kol-Zchut) on 2026-07-25, and each version carries a `LegalVerificationRecord`. Only the **operative rule** is stored (short, faithful), never a full reproduction. The accessible link is a verified secondary source page (so citations show "אומת מול מקור משפטי מוסמך" and `officialBadge=false` — the link is not the official gazette). Lawful reuse basis: founder-confirmed (record ref `reuse-basis:founder-confirmed-2026-07`); no contract text committed.

## Ingested instruments (allowlisted)
- **D-NOTICE** — חוק הודעה לעובד ולמועמד לעבודה (תנאי עבודה והליכי מיון וקבלה לעבודה), התשס"ב-2002, **§1** (30-day written-notice duty; 7 days for a minor under 18).
- **D-MINWAGE** — חוק שכר מינימום, התשמ"ז-1987, **§2** (entitlement); plus a separate **rate instrument** version: **₪6,443.85/month, ₪35.40/hour, effective 1.4.2026**.

## Versioning, amendments, currentness
Each source has a versioned `LegalSourceVersion` with `effectiveDate`, `sourceTextHash`, permalink, and a verification record. `asOf` selection excludes future-effective and superseded versions. The minimum-wage **rate** is a separate versioned instrument with a **short re-verify cadence** (`reVerifyDueDate` 2026-10-01); once past it, the rate fails closed (`insufficient_coverage`) rather than answering stale. Historical `asOf` before 1.4.2026 does **not** apply the current rate — it returns an honest "no verified rate for that date". No amendment date is inferred; unknowns stay unknown.

## Verification workflow
A version is `verified` only via an explicit `LegalVerificationRecord` naming a real verifier with all fields checked. Being official is not sufficient (no auto-verify). Absent/expired/rejected/superseded ⇒ fail closed.

## Retrieval + reasoning integration
`answer.ts` builds the verified answer deterministically (bottom-line-first, claim→verified-citation, badges, coverage, copy/export). `canonical.ts` provides a drop-in `KnowledgeSourceAdapter` (`createVerifiedLegislationAdapter`) emitting verified `CanonicalSource` records for the two doctrines — **provided and unit-proven but deliberately NOT registered into `DEFAULT_ADAPTERS` this slice**, to keep the frozen research/reasoning/reasoned suites green. Flipping that registration is the one-line live-`/api/dino/ask` cutover (its own regression run) — the recommended immediate next step.

## Citation experience + badges + copy/export
Source cards with "מאומת" + authority ("מחייב") + "אומת מול מקור משפטי מוסמך", effective date, license-bounded excerpt, honest pinpoint statement (section as pinpoint; external link opens the source page, not the subsection — never a whole-doc-as-pinpoint). Legislation badges: **"מבוסס חקיקה מאומתת"** (approved) and the pending-case-law variant available. Copy citation / copy link / Word-compatible export block, all license-aware.

## Coverage
Per-doctrine `DoctrineCoverageRecord` (substantial / partial / insufficient — never "complete"). Presence of two verified doctrines never implies broader coverage; all other doctrines stay honest/out-of-scope.

## Benchmark result (release gate)
Seed benchmark of **30 cases** (15 D-NOTICE incl. 3 needs-facts + 2 distractor; 15 D-MINWAGE incl. historical/stale/future traps + needs-facts + 2 distractor). Each case run twice for determinism. **All hard gates G1–G9 = 100%; 0 failures; release not blocked.** Length/count not scored.

## Tests / regression
`corpus:foundation:test` = **34 pass** (22 foundation + 12 P1-S1). All prior suites green (workspace 11, intelligence 12, conversation 10, research 7, experience 9, reasoning 10, reasoned 13). typecheck ✓ · lint ✓ · production build ✓ · `capability1:freeze-check` ALL GATES PASSED.

## corpusVersion
`vlc-2026-07-25-p1s1`.

## Migration / Development status
Additive `vlc_*` migration `20260725120000_legal_corpus_foundation.sql` authored (foundation slice). The live proof uses the deterministic verified corpus seed via the dev route `/dev/legal-citation`. **No remote DB migration was applied** (the Supabase MCP read-only pin was respected); remote apply remains a separate founder-gated step. Production untouched. Nothing pushed.

## Known gaps
Case law remains discovery-only (out of scope). The accessible link is a verified secondary page, not an official-gazette deep-anchor (hence honest pinpoint + `officialBadge=false`). Only §1 (Notice) and §2 + rate (Minimum Wage) are ingested — the minimal set for the two covered questions.

## Beta/GA
Meets the Bar-A internal + toward Bar-B beta for these two doctrines with the "developing corpus" framing. Not GA (GA needs verified case law + broader provisions).

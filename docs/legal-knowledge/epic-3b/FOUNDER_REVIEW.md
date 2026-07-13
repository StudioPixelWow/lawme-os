# Epic 3B — Founder Review & Decision Request

**Status: foundation built and green; ingestion HELD at the dry-run gate
pending your decision. Nothing committed, nothing pushed, no database
write, no production touch.**

## What is done and verified
- Baseline confirmed at f08ff2f; full suite green (lint, typecheck, build,
  legal:poc 97/1-skip, dino 12/12, all 3 benchmarks pass).
- Real source research (live): Copyright Act §6 confirms the TEXT of
  statutes/regulations/orders/case-law is public domain; access research
  confirms every full-text portal is ToS-restricted (Knesset legislation
  DB, Reshumot) or WAF-blocked to datacenter IPs (gov.il orders/guidance).
- Permission review + matrix, corpus scope, allowlist/exclusions, adapter
  decisions, target list (23 real seeds), ingestion review workflow,
  dry-run report — all written.
- Code: legislation versioning + statute/section normalization (13 tests);
  extension-order domain model + applicability + versioning (7 tests);
  22-entry controlled employment-law vocabulary. Lint/typecheck clean.

## The decision (this is the fork the spec routes to you)
Autonomous ingestion is **not available** — I will not bypass a WAF or
mass-fetch a restricted portal, and there is no official bulk/API route for
the legislation text. How do you want the verified full-text seed sourced?

- **Option A — human-present browser capture.** I drive Claude-in-Chrome on
  your machine (residential IP reaches gov.il/Knesset) to open specific
  official statute/order pages one at a time; I extract verbatim text +
  canonical URL + version metadata and ingest each as verified_primary.
  Lawful, targeted, human-in-loop; slower (a handful per session).
- **Option B — founder-provided exports.** You download the official
  PDFs/HTML for the P0/P1 statutes+orders into an import folder; LawME
  ingests from disk with full provenance. Fastest to a real seed.
- **Option C — metadata/pointer first.** Ingest all candidates as
  metadata/pointer now (canonical URLs, version metadata, no full text),
  and add verified full text later via A or B. Lets Dino exercise
  source-planning/coverage/no-answer against real citations immediately,
  honestly reporting "full text pending".

My recommendation: **B for the ~13 P0/P1 statutes + 4 orders** (a real,
verifiable full-text core), plus **C for guidance/pointer records**. Then I
complete Phases 7–24 (import adapter, ingestion command with safeguards,
retrieval upgrade, Dino integration, real benchmark, dev-UI corpus
selector, security review) against that real seed.

## What I will NOT do without your say-so
Fetch from restricted/WAF portals · persist any editorial text · touch
production · apply a migration · use paid models · crawl case law · commit
or push.

Tell me A, B, or C (or a mix), and for B where you'll place the files.

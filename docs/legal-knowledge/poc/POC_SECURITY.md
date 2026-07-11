# POC Security Summary

Full threat model: `docs/security/LEGAL_INTELLIGENCE_POC_THREAT_MODEL.md`
(17 threats, control per threat, POC status, go-live gates).

## Implemented and TESTED in this task
- HTML sanitization before extraction (scripts/handlers stripped —
  poc.test.ts #5).
- Size caps: PDF 25MB, DOCX 20MB + 30MB uncompressed XML (zip-bomb),
  rawContent 5MB, DB byte_size CHECK.
- OCR never auto-invoked (test #6).
- RLS cross-tenant suite: 11/11 on local PG16 (T3 = the leakage test).
- Run-log secret rejection (test #16).
- No network code path exists anywhere in the POC (structural SSRF
  immunity for now); paid-API placeholder throws.
- Fixture honesty: fixtures cannot claim verified status (validator
  error, tested).

## Structural decisions
- Extractive-only answers = prompt-injection resistance by architecture.
- Adapters allowlisted by registry source_id — no arbitrary-URL ingestion.
- Canonical URLs set by adapter config, never from document content.
- Global corpus writable only via service_role (bypasses RLS server-side
  only); clients have no write policy to any global table.

## Gates before real ingestion
Host allowlist + private-IP deny in the fetch layer · bucket policies at
migration apply · parser sandboxing decision · anomaly monitoring for
ranking · re-run threat model against the live adapter.

## Secrets posture (unchanged from Epic 0)
No secrets in the repo (env:check + appsec scanner green); `.mcp.json`
credential-free; service-role key stays in Vercel server scope/vault —
never client, never git, never logs (recorder enforces).

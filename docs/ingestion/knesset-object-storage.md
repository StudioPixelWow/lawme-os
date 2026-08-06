# Knesset Object Storage (official PDF binaries)

`publication/object-storage.ts` + `legalai.stored_objects` — content-addressed,
deduplicated, verifiable storage for the official ספר-החוקים PDF binaries.
**PDF bytes live in object storage, never in Postgres.** Version
`legal-object-store-1`. Artifact: `artifacts/knesset-storage-verification.json`.

## Infrastructure (reused, not parallel)

Existing private Supabase Storage bucket **`legal-source-files`** (`public=false`,
created 2026-07-11) is reused — no new storage system was created.

## Deterministic, content-addressed key

```
knesset/laws/<IsraelLawID>/publications/<publicationItemId>/<sha256>.pdf
```

The key embeds the SHA-256, so identical bytes collapse to one object. An omnibus
publication shared by several laws is stored **once**; publications reference the
object **many-to-one**. `objectKey()` validates inputs (numeric IsraelLawID,
64-hex sha) — an external filename is never used as the key.

## Metadata (`legalai.stored_objects`, additive, RLS deny-by-default)

One row per distinct `sha256`: `bucket, object_key, size_bytes, content_type,
storage_status, storage_version, ref_count, uploaded_at, verified_at,
license_basis, provenance`. Status machine:
`pending → uploaded → verified` (or `failed` / `quarantined`).

## Idempotency, dedup, verification (unit-tested)

- `storePdf()` computes the sha, skips the upload if the key already exists
  (dedup), then verifies. Re-storing identical bytes is a no-op.
- **Round-trip verification:** HEAD (size + `application/pdf`) then GET and
  compare byte-for-byte (content-addressed → hash compare). A wrong-size or
  altered object fails verification (corruption caught).
- `expectedSha256` mismatch → `quarantined`, never uploaded.
- Tests: `__tests__/object-storage.test.ts` (key/dedup/quarantine/corruption).

## Access policy (deny-by-default)

Bucket is private and has **no permissive `storage.objects` policy** → non
service-role access is denied by default. Service role uploads/reads; users
receive a **signed URL only through a reviewed backend path**; no public listing,
no direct client write.

## Current state + the honest blocker

31 distinct binaries are **registered** (`stored_objects`, `storage_status =
pending`) and every publication carries its `pdf_object_key`. **0 are uploaded /
verified.** The physical byte upload is the operator step: it requires the
storage **service key** *and* a network path to `fs.knesset.gov.il` for the
bytes. This session's container is air-gapped from `fs.knesset.gov.il`, and the
browser that carried the extraction cannot authenticate to storage without
exposing the service key — so the upload cannot run here.

**Storage gate: NOT_GO** (upload success 0% < 100%). Retention/dedup rule for
when it runs: a shared binary is kept while any publication references it
(`ref_count > 0`); no hard delete without an explicit policy.

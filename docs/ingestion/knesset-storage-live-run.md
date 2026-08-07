# Knesset Object Storage — Live Run (COMPLETED)

Date: 2026-08-07. Attempt to execute the physical PDF byte upload (Epic:
"Upload Existing Knesset PDFs to Object Storage"). Artifact:
`artifacts/knesset-storage-live-verification.json`.

## Environment probe (concrete, not assumed)

| Check | Result |
|---|---|
| Dev project (`udispadsbxqicmawqcuk`) confirmed via `.env.local` URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` present in `.env.local` (env-loaded, never printed) | ✅ |
| Container → `fs.knesset.gov.il` (PDF bytes) | ❌ `403 CONNECT tunnel failed` |
| Container → Supabase Storage endpoint | ❌ `403 CONNECT tunnel failed` |
| Browser (on fs.knesset.gov.il) holds the 31 PDF bytes | ✅ |
| Browser can authenticate to the private bucket | ❌ |

**Why the upload cannot run in-session:** no single available environment holds
BOTH network paths (byte source + storage) together with credentials. The
sandbox container has the service-role key but its egress proxy blocks *both*
`fs.knesset.gov.il` and `supabase.co`. The Claude-in-Chrome browser has the PDF
bytes (same-origin on fs.knesset.gov.il) but cannot authenticate to the private
bucket — and injecting a service-role key into a page running on a third-party
origin is prohibited (it would expose the key to that origin's scripts; platform
rules also forbid entering API keys/tokens into page fields). `device_bash` on
the user's machine has no network. So the physical upload is genuinely an
operator step, now proven with the probe above rather than asserted.

## Turnkey runner (built this pass)

Rather than hand-wave the operator step, the upload is packaged as a single
command that does the whole thing correctly:

```
node --env-file=.env.local --experimental-strip-types tools/legal-ingest/upload-pdfs.ts
```

- `tools/legal-ingest/upload-pdfs.ts` — reads the 31 `pending` `stored_objects`,
  resolves each source URL from `law_publications`, and per object:
  SSRF-guarded fetch (`pdf-fetch.ts`: HTTPS-only, host allowlist, timeout, max
  redirects/size, content-type + `%PDF-` magic, **no retry on 403/404/429**) →
  SHA-256 vs the **registered** hash (mismatch → `quarantined`, never uploaded) →
  content-addressed upload (dedup; no overwrite) → HEAD + full byte round-trip →
  `stored_objects.storage_status = verified` (+ `uploaded_at`/`verified_at`).
  Bounded concurrency 2. Idempotent (verified objects skipped; same SHA a no-op).
- `object-storage-supabase.ts` — the `StorageClient` adapter over
  `@supabase/supabase-js` `.storage.from('legal-source-files')`. The service-role
  key is read from env, never embedded/logged/shipped to the browser; not
  imported into any browser bundle.

Run environment must have network to `fs.knesset.gov.il` + the dev Supabase
project and the service-role key (the repo's `.env.local` already targets the
authorized dev project). After it runs, `stored_objects` flips to `verified`,
Storage reaches GO, and the reprocess-from-storage + controlled backfill unblock.

## Result (operator run 2026-08-07)

```
uploaded 31 · verified 31 · quarantined 0 · checksum_mismatch 0 · failed 0 · bytes 7,652,966
```

Dev confirms: 31/31 `stored_objects.storage_status = verified` (verified_at set),
31 files under `knesset/` in the private bucket `legal-source-files`
(`public=false`), 7,652,966 bytes exact, 0 duplicates, 0 published. Round-trip
PASS (each object re-downloaded and re-hashed against the source SHA-256).

Config applied to dev to enable the runner: `legalai` exposed to PostgREST
(`pgrst.db_schemas`) + `usage`/table grants to `service_role` (RLS unchanged,
still deny-by-default for anon/authenticated).

**Storage gate: GO → overall GO.**

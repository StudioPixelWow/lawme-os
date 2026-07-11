# LawME — Legal Intelligence Storage Model (Epic 2, Phase 4)

**Bucket:** `legal-source-files` — created on the DEVELOPMENT project only
(udispadsbxqicmawqcuk), migration `20260711174022_legal_source_files_bucket`.
No other buckets were created.

## Configuration (verified post-create)
| Setting | Value |
|---|---|
| Visibility | **private** (`public = false`) — no anonymous reads |
| File-size limit | 100MB (104857600 — matches `legal_document_files.byte_size` CHECK) |
| Allowed MIME types | pdf · html · plain text · docx · json (exactly the extractor set) |

## Path model
```
legal-source-files/
  global/<source_registry_code>/<document_id>/<version>/<filename>   ← global public corpus (service-written)
  organizations/<organization_id>/<document_id>/<version>/<filename> ← firm-private (service-written)
  fixtures/<fixture_key>/<filename>                                  ← synthetic POC fixtures only
```
The second path segment of `organizations/…` IS the organization UUID —
the storage policy parses it and enforces membership, so paths are not
merely obscure, they are policy-checked. Guessing a path gains nothing
without membership.

## Access policies (on storage.objects)
| Actor | global/ + fixtures/ | organizations/<org>/ | writes |
|---|---|---|---|
| anon | ❌ (no policy) | ❌ | ❌ |
| authenticated | ✅ read | read only if `app.is_org_member(<org>)` | ❌ (no policy) |
| service_role (server ingestion) | ✅ (RLS bypass) | ✅ | ✅ — the ONLY write path |

- **No direct browser writes exist** — uploads go through the server-side
  ingestion path exclusively.
- Downloads for authorized users use **signed URLs with expiry** (default
  60s–1h) generated server-side; raw object URLs are never exposed.
- `legal_document_files` rows reference `(storage_bucket, storage_path)`
  with a uniqueness constraint + sha256 — DB row and object stay paired.

## Rules honored (Phase-4 checklist)
Development project only ✅ · private ✅ · no anonymous reads ✅ ·
controlled MIME ✅ · controlled size ✅ · no browser writes ✅ ·
service-only ingestion writes ✅ · tenant-aware org paths ✅ · global
corpus under a distinct prefix ✅ · fixtures isolated under fixtures/ ✅ ·
no production files, no client documents ✅ · no unrelated buckets ✅.

## POC note
The 13 synthetic fixtures are seeded with their content in
`legal_document_text` (store_full policy); mirroring the original HTML
bodies into `fixtures/` object storage is optional for the POC and off by
default — the seed records `legal_document_files` rows only when objects
are actually uploaded, never as dangling references.

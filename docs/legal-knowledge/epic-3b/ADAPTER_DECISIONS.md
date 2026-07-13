# Adapter Decisions (Epic 3B, Phase 4/7)

Reuse the existing provider-neutral ingestion framework
(`src/modules/legal-knowledge/ingestion`). Do NOT duplicate it.

## Decision: import-from-disk + human-present, NOT autonomous crawl
Because every full-text employment source is restricted-ToS or WAF-blocked
to datacenter IPs, Epic 3B adapters are **fixture/import-backed**:

1. **StatuteImportAdapter** — reads an official statute/regulation text
   file (HTML/PDF/plain) placed under an import directory by the founder
   (or captured via a human-present browser session), normalizes, sections,
   anchors, and records canonical URL + provenance. NO network.
2. **ExtensionOrderImportAdapter** — same, for extension orders, plus the
   extension-order domain model (sector/coverage/applicability/versioning).
3. **MetadataPointerAdapter** — records canonical URL + publisher + type +
   version metadata for sources whose full text is not persisted
   (guidance, NII, Kol Zchut discovery). No full text.

Each implements the full `LegalSourceAdapter` contract (discover,
fetchMetadata, fetchDocument, normalize, validate, getCanonicalUrl,
calculateHash, classifyAccess, mapToUnifiedSchema) so a live transport can
replace the import transport later WITHOUT changing consumers — identical
to the Epic 1 supremedecisions pattern.

## Safeguards carried by the ingestion command (Phase 8)
host allowlist · MIME validation · file-size cap · no redirects off-host ·
permission gate (no full text unless allow_full_text_dev_poc) · max-doc
limit · APP_ENV + project-ref assertion · dry-run · metadata-only mode ·
idempotent hash dedup · audit events. The command REFUSES production, any
non-allowlisted host, permission-required full text, and any count above
the approved maximum.

## Explicitly deferred
No live HTTP adapter is enabled. A future `*LiveAdapter` may be added
behind the same interface ONLY after the founder resolves the ToS/access
position and an official API or licensed feed is available.

# Pillar A — Legislation Foundation (Epic 3B Triad)

Real, version-certain records captured from the National Legislation
Database (official, human-present browser):

| Law | Permalink | In force | Last amendment |
|---|---|---|---|
| חוק פיצויי פיטורים, התשכ"ג-1963 | laws/2001162 | תקף | 2025-01-30 |
| חוק עבודת נשים, התשי"ד-1954 | laws/2001135 | תקף | 2026-03-31 |
| חוק הודעה מוקדמת לפיטורים ולהתפטרות, התשס"א-2001 | laws/2000283 | תקף | 2014-07-15 |

Stored under `real-metadata/`. Supporting code: legislation versioning +
normalization (`legislation/`, 13 tests) and the extension-order model
(`extension-orders/`, 7 tests). Two-layer design: version-certain official
METADATA now; consolidated section TEXT layered later (founder-supplied or
clearly-labeled). Legislation is ONE parallel workstream — not the whole
epic.

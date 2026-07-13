# Extension Order Model (Epic 3B, Phase 6)

Module: `src/modules/legal-knowledge/extension-orders` (+ __tests__, 7 tests).

## Domain type (types.ts)
`ExtensionOrder`: orderId · titleHe · scope (general|sectoral) · sectorHe ·
coverageHe · geographicScopeHe · employee/employerCategories ·
relatedCollectiveAgreement · publication/effective/expiration dates ·
replacementOrderId · supersededByOrderId · amendments[] ·
applicabilityNotesHe · officialSourceUrl · publisherHe · verificationStatus.
Plus `OrderSection` with exact anchors (anchorKey, charStart/charEnd).

## Applicability (applicability.ts)
`evaluateApplicability(order, {sectorHe, asOf, employeeCategoryHe})` →
{applies: yes|no|uncertain, reasonHe, limitationsHe[], temporalOk, scopeOk}.
HARD RULE: limitations are never hidden. A sectoral order without a sector
query → uncertain (not "applies"); an unverified order is never a confident
"applies"; a superseded order surfaces a version limitation; out-of-window
→ no.

## Normalization + versioning (normalize.ts)
`normalizeOrderName` strips "צו הרחבה" + year suffix for stable keys.
`resolveCurrentOrder(orders, todayIso)` walks the replacement chain and
returns the single active verified order, or null with a reason when the
chain is ambiguous or all are superseded/unverified.

## Schema note
The existing legal_documents schema represents an extension order as a
document with documentType='order'; the richer applicability fields
(sector, coverage, replacement chain) are carried in the normalized
metadata JSON. If first-class columns are later required, a migration
would be PREPARED (RLS-first, rollback, global-corpus scoped) and NOT
applied without founder review. No migration is applied in this phase.

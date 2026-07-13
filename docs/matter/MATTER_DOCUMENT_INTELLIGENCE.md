# Matter Document Intelligence (Epic 4)

Engine: `matter-document` · `src/modules/matter/engines/document.ts`

## Question

Does the matter hold the documents it needs for its current stage? Documents
required for the current stage but absent block advancement and are surfaced as
`high` gaps; other absent documents are `low` notices.

## Logic

- A `MatterDocument` carries `requiredForStage` (a stage kind) and `present`.
- The engine matches documents whose `requiredForStage` equals the current
  stage kind. Missing ones → `high` `what_is_missing` findings + a
  `prepare-document` action.
- Documents absent but not required for the current stage → `low` findings.
- `score`: when the stage requires documents, it is stage-present / stage-
  required; otherwise it is overall present / total (1.0 when there are no
  documents).
- `requiresHumanReview` when a stage-required document is missing.

## Boundary

This engine tracks *possession and stage-fit*. Drafting the document, and the
authority requiring it, belong to the Procedure Graph and to human lawyers; the
engine does not generate legal documents.

# Legislation Citation Contract

`src/modules/legal-ai-israel/ingestion/legislation/citation-contract.ts`. Every
future RAG answer must cite; this defines the payload and the serving gate.

## Mandatory citation payload

`lawTitle · sectionNumber · version · sourceUrl · sourceDocumentId ·
lastVerified · chunkId · sourceSpan{start,end}`.

## Serving gate (`gateChunkForServing`)

A chunk may back an answer ONLY if it is **published**, **license-allowed**,
**provenance-complete**, **not quarantined**, the **current (or requested)
version**, and carries a **complete citation**. Any failure → not servable, with
reasons. `allResultsCited(results)` is true only when every retrieved chunk
passes the gate — the invariant the RAG layer will enforce before generating any
answer (a legal answer without a verifiable source is never served).

Verified on dev: all persisted legislation chunks satisfy the contract
(`citation_contract_complete = true`).

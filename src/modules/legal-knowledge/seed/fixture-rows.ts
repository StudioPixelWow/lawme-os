/**
 * Fixture → database rows (Epic 2, Phase 9).
 * Pure, deterministic transformation of the 13 synthetic fixtures into
 * row sets for every relevant table. Deterministic UUIDs (sha256-derived)
 * make re-seeding idempotent: same fixture → same ids → upsert no-ops.
 */
import { createHash } from "node:crypto";
import { loadPocCorpus } from "../corpus/load.ts";
import type {
  DocumentTextRow, DocumentVersionRow, LegalDocumentRow, LegalSourceRow,
  SectionRow,
} from "../repositories/types.ts";

export const SEED_PARSER_VERSION = "poc-seed-0.2.0";
export const SEED_EMBEDDING = { model: "mock/trigram-hash", modelVersion: "1.0.0", dims: 256 };

/** Deterministic UUID v4-shaped id from a namespace + key (sha256-based). */
export function deterministicUuid(namespace: string, key: string): string {
  const h = createHash("sha256").update(`lawme-poc:${namespace}:${key}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "4" + h.slice(13, 16),                       // version nibble
    ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20), // variant
    h.slice(20, 32),
  ].join("-");
}

export interface SeedEmbeddingRow {
  versionId: string;
  chunkIndex: number;
  anchorKey: string;
  model: string;
  modelVersion: string;
  dims: number;
  values: number[];
  norm: number;
}

export interface SeedRows {
  sources: Array<Omit<LegalSourceRow, "id"> & { id: string }>;
  documents: LegalDocumentRow[];
  versions: DocumentVersionRow[];
  texts: DocumentTextRow[];
  sections: Array<SectionRow & { versionId: string }>;
  embeddings: SeedEmbeddingRow[];
  fetches: Array<{ id: string; sourceId: string; documentId: string; url: string; sha256: string; parserVersion: string }>;
}

export async function buildSeedRows(): Promise<SeedRows> {
  const corpus = await loadPocCorpus();

  const sourceId = deterministicUuid("source", "LSR-038");
  const sources: SeedRows["sources"] = [{
    id: sourceId,
    registryCode: "LSR-038",
    nameEn: "Supreme Court decisions database (POC fixture channel)",
    nameHe: "מאגר פסקי הדין של בית המשפט העליון (ערוץ fixtures ל-POC)",
    url: "https://supremedecisions.court.gov.il",
    category: "A-judicial",
    trustTier: 1,
    priority: "P0",
    ragPermission: "unknown",
    accessPolicy: "metadata_only", // live access unresolved — fixtures only
    isActive: true,
  }];

  const rows: SeedRows = { sources, documents: [], versions: [], texts: [], sections: [], embeddings: [], fetches: [] };

  for (const d of corpus.documents) {
    const documentId = deterministicUuid("document", d.id);
    const versionId = deterministicUuid("version", `${d.id}:1`);

    rows.documents.push({
      id: documentId,
      organizationId: null, // global corpus (synthetic)
      sourceId,
      documentType: d.doc.documentType,
      authorityType: "unknown",            // never invented pre-verification
      verificationStatus: "unverified",    // fixtures may NEVER be verified_primary
      title: d.doc.title,
      titleHe: d.doc.titleHe,
      caseNumberRaw: d.doc.caseNumberRaw,
      caseNumberNormalized: d.doc.caseNumberNormalized,
      procedureCode: d.doc.procedureCode,
      court: d.doc.court,
      legalDomains: d.doc.legalDomains,
      documentDate: d.doc.documentDate,
      versionDate: d.doc.versionDate,
      effectiveDate: d.doc.effectiveDate,
      language: d.doc.language,
      canonicalSourceUrl: d.doc.canonicalSourceUrl,
      licenseStatus: "synthetic_fixture",  // clearly marked synthetic
      storagePolicy: "store_full",
      latestVersion: 1,
    });

    rows.versions.push({
      id: versionId,
      documentId,
      version: 1,
      contentHash: d.doc.provenance.sha256,
      parserVersion: SEED_PARSER_VERSION,
    });

    rows.texts.push({
      versionId,
      extractedText: d.extraction.originalText,
      normalizedText: d.extraction.normalizedText,
      extractionMethod: d.extraction.extractor,
      extractionConfidence: d.extraction.confidence,
      ocrStatus: "not_required",
      language: "he",
      warnings: d.extraction.warnings,
    });

    for (const b of d.extraction.blocks) {
      rows.sections.push({
        id: deterministicUuid("section", `${d.id}:1:${b.anchorKey}`),
        versionId,
        sectionIndex: b.index,
        kind: b.kind,
        anchorKey: b.anchorKey,
        headingPath: b.headingPath,
        pageNumber: b.pageNumber,
        charStart: b.charStart,
        charEnd: b.charEnd,
        content: b.text,
      });
    }

    d.chunks.forEach((chunk, i) => {
      const vec = d.chunkVectors[i];
      rows.embeddings.push({
        versionId,
        chunkIndex: chunk.chunkIndex,
        anchorKey: chunk.anchorKey,
        model: SEED_EMBEDDING.model,
        modelVersion: SEED_EMBEDDING.modelVersion,
        dims: SEED_EMBEDDING.dims,
        values: vec.values.map((v) => Number(v.toFixed(6))),
        norm: Number(vec.norm.toFixed(6)),
      });
    });

    rows.fetches.push({
      id: deterministicUuid("fetch", `${d.id}:1`),
      sourceId,
      documentId,
      url: d.doc.canonicalSourceUrl ?? `fixture:${d.id}`,
      sha256: d.doc.provenance.sha256,
      parserVersion: SEED_PARSER_VERSION,
    });
  }

  return rows;
}

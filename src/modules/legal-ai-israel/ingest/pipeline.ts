/**
 * Offline file-ingestion pipeline (LEGAL AI ISRAEL — Phase 2).
 *
 * A pure, DB-free orchestration over the parser/segmenter/extractors/quality
 * gates. It runs on operator-provided PUBLIC files (no remote collector, no
 * network). Idempotent: the same bytes always yield the same document id/hash.
 * The document is left UNPUBLISHED until the quality gates pass.
 */
import { createHash } from "node:crypto";
import { validateFile } from "../parser/filetype.ts";
import { normalizeHebrewLegalText } from "../parser/hebrew-normalize.ts";
import { segmentDocument, chunkSections } from "../parser/segment.ts";
import type { DocumentSection, RetrievalChunk } from "../parser/segment.ts";
import { extractCitations } from "../citation/extract.ts";
import type { CitationMatch } from "../citation/extract.ts";
import { extractStatuteCitations } from "../citation/statute.ts";
import type { StatuteCitation } from "../citation/statute.ts";
import { evaluatePublishGates } from "../quality/gates.ts";
import type { GateResult } from "../quality/gates.ts";

export interface IngestInput {
  sourceCode: string;
  filename: string;
  bytes: Uint8Array;
  /** Text layer, if already extracted by the operator (PDF/DOCX handled upstream). */
  extractedText: string;
  sourceUrl: string | null;
  operatorAffirmsPublicAndLawful: boolean;
  sourceAccessApproved: boolean;
  parserConfidence: number;
}

export class OperatorAffirmationRequiredError extends Error {
  constructor() { super("operator must affirm the file is public and lawfully obtained"); this.name = "OperatorAffirmationRequiredError"; }
}
export class UnsupportedFileError extends Error {
  readonly reasonHe: string;
  constructor(reasonHe: string) { super(reasonHe); this.name = "UnsupportedFileError"; this.reasonHe = reasonHe; }
}

export interface IngestReport {
  documentId: string;
  sha256: string;
  fileType: string;
  sectionCount: number;
  chunkCount: number;
  citationCount: number;
  statuteCount: number;
  gate: GateResult;
  status: "unpublished_pending_review" | "unpublished_gate_failed";
  transformsApplied: number;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Deterministic document id derived from source + content hash (idempotent). */
export function deriveDocumentId(sourceCode: string, sha256: string): string {
  return `${sourceCode}:${sha256.slice(0, 16)}`;
}

/**
 * Full parsed artifacts of a single ingest. `ingestFile` returns only the
 * summary counts (`report`); persistence needs the actual sections/citations,
 * so `buildIngestArtifacts` exposes them. Same pure pipeline, no DB, no network.
 */
export interface IngestArtifacts {
  documentId: string;
  sha256: string;
  fileType: string;
  normalizedText: string;
  transformsApplied: number;
  sections: DocumentSection[];
  chunks: RetrievalChunk[];
  citations: CitationMatch[];
  statutes: StatuteCitation[];
  gate: GateResult;
  report: IngestReport;
}

export function buildIngestArtifacts(input: IngestInput): IngestArtifacts {
  if (!input.operatorAffirmsPublicAndLawful) throw new OperatorAffirmationRequiredError();

  const validation = validateFile(input.bytes);
  if (!validation.accepted) throw new UnsupportedFileError(validation.reasonHe ?? "פורמט לא נתמך");

  const sha256 = sha256Hex(input.bytes);
  const documentId = deriveDocumentId(input.sourceCode, sha256);

  const norm = normalizeHebrewLegalText(input.extractedText);
  const sections = segmentDocument(norm.normalizedText);
  const chunks = chunkSections(documentId, sections);
  const citations = extractCitations(norm.normalizedText);
  const statutes = extractStatuteCitations(norm.normalizedText);

  const gate = evaluatePublishGates({
    sourceUrl: input.sourceUrl,
    hasProvenance: input.sourceUrl !== null,
    originalSha256: sha256,
    extractedText: norm.normalizedText,
    publicationStatus: "public",
    sourceAccessApproved: input.sourceAccessApproved,
    removedAtSource: false,
    parserConfidence: input.parserConfidence,
    canonicalDedupPending: false,
    looksLikeCaptcha: false,
    looksLikeLogin: false,
    looksLikeError: false,
  });

  const report: IngestReport = {
    documentId,
    sha256,
    fileType: validation.type,
    sectionCount: sections.length,
    chunkCount: chunks.length,
    citationCount: citations.length,
    statuteCount: statutes.length,
    gate,
    status: gate.publishable ? "unpublished_pending_review" : "unpublished_gate_failed",
    transformsApplied: norm.transforms.length,
  };

  return {
    documentId, sha256, fileType: validation.type,
    normalizedText: norm.normalizedText, transformsApplied: norm.transforms.length,
    sections, chunks, citations, statutes, gate, report,
  };
}

export function ingestFile(input: IngestInput): IngestReport {
  return buildIngestArtifacts(input).report;
}

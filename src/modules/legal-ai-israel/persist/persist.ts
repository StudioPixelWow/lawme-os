/**
 * LEGAL AI ISRAEL — persistence for downloaded PUBLIC judgments (Phase 3).
 *
 * Writes an ingested judgment + its parsed artifacts into the `legalai.*` schema
 * and the original file into Storage. Two safety properties:
 *   1. DEDUP — keyed on (source, sha256). A judgment already stored is SKIPPED,
 *      so re-running the collector never creates duplicates and is resumable.
 *   2. UNPUBLISHED — documents are written with status 'ingested_unverified'
 *      (never 'published'); publishing stays a separate admin action, and the
 *      RLS public read policy only exposes 'published' rows. A document whose
 *      quality gate detected a publication-restriction notice ("איסור פרסום")
 *      is NOT stored at all — we never persist confidential text.
 *
 * All DB access is behind the LegalaiStore interface, so this module is a pure,
 * offline-testable orchestration. The Supabase-backed adapter (service-role,
 * dev only) lives in ./supabase-store.ts and reads credentials from the
 * operator's environment — never from committed code.
 */
import type { IngestArtifacts } from "../ingest/pipeline.ts";

/** Metadata surfaced from the source listing / document header. */
export interface JudgmentMetadata {
  caseNumberRaw: string | null;
  caseNumberNormalized: string | null;
  courtName: string | null;
  courtLevel: string | null;
  proceedingType: string | null;
  decisionDate: string | null; // ISO date (YYYY-MM-DD) or null
  documentType: string; // e.g. "החלטה" | "פסק-דין"
  title: string | null;
  partiesDisplay: string | null;
  publicationRestrictions: string[];
}

export interface PersistInput {
  sourceCode: string;
  sourceUrl: string;
  mimeType: string;
  bytes: Uint8Array;
  artifacts: IngestArtifacts;
  metadata: JudgmentMetadata;
}

export interface PersistResult {
  documentId: string | null; // DB uuid (null when skipped without a row)
  sha256: string;
  skipped: boolean;
  reason: "new" | "duplicate" | "restricted";
}

// ---- Row shapes written to the schema (see the two applied migrations) ------

export interface DocumentRow {
  source_id: string;
  source_document_id: string;
  source_url: string;
  document_type: string;
  case_number_raw: string | null;
  case_number_normalized: string | null;
  court_name: string | null;
  court_level: string | null;
  proceeding_type: string | null;
  decision_date: string | null;
  publication_status: string;
  publication_restrictions: string[];
  original_sha256: string;
  original_storage_path: string | null;
  original_mime_type: string;
  original_size_bytes: number;
  raw_text: string;
  normalized_text: string;
  title: string | null;
  parties_display: string | null;
  language: string;
  extraction_method: string;
  extraction_confidence: number;
  parser_version: string;
  source_metadata: Record<string, unknown>;
  derived_metadata: Record<string, unknown>;
  status: string;
}

export interface SectionRow {
  document_id: string;
  section_index: number;
  section_type: string;
  heading: string | null;
  text: string;
  normalized_text: string;
  token_count: number;
  parser_version: string;
}

export interface CaseCitationRow {
  citing_document_id: string;
  cited_case_number_raw: string;
  cited_case_number_normalized: string;
  citation_text: string;
  treatment: string;
  resolution_status: string;
}

export interface StatuteCitationRow {
  document_id: string;
  citation_text: string;
  normalized_citation: string | null;
  extraction_method: string;
  confidence: number;
}

export interface DocumentSourceRow {
  document_id: string;
  source_id: string;
  source_document_id: string;
  source_url: string;
  sha256: string;
  is_official: boolean;
  is_canonical: boolean;
  storage_path: string | null;
}

export interface DocumentVersionRow {
  document_id: string;
  version_number: number;
  source_url: string;
  storage_path: string | null;
  mime_type: string;
  sha256: string;
  size_bytes: number;
  is_current: boolean;
}

export interface WindowKey {
  sourceId: string;
  courtName: string | null;
  proceedingType: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface WindowRow {
  source_id: string;
  court_name: string | null;
  proceeding_type: string | null;
  date_from: string | null;
  date_to: string | null;
  cursor: string | null;
  status: string;
  results_count: number;
  discovered_count: number;
  downloaded_count: number;
  completed: boolean;
}

/** The narrow DB surface persistence needs. The real adapter is service-role. */
export interface LegalaiStore {
  getSourceIdByCode(code: string): Promise<string | null>;
  findDocumentBySha(sourceId: string, sha256: string): Promise<string | null>;
  uploadOriginal(path: string, bytes: Uint8Array, mimeType: string): Promise<string>;
  insertDocument(row: DocumentRow): Promise<string>; // returns new uuid
  insertSections(rows: SectionRow[]): Promise<void>;
  insertCaseCitations(rows: CaseCitationRow[]): Promise<void>;
  insertStatuteCitations(rows: StatuteCitationRow[]): Promise<void>;
  upsertDocumentSource(row: DocumentSourceRow): Promise<void>;
  insertVersion(row: DocumentVersionRow): Promise<void>;
  getWindowStatus(key: WindowKey): Promise<string | null>;
  upsertWindow(row: WindowRow): Promise<void>;
}

export class UnknownSourceError extends Error {
  constructor(code: string) {
    super(`unknown legalai source code: ${code}`);
    this.name = "UnknownSourceError";
  }
}

function storageExtension(fileType: string): string {
  if (fileType === "pdf") return "pdf";
  if (fileType === "docx") return "docx";
  return "html";
}

/** Cheap token estimate: whitespace-delimited runs. */
function tokenCount(text: string): number {
  const t = text.trim();
  return t.length === 0 ? 0 : t.split(/\s+/).length;
}

/**
 * Persist a single downloaded judgment. Idempotent per (source, sha256):
 * a duplicate is skipped, a restricted document is refused, otherwise the
 * document + sections + citations + source copy + version are written and the
 * original is uploaded to Storage. Never publishes.
 */
export async function persistJudgment(
  store: LegalaiStore,
  input: PersistInput,
): Promise<PersistResult> {
  const { artifacts, metadata } = input;
  const sha256 = artifacts.sha256;

  // Refuse to store anything the gate flagged as publication-restricted.
  if (artifacts.gate.restrictionHits.length > 0) {
    return { documentId: null, sha256, skipped: true, reason: "restricted" };
  }

  const sourceId = await store.getSourceIdByCode(input.sourceCode);
  if (sourceId === null) throw new UnknownSourceError(input.sourceCode);

  // DEDUP: already stored → skip (keep the collector resumable + idempotent).
  const existing = await store.findDocumentBySha(sourceId, sha256);
  if (existing !== null) {
    return { documentId: existing, sha256, skipped: true, reason: "duplicate" };
  }

  const ext = storageExtension(artifacts.fileType);
  const storagePath = `${input.sourceCode}/${sha256}.${ext}`;
  await store.uploadOriginal(storagePath, input.bytes, input.mimeType);

  const status = artifacts.gate.publishable ? "ingested_unverified" : "ingested_gate_failed";

  const docId = await store.insertDocument({
    source_id: sourceId,
    source_document_id: artifacts.documentId,
    source_url: input.sourceUrl,
    document_type: metadata.documentType,
    case_number_raw: metadata.caseNumberRaw,
    case_number_normalized: metadata.caseNumberNormalized,
    court_name: metadata.courtName,
    court_level: metadata.courtLevel,
    proceeding_type: metadata.proceedingType,
    decision_date: metadata.decisionDate,
    publication_status: "public",
    publication_restrictions: metadata.publicationRestrictions,
    original_sha256: sha256,
    original_storage_path: storagePath,
    original_mime_type: input.mimeType,
    original_size_bytes: input.bytes.byteLength,
    raw_text: input.artifacts.normalizedText,
    normalized_text: artifacts.normalizedText,
    title: metadata.title,
    parties_display: metadata.partiesDisplay,
    language: "he",
    extraction_method: "browser_html_text_layer",
    extraction_confidence: 0.8,
    parser_version: "legalai-phase3",
    source_metadata: { retrieved_via: "public_browser_session", no_bypass: true },
    derived_metadata: {
      section_count: artifacts.sections.length,
      citation_count: artifacts.citations.length,
      statute_count: artifacts.statutes.length,
      transforms_applied: artifacts.transformsApplied,
    },
    status,
  });

  const sectionRows: SectionRow[] = artifacts.sections.map((s) => ({
    document_id: docId,
    section_index: s.sectionIndex,
    section_type: s.sectionType,
    heading: s.heading,
    text: s.text,
    normalized_text: s.text,
    token_count: tokenCount(s.text),
    parser_version: "legalai-phase3",
  }));
  if (sectionRows.length > 0) await store.insertSections(sectionRows);

  // Dedup citations by normalized value so we don't insert the same ref twice.
  const seenCite = new Set<string>();
  const citeRows: CaseCitationRow[] = [];
  for (const c of artifacts.citations) {
    const norm = c.normalized.normalized;
    if (seenCite.has(norm)) continue;
    seenCite.add(norm);
    citeRows.push({
      citing_document_id: docId,
      cited_case_number_raw: c.raw,
      cited_case_number_normalized: norm,
      citation_text: c.raw,
      treatment: "unknown",
      resolution_status: "unresolved",
    });
  }
  if (citeRows.length > 0) await store.insertCaseCitations(citeRows);

  const statuteRows: StatuteCitationRow[] = artifacts.statutes.map((s) => ({
    document_id: docId,
    citation_text: s.raw,
    normalized_citation: s.statuteNameNormalized,
    extraction_method: "regex",
    confidence: 0.7,
  }));
  if (statuteRows.length > 0) await store.insertStatuteCitations(statuteRows);

  await store.upsertDocumentSource({
    document_id: docId,
    source_id: sourceId,
    source_document_id: artifacts.documentId,
    source_url: input.sourceUrl,
    sha256,
    is_official: true,
    is_canonical: true,
    storage_path: storagePath,
  });

  await store.insertVersion({
    document_id: docId,
    version_number: 1,
    source_url: input.sourceUrl,
    storage_path: storagePath,
    mime_type: input.mimeType,
    sha256,
    size_bytes: input.bytes.byteLength,
    is_current: true,
  });

  return { documentId: docId, sha256, skipped: false, reason: "new" };
}

/** Has this date-window already been fully processed? (resume support) */
export async function isWindowCompleted(store: LegalaiStore, key: WindowKey): Promise<boolean> {
  const status = await store.getWindowStatus(key);
  return status === "completed";
}

/** Record a window's progress so a re-run can skip completed windows. */
export async function checkpointWindow(
  store: LegalaiStore,
  key: WindowKey,
  counts: { results: number; discovered: number; downloaded: number; completed: boolean },
): Promise<void> {
  await store.upsertWindow({
    source_id: key.sourceId,
    court_name: key.courtName,
    proceeding_type: key.proceedingType,
    date_from: key.dateFrom,
    date_to: key.dateTo,
    cursor: null,
    status: counts.completed ? "completed" : "in_progress",
    results_count: counts.results,
    discovered_count: counts.discovered,
    downloaded_count: counts.downloaded,
    completed: counts.completed,
  });
}

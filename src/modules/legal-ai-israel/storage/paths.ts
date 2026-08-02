/**
 * Deterministic Supabase Storage path helpers (LEGAL AI ISRAEL — Phase 2).
 * Path format: legal-originals/{source_code}/{year}/{document_id}/{version}/{filename}
 * Original files are immutable; public users never touch storage paths directly.
 */

export type BucketName =
  | "legal-originals"
  | "legal-normalized"
  | "legal-processing-artifacts"
  | "legal-audit-evidence";

export const STORAGE_BUCKETS: readonly BucketName[] = [
  "legal-originals",
  "legal-normalized",
  "legal-processing-artifacts",
  "legal-audit-evidence",
];

/** Buckets that are administrator-only (never operator/public reachable). */
export const ADMIN_ONLY_BUCKETS: readonly BucketName[] = ["legal-audit-evidence"];

/** Sanitize a filename: strip path separators + control chars; keep extension. */
export function sanitizeFilename(name: string): string {
  const base = name.replace(/[\\/]/g, "_").replace(/[--]/g, "").trim();
  const cleaned = base.replace(/[^0-9A-Za-z._֐-׿-]+/g, "_").replace(/_{2,}/g, "_");
  return cleaned.length > 0 ? cleaned : "document";
}

function assertYear(year: number): void {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new Error(`invalid year: ${year}`);
}

export interface OriginalPathInput {
  sourceCode: string;
  year: number;
  documentId: string;
  version: number;
  filename: string;
}

export function originalPath(input: OriginalPathInput): string {
  assertYear(input.year);
  if (!/^[a-z0-9_]+$/.test(input.sourceCode)) throw new Error(`invalid source code: ${input.sourceCode}`);
  if (!input.documentId) throw new Error("documentId required");
  if (!Number.isInteger(input.version) || input.version < 1) throw new Error("version must be >= 1");
  return [
    "legal-originals",
    input.sourceCode,
    String(input.year),
    input.documentId,
    `v${input.version}`,
    sanitizeFilename(input.filename),
  ].join("/");
}

export function normalizedPath(sourceCode: string, year: number, documentId: string): string {
  assertYear(year);
  return `legal-normalized/${sourceCode}/${year}/${documentId}/normalized.txt`;
}

export function artifactPath(sourceCode: string, documentId: string, artifact: string): string {
  return `legal-processing-artifacts/${sourceCode}/${documentId}/${sanitizeFilename(artifact)}`;
}

export function auditEvidencePath(dateISO: string, sourceCode: string, filename: string): string {
  const day = dateISO.slice(0, 10);
  return `legal-audit-evidence/${day}/${sourceCode}/${sanitizeFilename(filename)}`;
}

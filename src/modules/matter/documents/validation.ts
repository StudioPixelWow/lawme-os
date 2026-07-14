/**
 * Matter documents — upload validation (Sprint 3, Slice 1).
 * Pure and isomorphic (server + client + tests): allowed types, safe dev size
 * limit, filename sanitization, and magic-byte content sniffing to catch a
 * declared-MIME / real-content mismatch. No archive processing, no execution.
 */

/** Allowed demo file types -> canonical MIME. */
export const ALLOWED_EXT: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export const ALLOWED_MIME = new Set(Object.values(ALLOWED_EXT));

/** Safe development limit. */
export const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export type SniffedKind = "pdf" | "png" | "jpg" | "zip" | "unknown";

/** Content sniff by magic bytes (DOCX is a zip container -> "zip"). */
export function sniffKind(head: Uint8Array): SniffedKind {
  const b = head;
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "pdf"; // %PDF
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return "png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) return "zip"; // PK
  return "unknown";
}

function kindMatchesMime(kind: SniffedKind, mime: string): boolean {
  switch (kind) {
    case "pdf":
      return mime === "application/pdf";
    case "png":
      return mime === "image/png";
    case "jpg":
      return mime === "image/jpeg";
    case "zip":
      return mime === ALLOWED_EXT.docx; // DOCX is a PK zip; no unzip in this slice
    default:
      return false;
  }
}

export function extensionOf(filename: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return m ? m[1].toLowerCase() : "";
}

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const UNSAFE_CHARS = /[^\p{L}\p{N}\-_. ]/gu;

/**
 * Sanitize an untrusted filename: strip any path, remove control/unsafe chars,
 * block traversal and hidden dotfiles, collapse whitespace, cap length, and
 * preserve a single safe extension.
 */
export function sanitizeFilename(raw: string): string {
  const base = (raw.split(/[\\/]/).pop() ?? "file").replace(/^\.+/, ""); // drop leading dots (hidden files)
  const ext = extensionOf(base);
  let stem = ext ? base.slice(0, base.length - ext.length - 1) : base;
  stem = stem
    .normalize("NFC")
    .replace(CONTROL_CHARS, "")
    .replace(UNSAFE_CHARS, "_")
    .replace(/\.+/g, ".")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+/, "")
    .trim();
  if (!stem) stem = "file";
  if (stem.length > 120) stem = stem.slice(0, 120);
  const safeExt = ext && /^[a-z0-9]{1,5}$/.test(ext) ? `.${ext}` : "";
  return `${stem}${safeExt}`;
}

export interface ValidationIssue {
  code: string;
  messageHe: string;
}

export interface UploadCandidate {
  filename: string;
  declaredMime: string;
  size: number;
  head: Uint8Array;
}

/** Full validation. Returns all issues (empty = valid). Pure. */
export function validateUpload(input: UploadCandidate): { ok: boolean; issues: ValidationIssue[]; canonicalMime: string | null } {
  const issues: ValidationIssue[] = [];
  const ext = extensionOf(input.filename);
  const canonicalMime = ALLOWED_EXT[ext] ?? null;

  if (!canonicalMime) {
    issues.push({ code: "type_not_allowed", messageHe: "סוג הקובץ אינו נתמך. מותרים: PDF, DOCX, PNG, JPG." });
  }

  if (input.size <= 0) {
    issues.push({ code: "empty", messageHe: "הקובץ ריק." });
  } else if (input.size > MAX_SIZE_BYTES) {
    issues.push({ code: "too_large", messageHe: `הקובץ גדול מדי (מעל ${Math.round(MAX_SIZE_BYTES / 1024 / 1024)}MB).` });
  }

  const kind = sniffKind(input.head);
  if (canonicalMime) {
    if (kind === "unknown") {
      issues.push({ code: "content_unrecognized", messageHe: "תוכן הקובץ אינו תואם לסוג מוכר." });
    } else if (!kindMatchesMime(kind, canonicalMime)) {
      issues.push({ code: "mime_mismatch", messageHe: "סוג הקובץ המוצהר אינו תואם לתוכן בפועל." });
    }
  }

  const safe = sanitizeFilename(input.filename);
  if (!/[.\p{L}\p{N}]/u.test(safe)) {
    issues.push({ code: "bad_filename", messageHe: "שם הקובץ אינו תקין." });
  }

  return { ok: issues.length === 0, issues, canonicalMime };
}

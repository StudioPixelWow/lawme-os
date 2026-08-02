/**
 * Content-based file-type detection (LEGAL AI ISRAEL — Phase 2).
 * Detects type by MAGIC BYTES, not filename. Rejects executables and any
 * unsupported format. Filenames are never trusted for type or metadata.
 */

export type DetectedType = "pdf" | "docx" | "zip" | "html" | "txt" | "rtf" | "executable" | "unknown";

const SUPPORTED: ReadonlySet<DetectedType> = new Set(["pdf", "docx", "zip", "html", "txt", "rtf"]);

function startsWith(bytes: Uint8Array, sig: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (bytes[offset + i] !== sig[i]) return false;
  return true;
}

function asText(bytes: Uint8Array, n = 512): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, n));
}

/** Detect type from the first bytes. DOCX is a ZIP containing "word/". */
export function detectFileType(bytes: Uint8Array): DetectedType {
  // Executables (rejected)
  if (startsWith(bytes, [0x4d, 0x5a])) return "executable";                 // MZ (PE/EXE)
  if (startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) return "executable";     // ELF
  if (startsWith(bytes, [0xfe, 0xed, 0xfa])) return "executable";           // Mach-O
  if (startsWith(bytes, [0x23, 0x21])) return "executable";                 // #!

  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf";            // %PDF
  if (startsWith(bytes, [0x7b, 0x5c, 0x72, 0x74, 0x66])) return "rtf";      // {\rtf

  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    // ZIP container — DOCX if it references the word/ part.
    const head = asText(bytes, 4000);
    if (head.includes("word/") || head.includes("[Content_Types].xml")) return "docx";
    return "zip";
  }

  const text = asText(bytes).trimStart().toLowerCase();
  if (text.startsWith("<!doctype html") || text.startsWith("<html") || text.startsWith("<?xml") || text.includes("<body")) {
    return "html";
  }
  // Printable text heuristic (allow Hebrew + common punctuation/whitespace).
  const sample = bytes.slice(0, 512);
  let printable = 0;
  for (const b of sample) {
    if (b === 9 || b === 10 || b === 13 || (b >= 32 && b !== 127) || b >= 0x80) printable++;
  }
  if (sample.length > 0 && printable / sample.length > 0.9) return "txt";
  return "unknown";
}

export interface FileValidation {
  type: DetectedType;
  accepted: boolean;
  reasonHe: string | null;
}

export function validateFile(bytes: Uint8Array): FileValidation {
  const type = detectFileType(bytes);
  if (type === "executable") return { type, accepted: false, reasonHe: "קובץ הרצה נדחה" };
  if (!SUPPORTED.has(type)) return { type, accepted: false, reasonHe: "פורמט לא נתמך" };
  return { type, accepted: true, reasonHe: null };
}

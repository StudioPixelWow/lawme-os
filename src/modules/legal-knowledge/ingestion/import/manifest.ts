/**
 * Import manifest (Epic 3B, Phases 7-8).
 * The founder places official export files (statutes / regulations /
 * extension orders) in an import directory alongside a manifest.json.
 * The manifest is the ONLY instruction source — file *content* is data,
 * never instructions. Each entry declares provenance + permission so the
 * importer can gate full-text persistence deterministically.
 */
import { normalizeStatuteName } from "../../legislation/normalize.ts";

export const IMPORT_MANIFEST_VERSION = "import-manifest-1.0.0";

export type ImportFullTextDecision =
  | "allow_full_text_dev_poc"   // public-domain primary law → store full text
  | "allow_metadata_only"       // record metadata, no body
  | "pointer_only";             // canonical URL reference only

export interface ManifestEntry {
  sourceId: string;                 // e.g. E3B-LEG-001
  documentType: "legislation" | "regulation" | "order" | "guidance" | "secondary";
  titleHe: string;
  /** local file (relative to the manifest dir); omit for metadata/pointer */
  file?: string;
  contentType?: "text/plain" | "text/html" | "application/pdf";
  publisherHe: string;
  canonicalSourceUrl: string;       // official permanent URL — always required
  fullTextDecision: ImportFullTextDecision;
  legalTopic: string;
  publicationDate?: string | null;
  effectiveDate?: string | null;
  versionState?: "current" | "historical" | "unknown";
  /** amendment note captured from the official source (never inferred) */
  amendmentNoteHe?: string | null;
}

export interface ImportManifest {
  manifestVersion: string;
  createdBy: string;
  notes?: string;
  entries: ManifestEntry[];
}

/** Hosts an importer may reference (canonical URLs). Anything else → reject. */
export const ALLOWLISTED_HOSTS = [
  "main.knesset.gov.il", "knesset.gov.il", "fs.knesset.gov.il",
  "www.gov.il", "gov.il", "www.btl.gov.il", "btl.gov.il",
  "workagreements.labor.gov.il", "data.gov.il", "www.nevo.co.il",
  "www.kolzchut.org.il", "kolzchut.org.il",
];

export function hostOf(url: string): string | null {
  const m = url.match(/^https?:\/\/([^/]+)/i);
  return m ? m[1].toLowerCase() : null;
}

export interface ManifestValidation {
  valid: boolean;
  errors: { sourceId: string; messageHe: string }[];
  warnings: { sourceId: string; messageHe: string }[];
}

/** Deterministic manifest validation — no fetching, no writing. */
export function validateManifest(manifest: ImportManifest): ManifestValidation {
  const errors: ManifestValidation["errors"] = [];
  const warnings: ManifestValidation["warnings"] = [];
  const seen = new Set<string>();

  for (const e of manifest.entries) {
    if (seen.has(e.sourceId)) errors.push({ sourceId: e.sourceId, messageHe: "מזהה מקור כפול" });
    seen.add(e.sourceId);

    const host = hostOf(e.canonicalSourceUrl);
    if (!host || !ALLOWLISTED_HOSTS.includes(host)) {
      errors.push({ sourceId: e.sourceId, messageHe: `מארח לא ברשימת ההיתר: ${host ?? "לא תקין"}` });
    }
    // full-text entries MUST carry a file and a primary-law type
    if (e.fullTextDecision === "allow_full_text_dev_poc") {
      if (!e.file) errors.push({ sourceId: e.sourceId, messageHe: "החלטת טקסט מלא ללא קובץ" });
      if (!["legislation", "regulation", "order"].includes(e.documentType)) {
        errors.push({ sourceId: e.sourceId, messageHe: "טקסט מלא מותר רק לחקיקה/תקנה/צו (דין ציבורי לפי סעיף 6)" });
      }
      if (e.documentType === "secondary" || e.publisherHe.includes("כל זכות")) {
        errors.push({ sourceId: e.sourceId, messageHe: "אסור לאחסן טקסט מקור משני/עריכתי" });
      }
    }
    // secondary sources may never be full text
    if (e.documentType === "secondary" && e.fullTextDecision !== "pointer_only") {
      errors.push({ sourceId: e.sourceId, messageHe: "מקור משני חייב להיות pointer_only" });
    }
    if (!e.canonicalSourceUrl) errors.push({ sourceId: e.sourceId, messageHe: "חסר URL קנוני" });
    if (e.versionState === undefined && e.documentType !== "secondary") {
      warnings.push({ sourceId: e.sourceId, messageHe: "מצב גרסה לא צוין — ייחשב 'unknown'" });
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

/** Stable canonical id for an imported statute/order (dedup key basis). */
export function canonicalIdFor(entry: ManifestEntry): string {
  const base = normalizeStatuteName(entry.titleHe).replace(/\s+/g, "-");
  const v = entry.versionState === "historical" && entry.effectiveDate ? `@${entry.effectiveDate}` : "";
  return `${entry.documentType}:${base}${v}`;
}

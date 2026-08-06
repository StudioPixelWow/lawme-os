/**
 * Deterministic identity for official legislation publications (current Epic).
 *
 * Publication identity is derived ONLY from stable official fields — never from
 * free text or guesses — so the same real-world publication collapses to one id
 * on every run:
 *
 *   Law         → knesset:<IsraelLawID>
 *   Publication → knesset:publication:<itemId>
 *   Amendment   → knesset:law:<IsraelLawID>:correction:<correctionNumber>
 *   PDF binary  → canonical <URL> + binary SHA-256 (content-addressed)
 *
 * A publication row missing its own itemId falls back to a DOCUMENTED composite
 * of (lawId, correctionNumber) — explicit, not a fuzzy match. The PDF identity
 * pairs the canonical URL with the SHA-256 of the fetched bytes so a re-publish
 * at the same URL with different content is detectable.
 */
import { createHash } from "node:crypto";

function h10(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 10);
}

/** Canonical id for a Law, keyed on IsraelLawID. */
export function lawPublicationId(israelLawId: string): string {
  const id = israelLawId.trim();
  if (!/^\d+$/.test(id)) throw new Error(`publication-identity: bad IsraelLawID "${israelLawId}"`);
  return `knesset:${id}`;
}

/** Canonical id for a Publication row, keyed on its own Knesset itemId. */
export function publicationId(itemId: string | null, lawId: string, correctionNumber: string | null): string {
  const t = (itemId ?? "").trim();
  if (t.length > 0) return `knesset:publication:${t}`;
  // Documented fallback: no publication itemId → (law, correction) composite.
  const cn = (correctionNumber ?? "").trim();
  return `knesset:publication:derived:${h10(`${lawPublicationId(lawId)}|${cn}`)}`;
}

/**
 * Canonical id for an Amendment Event within a law's chain.
 *   knesset:law:<IsraelLawID>:correction:<correctionNumber>
 * The Knesset API frequently leaves `correctionNumber` empty (notably for
 * indirect/עקיף amendments), so we fall back to a DOCUMENTED itemId-keyed id:
 *   knesset:law:<IsraelLawID>:pub:<itemId>
 * Both are deterministic; neither uses the title.
 */
export function amendmentEventId(
  israelLawId: string,
  correctionNumber: string | null,
  itemId: string | null,
): string {
  const lawNum = lawPublicationId(israelLawId).split(":")[1];
  const cn = (correctionNumber ?? "").trim();
  if (cn.length > 0) return `knesset:law:${lawNum}:correction:${cn}`;
  const iid = (itemId ?? "").trim();
  if (iid.length > 0) return `knesset:law:${lawNum}:pub:${iid}`;
  throw new Error("publication-identity: amendment needs correctionNumber or itemId");
}

/** Canonical URL for a ספר החוקים PDF given a raw filePath from the API. */
export function canonicalPdfUrl(filePath: string, host = "https://fs.knesset.gov.il"): string {
  const raw = filePath.trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(raw)) {
    // e.g. "https://fs.knesset.gov.il/\9\law\..." → collapse the path's extra
    // slashes without touching the "https://" scheme separator.
    const m = raw.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
    if (!m) return raw;
    const path = (m[2] ?? "").replace(/\/{2,}/g, "/");
    return `${m[1]}${path}`;
  }
  // API returns Windows-style relative paths like `25\law\1234_lsr_567.PDF`.
  const rel = raw.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  return `${host.replace(/\/+$/, "")}/${rel}`;
}

/** Content-addressed identity of a fetched PDF: canonical URL + binary SHA-256. */
export function pdfBinaryId(canonicalUrl: string, sha256: string): string {
  const digest = sha256.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error("publication-identity: sha256 must be 64 hex chars");
  return `pdf:${digest}`;
}

/** SHA-256 of raw bytes as lowercase hex (used for PDF binary identity). */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

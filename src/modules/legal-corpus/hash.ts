/**
 * Deterministic text hashing for corpus reproducibility.
 * Same text ⇒ same hash, always (SHA-256 hex). No randomness.
 */
import { createHash } from "node:crypto";

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** A stable, reproducible key for an answer's source basis (Vol 19). */
export function reproducibilityKey(input: {
  corpusVersion: string;
  sourceId: string;
  versionId: string;
  sourceTextHash: string;
  verificationId: string;
  asOfISO: string;
}): string {
  return [
    input.corpusVersion,
    input.sourceId,
    input.versionId,
    input.sourceTextHash,
    input.verificationId,
    input.asOfISO,
  ].join("|");
}

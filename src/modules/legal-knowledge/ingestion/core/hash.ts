/** Content hashing — SHA-256 hex, the identity used across the pipeline. */
import { createHash } from "node:crypto";

export function sha256Hex(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

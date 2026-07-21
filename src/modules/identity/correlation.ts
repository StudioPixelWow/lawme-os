/**
 * Correlation ID primitive (Capability 0.8, Slice 0.8.1).
 *
 * Opaque, non-secret, server-generated request identifier. Safe for logs and
 * error responses. Encodes NO user/client data. Not a predictable counter.
 *
 * Policy for a caller-supplied id: if it is a valid correlation id it is
 * PRESERVED; otherwise a fresh one is generated (fail-safe, never rejects a
 * request over a malformed internal id). Immutable once inside ActorContext.
 */
import { randomUUID } from "node:crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True for a well-formed correlation id (a UUID). */
export function isValidCorrelationId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Generate a fresh, opaque correlation id. */
export function newCorrelationId(): string {
  return randomUUID();
}

/** Preserve a valid supplied id, otherwise generate a fresh one. */
export function ensureCorrelationId(candidate?: string | null): string {
  return isValidCorrelationId(candidate) ? candidate : newCorrelationId();
}

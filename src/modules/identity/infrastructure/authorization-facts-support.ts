/**
 * Shared support for authorization-fact loaders (Capability 0.8, Slice 0.8.4).
 *
 * ONE canonical matter-identifier resolver (strict UUID vs slug) reused by every
 * loader and migrated read path — no drifting regexes. Plus small helpers that
 * enforce the loader contract: query the authenticated (RLS) client, scope every
 * query by organization even though RLS also exists, validate rows at runtime,
 * and fail closed (malformed ⇒ null ⇒ deny) without revealing cross-tenant
 * existence.
 */
import { z } from "zod";

/** THE canonical UUID shape (strict RFC-4122-ish). Used everywhere a matter is
 *  resolved by id-vs-slug, so there is exactly one resolution path. */
export const STRICT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCanonicalUuid(value: string): boolean {
  return STRICT_UUID.test(value);
}

/** A plausible slug (matches the DB slug regex family) — anything else is junk. */
export const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,199}$/;

/** Runtime guard for a resource identifier accepted from a route/caller. Rejects
 *  empty, oversized, and injection-shaped values before any query is built. */
export function isPlausibleResourceId(value: unknown): value is string {
  return typeof value === "string" && (isCanonicalUuid(value) || SLUG_RE.test(value));
}

/** Non-secret error raised when the underlying store fails unexpectedly (network,
 *  permission, timeout). Distinct from "absent" (null) so the orchestrator maps
 *  it to a safe internal failure rather than a not-found. Never carries a DB msg. */
export class PolicyFactsLoadError extends Error {
  readonly stage: string;
  constructor(stage: string) {
    super(`policy-facts load failed at ${stage}`);
    this.name = "PolicyFactsLoadError";
    this.stage = stage;
  }
}

/**
 * Run a single-row query and return the raw row (or null when absent). Throws
 * PolicyFactsLoadError on an unexpected store error — never leaks the DB message.
 * `stage` is a safe telemetry label ("matter", "membership", …).
 */
export async function fetchMaybeRow<T>(
  stage: string,
  run: () => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T | null> {
  const { data, error } = await run();
  if (error) throw new PolicyFactsLoadError(stage);
  if (!data || data.length === 0) return null;
  return data[0];
}

/** Safe-parse a row with a zod schema; malformed ⇒ null (fail closed), never throw. */
export function parseRowOrNull<T>(schema: z.ZodType<T>, row: unknown): T | null {
  const parsed = schema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

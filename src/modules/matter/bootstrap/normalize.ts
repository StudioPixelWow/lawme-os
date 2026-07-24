/**
 * Capability 1 · Slice 1.0.1 — deterministic normalization primitives.
 *
 * Pure, locale-INDEPENDENT hygiene only — NOTHING database-specific and NO
 * mapping to Matter columns (that is the planner's job in 1.0.2). Every helper
 * here is a total function of its input, with no clock, no randomness, and no
 * locale-dependent behavior (all comparison is by UTF-16 code unit, all case
 * folding is ASCII-only for closed enum vocabularies).
 */

import { sha256Hex } from "./hash.ts";

/** Unicode NFC + trim + collapse internal whitespace to single ASCII spaces.
 *  Returns "" for nullish/blank — callers convert "" to null where required. */
export function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  // NFC first so composed/decomposed Hebrew (e.g. nikud sequences) compare equal.
  const nfc = value.normalize("NFC");
  // Collapse runs of whitespace to a single space, then trim the ends.
  return nfc.replace(/\s+/g, " ").trim();
}

/** Normalize to a non-empty string or null (empty/blank becomes null). */
export function normalizeTextOrNull(value: unknown): string | null {
  const s = normalizeText(value);
  return s.length === 0 ? null : s;
}

/** Lower-case an enum candidate for closed-vocabulary matching (ASCII only —
 *  the domain enums are all ASCII, so this is locale-independent). */
export function normalizeEnumCandidate(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").trim().replace(/[\s-]+/g, "_").toLowerCase();
}

/** Resolve a candidate against a closed vocabulary; null if not a member. */
export function matchEnum<T extends string>(value: unknown, vocabulary: readonly T[]): T | null {
  const cand = normalizeEnumCandidate(value);
  for (const v of vocabulary) {
    if (v === cand) return v;
  }
  return null;
}

/** Deterministic string ordering by UTF-16 code unit (NOT localeCompare). */
export function codeUnitCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Stable sort by a string key extractor, breaking ties by a secondary key.
 *  Uses only code-unit comparison; input is not mutated. */
export function stableSortBy<T>(
  items: readonly T[],
  primary: (item: T) => string,
  secondary?: (item: T) => string,
): T[] {
  return items
    .map((item, index) => ({ item, index, p: primary(item), s: secondary ? secondary(item) : "" }))
    .sort((x, y) => {
      const cp = codeUnitCompare(x.p, y.p);
      if (cp !== 0) return cp;
      const cs = codeUnitCompare(x.s, y.s);
      if (cs !== 0) return cs;
      return x.index - y.index; // stable: preserve original order on full ties
    })
    .map((w) => w.item);
}

/** Drop duplicates by a canonical key, keeping FIRST occurrence. Returns the
 *  kept items and the number dropped (for statistics/infos). */
export function dedupeBy<T>(
  items: readonly T[],
  key: (item: T) => string,
): { readonly kept: T[]; readonly dropped: number } {
  const seen = new Set<string>();
  const kept: T[] = [];
  let dropped = 0;
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) {
      dropped += 1;
      continue;
    }
    seen.add(k);
    kept.push(item);
  }
  return { kept, dropped };
}

/** Normalize an ISO-ish date string WITHOUT inventing a value. Returns a stable
 *  ISO-8601 UTC instant when the input parses, else null. Never fabricates a
 *  date for an unknown/blank input. `Date.parse`/`new Date(ms)` are pure
 *  functions of the input (no clock read). */
export function normalizeIsoDateOrNull(value: unknown): string | null {
  const s = normalizeText(value);
  if (s.length === 0) return null;
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/** A short, deterministic plan-local key (NOT a DB id). Derived from stable
 *  content (JSON-encoded parts, so nulls and separators are unambiguous) so
 *  re-validation yields the same key. */
export function planLocalKey(prefix: string, ...parts: Array<string | null>): string {
  return `${prefix}_${sha256Hex(JSON.stringify(parts)).slice(0, 16)}`;
}

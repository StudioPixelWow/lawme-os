/**
 * Deterministic helpers for the intake pipeline — no Date.now, no randomness,
 * so every run over the same input is byte-reproducible (required by the
 * benchmark's traceability and hard-target guarantees).
 */

/** FNV-1a 32-bit — small, fast, dependency-free, stable across runs. */
export function stableHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // >>> 0 to unsigned, base36 for compactness
  return (h >>> 0).toString(36);
}

/** Build a stable id from a namespace + parts (order-sensitive). */
export function stableId(namespace: string, ...parts: Array<string | number>): string {
  return `${namespace}_${stableHash(parts.join("|"))}`;
}

/** Clamp a number into [lo, hi]. */
export function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/** Confidence band from a 0..1 score, in the item vocabulary. */
export function bandFor(score: number): "high" | "moderate" | "low" | "very_low" {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "moderate";
  if (score >= 0.3) return "low";
  return "very_low";
}

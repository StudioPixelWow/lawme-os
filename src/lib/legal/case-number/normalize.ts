/**
 * Canonical display + deterministic search key for parsed case numbers.
 * Same proceeding in any input variant → identical searchKey.
 */
import { parseCaseNumber } from "./parse.ts";
import type { ParsedCaseNumber } from "./types.ts";

/** Canonical human display, e.g. `סע"ש 12345-01-20` or `ע"א 7803/06`. */
export function toDisplay(p: ParsedCaseNumber): string | null {
  if (!p.ok || p.sequence === null || p.year === null) return null;
  const code = p.procedure?.code ?? p.procedureCode ?? "";
  const yy = String(p.year % 100).padStart(2, "0");
  if (p.format === "hyphenated" && p.month !== null) {
    const mm = String(p.month).padStart(2, "0");
    return `${code} ${p.sequence}-${mm}-${yy}`.trim();
  }
  return `${code} ${p.sequence}/${yy}`.trim();
}

/**
 * Deterministic ASCII search key:
 *   known code      → `SAS-12345-01-2020` / `EA-7803-2006`
 *   unknown code    → `HE<bare-hebrew-letters>-…` kept stable via codepoints
 * The key intentionally uses the FULL year so 1998 ≠ 2098.
 */
export function toSearchKey(p: ParsedCaseNumber): string | null {
  if (!p.ok || p.sequence === null || p.year === null) return null;
  const codeKey =
    p.procedure?.asciiKey ??
    "X" +
      Array.from((p.procedureCode ?? "").replace(/"/g, ""))
        .map((c) => c.codePointAt(0)!.toString(16))
        .join("");
  const parts = [codeKey, String(p.sequence)];
  if (p.format === "hyphenated" && p.month !== null) {
    parts.push(String(p.month).padStart(2, "0"));
  }
  parts.push(String(p.year));
  return parts.join("-");
}

export interface NormalizedCaseNumber extends ParsedCaseNumber {
  display: string | null;
  searchKey: string | null;
}

/** One-call normalization: parse + display + search key. */
export function normalizeCaseNumber(input: string): NormalizedCaseNumber {
  const parsed = parseCaseNumber(input);
  return { ...parsed, display: toDisplay(parsed), searchKey: toSearchKey(parsed) };
}

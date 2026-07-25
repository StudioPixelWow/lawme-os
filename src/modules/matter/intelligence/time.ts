/**
 * Matter Intelligence — deterministic time helpers (Asia/Jerusalem). PURE.
 * No wall clock: every function takes explicit ISO inputs, so derivations are
 * reproducible and testable.
 */

/** Jerusalem calendar-day key "YYYY-MM-DD". */
export function jerusalemDayKey(iso: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(new Date(iso));
}

/** Whole Jerusalem calendar-days between two instants (target − from). */
export function dayDelta(fromISO: string, targetISO: string): number {
  const a = jerusalemDayKey(fromISO);
  const b = jerusalemDayKey(targetISO);
  const da = Date.UTC(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10)));
  const db = Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  return Math.round((db - da) / 86_400_000);
}

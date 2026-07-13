/**
 * Matter Narrative — deterministic Hebrew formatters (Epic 4.2).
 * Pure string helpers: no wall clock, no locale surprises. Everything is
 * relative to the supplied asOf. Modern professional Hebrew, short forms,
 * correct singular/dual/plural, RTL-safe.
 */
import type { DimensionState } from "../score/types.ts";

/** Hebrew day count: 1→"יום", 2→"יומיים", else "N ימים". */
export function daysHe(n: number): string {
  const a = Math.abs(n);
  if (a === 1) return "יום";
  if (a === 2) return "יומיים";
  return `${a} ימים`;
}

/** "בעוד 4 ימים" / "היום" / "אתמול" / "לפני 3 ימים" from days-remaining. */
export function relativeDaysHe(daysRemaining: number | null): string {
  if (daysRemaining === null) return "במועד שטרם נקבע";
  if (daysRemaining === 0) return "היום";
  if (daysRemaining === 1) return "מחר";
  if (daysRemaining === -1) return "אתמול";
  if (daysRemaining > 0) return `בעוד ${daysHe(daysRemaining)}`;
  return `לפני ${daysHe(daysRemaining)}`;
}

/** "כבר 3 ימים" for elapsed durations. */
export function elapsedDaysHe(days: number | null): string {
  if (days === null) return "";
  if (days === 0) return "היום";
  return `${daysHe(days)}`;
}

export function overdueHe(daysOverdue: number): string {
  return `באיחור של ${daysHe(daysOverdue)}`;
}

/** count + noun with Hebrew agreement for a couple of common nouns. */
export function countHe(n: number, singular: string, dual: string, plural: string): string {
  if (n === 1) return `${singular} אחד`;
  if (n === 2) return dual;
  return `${n} ${plural}`;
}

const DIMENSION_STATE_HE: Record<DimensionState, string> = {
  strong: "חזק",
  healthy: "תקין",
  attention: "דורש תשומת לב",
  at_risk: "בסיכון",
  blocked: "חסום",
  unknown: "לא ידוע",
  unavailable: "לא זמין",
  stale: "לא עדכני",
  requires_review: "דורש בדיקה",
  not_applicable: "לא רלוונטי",
};

export function dimensionStateHe(s: DimensionState): string {
  return DIMENSION_STATE_HE[s];
}

/** ISO date → dd.mm.yyyy (deterministic, no locale). null-safe. */
export function isoToHebDate(iso: string | null): string {
  if (!iso) return "מועד לא ידוע";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** Safe join for a Hebrew list: "א, ב ו-ג". */
export function joinHe(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} ו-${items[items.length - 1]}`;
}

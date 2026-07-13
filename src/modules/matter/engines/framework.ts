/** Shared engine helpers (Epic 4). */
import type { EngineAssessment, EngineStatus, Finding, RecommendedAction, Severity } from "../types.ts";

export function worst(a: Severity, b: Severity): Severity {
  const order: Severity[] = ["info", "low", "medium", "high", "critical"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

export function statusFromSeverity(sev: Severity): EngineStatus {
  switch (sev) {
    case "critical": return "blocked";
    case "high": return "at_risk";
    case "medium": return "attention";
    default: return "healthy";
  }
}

export function assessment(
  engine: string, version: string,
  parts: {
    status?: EngineStatus; score?: number | null; findings?: Finding[];
    actions?: RecommendedAction[]; data?: Record<string, unknown>;
    confidence?: number; requiresHumanReview?: boolean;
  },
): EngineAssessment {
  const findings = parts.findings ?? [];
  const topSeverity = findings.reduce<Severity>((s, f) => worst(s, f.severity), "info");
  return {
    engine, engineVersion: version,
    status: parts.status ?? statusFromSeverity(topSeverity),
    score: parts.score ?? null,
    findings,
    actions: parts.actions ?? [],
    data: parts.data ?? {},
    confidence: parts.confidence ?? 0.7,
    requiresHumanReview: parts.requiresHumanReview ?? true,
  };
}

/* ---- deterministic helpers (no Date.now; everything relative to asOf) ---- */

const MS_PER_DAY = 86_400_000;

/** Parse an ISO date to epoch ms; returns null on missing/invalid input. */
export function parseISO(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/** Whole days from `fromISO` to `toISO` (positive = to is later). null if either unparseable. */
export function daysBetween(fromISO: string | null | undefined, toISO: string | null | undefined): number | null {
  const a = parseISO(fromISO);
  const b = parseISO(toISO);
  if (a === null || b === null) return null;
  return Math.round((b - a) / MS_PER_DAY);
}

/** Clamp a raw penalty subtraction into a 0..1 score. */
export function score01(raw: number): number {
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return Math.round(raw * 1000) / 1000;
}

export function finding(
  code: string, severity: Severity, messageHe: string, dimension: Finding["dimension"],
): Finding {
  return { code, severity, messageHe, dimension };
}

export function action(
  id: string, labelHe: string, ownerRole: RecommendedAction["ownerRole"],
  whyHe: string, priority: Severity,
  opts?: { dueHint?: string | null; requiresHumanApproval?: boolean },
): RecommendedAction {
  return {
    id, labelHe, ownerRole, whyHe, priority,
    dueHint: opts?.dueHint ?? null,
    requiresHumanApproval: opts?.requiresHumanApproval ?? true,
  };
}

import type { ReactNode } from "react";
import { SparkleGlyph } from "../icons/glyphs";
import { cx } from "../utils/cx";

export type Status =
  | "urgent"
  | "today"
  | "waiting"
  | "progress"
  | "new"
  | "completed"
  | "risk"
  | "scheduled"
  | "reviewed"
  | "signed";

const STATUS_TEXT: Record<Status, string> = {
  urgent: "text-status-urgent",
  today: "text-status-today",
  waiting: "text-status-waiting",
  progress: "text-status-progress",
  new: "text-status-new",
  completed: "text-status-completed",
  risk: "text-status-risk",
  scheduled: "text-status-scheduled",
  reviewed: "text-status-reviewed",
  signed: "text-status-signed",
};

const STATUS_DOT: Record<Status, string> = {
  urgent: "bg-status-urgent",
  today: "bg-status-today",
  waiting: "bg-status-waiting",
  progress: "bg-status-progress",
  new: "bg-status-new",
  completed: "bg-status-completed",
  risk: "bg-status-risk",
  scheduled: "bg-status-scheduled",
  reviewed: "bg-status-reviewed",
  signed: "bg-status-signed",
};

const STATUS_BAR: Record<Status, string> = STATUS_DOT;

const ON_NAVY_TEXT: Record<Status, string> = {
  urgent: "text-status-urgent-onnavy",
  today: "text-status-today-onnavy",
  waiting: "text-status-waiting-onnavy",
  progress: "text-status-progress-onnavy",
  new: "text-status-new-onnavy",
  completed: "text-status-completed-onnavy",
  risk: "text-status-risk-onnavy",
  scheduled: "text-status-scheduled-onnavy",
  reviewed: "text-status-reviewed-onnavy",
  signed: "text-status-signed-onnavy",
};

const ON_NAVY_DOT: Record<Status, string> = {
  urgent: "bg-status-urgent-onnavy",
  today: "bg-status-today-onnavy",
  waiting: "bg-status-waiting-onnavy",
  progress: "bg-status-progress-onnavy",
  new: "bg-status-new-onnavy",
  completed: "bg-status-completed-onnavy",
  risk: "bg-status-risk-onnavy",
  scheduled: "bg-status-scheduled-onnavy",
  reviewed: "bg-status-reviewed-onnavy",
  signed: "bg-status-signed-onnavy",
};

/** Written state: small dot + word. The default status treatment — not a chip. */
export function StatusText({
  status,
  children,
  surface = "light",
  className,
}: {
  status: Status;
  children: ReactNode;
  surface?: "light" | "navy";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex min-w-0 items-center gap-1.5 text-micro font-medium",
        surface === "navy" ? ON_NAVY_TEXT[status] : STATUS_TEXT[status],
        className,
      )}
    >
      <span
        aria-hidden
        className={cx(
          "h-1.5 w-1.5 shrink-0 rounded-pill",
          surface === "navy" ? ON_NAVY_DOT[status] : STATUS_DOT[status],
        )}
      />
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Tinted tag — for the few places a contained label truly wins. */
export function StatusTag({
  status,
  children,
}: {
  status: Status;
  children: ReactNode;
}) {
  const washes: Record<Status, string> = {
    urgent: "bg-status-urgent-wash",
    today: "bg-status-today-wash",
    waiting: "bg-status-waiting-wash",
    progress: "bg-status-progress-wash",
    new: "bg-status-new-wash",
    completed: "bg-status-completed-wash",
    risk: "bg-status-risk-wash",
    scheduled: "bg-status-scheduled-wash",
    reviewed: "bg-status-reviewed-wash",
    signed: "bg-status-signed-wash",
  };
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-xs px-2 py-0.5 text-micro font-medium",
        washes[status],
        STATUS_TEXT[status],
      )}
    >
      {children}
    </span>
  );
}

/** Thin start-edge state line for rows. */
export function StateLine({
  status,
  surface = "light",
}: {
  status: Status;
  surface?: "light" | "navy";
}) {
  return (
    <span
      aria-hidden
      className={cx(
        "absolute inset-y-3 start-0 w-0.5 rounded-pill",
        surface === "navy" ? ON_NAVY_DOT[status] : STATUS_BAR[status],
      )}
    />
  );
}

/** Compact progress — readiness, review progress, workload. */
export function MicroProgress({
  value,
  status = "progress",
  surface = "light",
  className,
  label,
  showValue = true,
}: {
  /** 0–1 */
  value: number;
  status?: Status;
  surface?: "light" | "navy";
  className?: string;
  label?: string;
  showValue?: boolean;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <span
      className={cx("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={label ? `${label}: ${pct}%` : `${pct}%`}
    >
      <span
        className={cx(
          "h-1 w-12 overflow-hidden rounded-pill",
          surface === "navy" ? "bg-paper-0/15" : "bg-surface-sunken",
        )}
      >
        <span
          className={cx(
            "block h-full rounded-pill",
            surface === "navy" ? ON_NAVY_DOT[status] : STATUS_DOT[status],
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
      {showValue ? (
        <span
          className={cx(
            "text-micro tabular-nums",
            surface === "navy" ? "text-ink-200" : "text-foreground-faint",
          )}
        >
          {pct}%
        </span>
      ) : null}
    </span>
  );
}

/** AI confidence — gold, always paired with a numeric value. */
export function ConfidenceBar({
  value,
  className,
}: {
  /** 0–100 */
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cx("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={`ביטחון ${value}%`}
    >
      <span className="text-micro tabular-nums text-foreground-soft">
        ביטחון {value}%
      </span>
      <span className="h-1 w-14 overflow-hidden rounded-pill bg-gold-200">
        <span
          className="block h-full rounded-pill bg-gold-600"
          style={{ width: `${value}%` }}
        />
      </span>
    </span>
  );
}

/**
 * The AI mark — עמית's small, consistent signature.
 * The ONLY sparkle in the product; never decorative.
 */
export function AIMark({
  surface = "light",
  className,
}: {
  surface?: "light" | "navy";
  className?: string;
}) {
  return (
    <SparkleGlyph
      size={11}
      aria-label="הוכן על ידי עמית"
      role="img"
      className={cx(
        "shrink-0",
        surface === "navy" ? "text-gold-400" : "text-gold-600",
        className,
      )}
    />
  );
}

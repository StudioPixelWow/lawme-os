import type { ReactNode } from "react";
import { cx } from "../utils/cx";

export type IconContainerVariant =
  | "neutral"
  | "navy"
  | "gold"
  | "urgent"
  | "warning"
  | "success"
  | "info"
  | "document"
  | "finance"
  | "ai"
  | "client"
  | "calendar";

export type IconContainerSize = "sm" | "md" | "lg";

/**
 * Per-variant material: background wash, icon ink, and (via the
 * shared classes below) an inner top highlight and hairline seat.
 * `surface="navy"` swaps to on-navy inks over translucent paper.
 */
const LIGHT: Record<IconContainerVariant, string> = {
  neutral: "bg-surface-sunken text-foreground-soft",
  navy: "bg-ink-900 text-paper-0",
  gold: "bg-gold-100 text-gold-700",
  urgent: "bg-status-urgent-wash text-status-urgent",
  warning: "bg-status-today-wash text-status-today",
  success: "bg-status-completed-wash text-status-completed",
  info: "bg-status-progress-wash text-status-progress",
  document: "bg-status-scheduled-wash text-status-scheduled",
  finance: "bg-status-reviewed-wash text-status-reviewed",
  ai: "bg-gold-100 text-gold-600",
  client: "bg-status-waiting-wash text-status-waiting",
  calendar: "bg-status-scheduled-wash text-status-scheduled",
};

const NAVY: Record<IconContainerVariant, string> = {
  neutral: "bg-paper-0/10 text-ink-100",
  navy: "bg-paper-0/10 text-paper-0",
  gold: "bg-gold-500/15 text-gold-400",
  urgent: "bg-status-urgent-onnavy/15 text-status-urgent-onnavy",
  warning: "bg-status-today-onnavy/15 text-status-today-onnavy",
  success: "bg-status-completed-onnavy/15 text-status-completed-onnavy",
  info: "bg-status-progress-onnavy/15 text-status-progress-onnavy",
  document: "bg-status-scheduled-onnavy/15 text-status-scheduled-onnavy",
  finance: "bg-status-reviewed-onnavy/15 text-status-reviewed-onnavy",
  ai: "bg-gold-500/15 text-gold-400",
  client: "bg-status-waiting-onnavy/15 text-status-waiting-onnavy",
  calendar: "bg-status-scheduled-onnavy/15 text-status-scheduled-onnavy",
};

const SIZES: Record<IconContainerSize, string> = {
  sm: "h-7 w-7 rounded-xs",
  md: "h-9 w-9 rounded-md",
  lg: "h-11 w-11 rounded-md",
};

/**
 * The premium icon seat: semantic material behind every meaningful
 * glyph. Inner top highlight + hairline seat; interactive seats
 * lift with a catch-light on group-hover.
 */
export function IconContainer({
  variant = "neutral",
  size = "md",
  surface = "light",
  interactive = false,
  className,
  children,
}: {
  variant?: IconContainerVariant;
  size?: IconContainerSize;
  surface?: "light" | "navy";
  /** lifts + brightens on parent `group` hover */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={cx(
        "flex shrink-0 items-center justify-center shadow-seat",
        SIZES[size],
        surface === "navy" ? NAVY[variant] : LIGHT[variant],
        interactive &&
          "transition-all group-hover:-translate-y-px group-hover:shadow-seat-hover",
        className,
      )}
      style={
        interactive ? { transitionDuration: "var(--motion-quick)" } : undefined
      }
    >
      {children}
    </span>
  );
}

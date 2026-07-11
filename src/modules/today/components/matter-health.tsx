import { AlertGlyph, DocumentGlyph, HourglassGlyph } from "@/design-system/icons/glyphs";
import { StatusText, type Status } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import type { Matter } from "../data";

const RING = { size: 52, stroke: 3.5, r: 22 };
const CIRC = 2 * Math.PI * RING.r;

const RING_STROKE: Record<string, string> = {
  completed: "stroke-status-completed text-status-completed",
  progress: "stroke-status-progress text-status-progress",
  today: "stroke-status-today text-status-today",
  urgent: "stroke-status-urgent text-status-urgent",
  waiting: "stroke-status-waiting text-status-waiting",
  risk: "stroke-status-risk text-status-risk",
  scheduled: "stroke-status-scheduled text-status-scheduled",
};

/**
 * טבעת המוכנות — the readiness ring at the heart of Matter Health.
 * Answers at a glance: "can I safely keep working on this matter?"
 */
export function HealthRing({
  value,
  status,
  surface = "light",
}: {
  /** 0–1 */
  value: number;
  status: Status;
  surface?: "light" | "navy";
}) {
  const pct = Math.round(value * 100);
  const dash = (value * CIRC).toFixed(1);
  return (
    <span
      role="img"
      aria-label={`מוכנות ${pct}%`}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: RING.size, height: RING.size }}
    >
      <svg
        width={RING.size}
        height={RING.size}
        viewBox={`0 0 ${RING.size} ${RING.size}`}
        fill="none"
        aria-hidden
      >
        <circle
          cx={RING.size / 2}
          cy={RING.size / 2}
          r={RING.r}
          strokeWidth={RING.stroke}
          className={surface === "navy" ? "stroke-paper-0/15" : "stroke-surface-sunken"}
        />
        <circle
          cx={RING.size / 2}
          cy={RING.size / 2}
          r={RING.r}
          strokeWidth={RING.stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC.toFixed(1)}`}
          transform={`rotate(-90 ${RING.size / 2} ${RING.size / 2})`}
          className={cx(RING_STROKE[status] ?? "stroke-status-progress")}
          style={{
            filter:
              "drop-shadow(0 0 5px color-mix(in srgb, currentColor 40%, transparent))",
          }}
        />
      </svg>
      <span className={cx("absolute text-micro font-semibold tabular-nums", surface === "navy" ? "text-paper-0" : "text-foreground")}>
        {pct}%
      </span>
    </span>
  );
}

/**
 * Matter Health — the signature operational read-out of a matter:
 * readiness ring + the facts that gate the work (missing documents,
 * who we're waiting on, risk).
 */
export function MatterHealth({ matter }: { matter: Matter }) {
  const ringStatus: Status =
    matter.progress >= 0.8
      ? "completed"
      : matter.status === "urgent"
        ? "urgent"
        : "progress";

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <HealthRing value={matter.progress} status={ringStatus} />
        <span className="text-micro text-foreground-faint">מוכנות</span>
      </div>
      <dl className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <DocumentGlyph size={12} className="shrink-0 text-foreground-faint" />
          {matter.missingDocs > 0 ? (
            <span className="flex items-center gap-2">
              <StatusText status="today">
                {matter.missingDocs} מסמכים חסרים
              </StatusText>
              <button
                type="button"
                className="rounded-xs text-micro font-medium text-foreground-soft transition-colors hover:text-gold-700"
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                בקש מהלקוח ←
              </button>
            </span>
          ) : (
            <StatusText status="completed">כל המסמכים בתיק</StatusText>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <HourglassGlyph size={12} className="shrink-0 text-foreground-faint" />
          {matter.waitingOn ? (
            <StatusText status={matter.waitingStatus}>
              ממתין: {matter.waitingOn}
            </StatusText>
          ) : (
            <StatusText status="completed">אין תלות חיצונית</StatusText>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <AlertGlyph size={12} className="shrink-0 text-foreground-faint" />
          <StatusText status={matter.riskStatus}>
            סיכון {matter.risk}
          </StatusText>
        </div>
      </dl>
    </div>
  );
}

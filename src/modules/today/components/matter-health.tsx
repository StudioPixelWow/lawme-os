import { AlertGlyph, DocumentGlyph, HourglassGlyph } from "@/design-system/icons/glyphs";
import { StatusText, type Status } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import type { Matter } from "../data";

const RING = { size: 52, stroke: 3.5, r: 22 };
const CIRC = 2 * Math.PI * RING.r;

const RING_STROKE: Record<string, string> = {
  completed: "stroke-status-completed",
  progress: "stroke-status-progress",
  today: "stroke-status-today",
  urgent: "stroke-status-urgent",
};

/**
 * טבעת המוכנות — the readiness ring at the heart of Matter Health.
 * Answers at a glance: "can I safely keep working on this matter?"
 */
export function HealthRing({
  value,
  status,
}: {
  /** 0–1 */
  value: number;
  status: Status;
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
          className="stroke-surface-sunken"
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
        />
      </svg>
      <span className="absolute text-micro font-semibold tabular-nums text-foreground">
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
            <StatusText status="today">
              {matter.missingDocs} מסמכים חסרים
            </StatusText>
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

import { HourglassGlyph } from "@/design-system/icons/glyphs";
import { AIMark } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import type { Matter } from "../data";
import { healthState, milestoneTrack } from "../focus";

/* Status → color classes for the signature (light surfaces). */
const STATE_TEXT: Record<string, string> = {
  urgent: "text-status-urgent",
  today: "text-status-today",
  waiting: "text-status-waiting",
  progress: "text-status-progress",
  completed: "text-status-completed",
  risk: "text-status-risk",
  scheduled: "text-status-scheduled",
};

const STATE_DOT: Record<string, string> = {
  urgent: "bg-status-urgent",
  today: "bg-status-today",
  waiting: "bg-status-waiting",
  progress: "bg-status-progress",
  completed: "bg-status-completed",
  risk: "bg-status-risk",
  scheduled: "bg-status-scheduled",
};

const STATE_WASH: Record<string, string> = {
  urgent: "bg-status-urgent-wash",
  today: "bg-status-today-wash",
  waiting: "bg-status-waiting-wash",
  progress: "bg-status-progress-wash",
  completed: "bg-status-completed-wash",
  risk: "bg-status-risk-wash",
  scheduled: "bg-status-scheduled-wash",
};

/**
 * The operational state chip — Matter Health's headline. Each state
 * has a distinct treatment; live risk states carry a breathing dot.
 */
export function HealthStateChip({
  matter,
  className,
}: {
  matter: Matter;
  className?: string;
}) {
  const state = healthState(matter);
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1 text-caption font-semibold",
        STATE_WASH[state.status],
        STATE_TEXT[state.status],
        className,
      )}
    >
      <span
        aria-hidden
        className={cx(
          "h-1.5 w-1.5 rounded-pill",
          STATE_DOT[state.status],
          state.pulse && "animate-breath",
        )}
      />
      {state.label}
    </span>
  );
}

/**
 * MatterSignature — the composite Matter Health visualization.
 * A procedural milestone track with the matter's live position,
 * missing-item markers, dependency + risk pulse, and דינו's touch.
 * Legible in under two seconds; specific to legal work — the track
 * IS the proceeding.
 */
export function MatterSignature({
  matter,
  compact = false,
  className,
}: {
  matter: Matter;
  compact?: boolean;
  className?: string;
}) {
  const track = milestoneTrack(matter);
  const state = healthState(matter);
  const pct = Math.round(matter.progress * 100);

  return (
    <div className={cx("min-w-0", className)}>
      {/* the milestone track — the proceeding itself */}
      <div
        role="img"
        aria-label={`שלב נוכחי: ${track.steps[track.current]} · מוכנות ${pct}%`}
        className="flex items-center"
      >
        {track.steps.map((step, i) => {
          const done = i < track.current;
          const current = i === track.current;
          return (
            <div
              key={step}
              className={cx("flex items-center", i > 0 && "min-w-0 flex-1")}
            >
              {i > 0 ? (
                <span
                  aria-hidden
                  className={cx(
                    "h-px min-w-3 flex-1",
                    done || current
                      ? "bg-ink-700/70"
                      : "border-t border-dashed border-line",
                  )}
                />
              ) : null}
              <span
                aria-hidden
                className={cx(
                  "relative mx-1 flex shrink-0 items-center justify-center rounded-pill",
                  current
                    ? "h-3.5 w-3.5 bg-gold-500 shadow-gold-breath"
                    : done
                      ? "h-2 w-2 bg-ink-700"
                      : "h-2 w-2 border border-line-strong bg-surface-raised",
                )}
              >
                {current ? (
                  <span className="h-1.5 w-1.5 rounded-pill bg-ink-950/80" />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      {/* step labels — full variant only */}
      {!compact ? (
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          {track.steps.map((step, i) => (
            <span
              key={step}
              className={cx(
                "truncate text-micro",
                i === track.current
                  ? "font-semibold text-foreground"
                  : "text-foreground-faint",
              )}
            >
              {step}
            </span>
          ))}
        </div>
      ) : null}

      {/* the gating facts — markers, not sentences */}
      {!compact ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-micro">
          <span className="font-medium tabular-nums text-foreground-soft">
            מוכנות {pct}%
          </span>
          {matter.missingDocs > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-status-today">
              <span aria-hidden className="flex gap-0.5">
                {Array.from({ length: matter.missingDocs }, (_, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rotate-45 border border-status-today"
                  />
                ))}
              </span>
              {matter.missingDocs} חסרים
            </span>
          ) : null}
          {matter.waitingOn ? (
            <span
              className={cx(
                "inline-flex min-w-0 items-center gap-1 font-medium",
                STATE_TEXT[matter.waitingStatus],
              )}
            >
              <HourglassGlyph size={11} className="shrink-0" />
              <span className="truncate">{matter.waitingOn}</span>
            </span>
          ) : null}
          {state.pulse ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-status-urgent">
              <span
                aria-hidden
                className="animate-breath h-1.5 w-1.5 rounded-pill bg-status-urgent"
              />
              {matter.nextEvent}
            </span>
          ) : null}
          {matter.aiNote ? <AIMark /> : null}
        </div>
      ) : null}
    </div>
  );
}

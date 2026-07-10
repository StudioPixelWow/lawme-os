"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  AlertGlyph,
  CheckGlyph,
  ClockGlyph,
  CourtGlyph,
  PhoneGlyph,
  UsersGlyph,
} from "@/design-system/icons/glyphs";
import { ICON } from "@/design-system/icons/tokens";
import { AIMark } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import {
  HERO_FOCUS,
  HERO_MODES,
  HERO_ACTIVE_MODE,
  TIMELINE_EVENTS,
  type TimelineEvent,
} from "../data";
import { matterForEvent } from "../focus";
import { HealthRing } from "./matter-health";

function kindGlyph(kind: TimelineEvent["kind"], size: number): ReactNode {
  switch (kind) {
    case "hearing":
      return <CourtGlyph size={size} />;
    case "call":
      return <PhoneGlyph size={size} />;
    case "deadline":
      return <ClockGlyph size={size} />;
    case "meeting":
      return <UsersGlyph size={size} />;
    default:
      return <CheckGlyph size={size} />;
  }
}

/** The compact schedule — the day's spine inside the briefing. */
function CompactTimeline({
  focusedId,
  onSelect,
}: {
  focusedId: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const upcoming = TIMELINE_EVENTS.filter((e) => e.status !== "done");
  const events = expanded ? TIMELINE_EVENTS : upcoming.slice(0, 3);

  return (
    <div>
      <p className="text-micro font-semibold tracking-wide text-ink-300">
        השלב הבא בלוח הזמנים
      </p>
      <ol className="relative mt-2.5 flex flex-col gap-1">
        {/* the vertical meridian */}
        <span
          aria-hidden
          className="absolute inset-y-2 start-[0.4375rem] w-px bg-paper-0/15"
        />
        {events.map((event) => {
          const active = event.id === focusedId;
          const done = event.status === "done";
          return (
            <li key={event.id} className="relative">
              <button
                type="button"
                onClick={() => onSelect(event.id)}
                aria-pressed={active}
                data-live={active || undefined}
                className={cx(
                  "living-edge relative flex w-full items-center gap-2.5 rounded-md py-1.5 ps-0 pe-2 text-start transition-colors",
                  active ? "glass-navy" : "hover:bg-paper-0/5",
                  done && !active && "opacity-50",
                )}
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                <span
                  aria-hidden
                  className={cx(
                    "z-1 ms-0.5 flex h-2.5 w-2.5 shrink-0 rounded-pill",
                    active
                      ? "bg-gold-400 shadow-gold-breath"
                      : done
                        ? "bg-ink-500"
                        : "border border-paper-0/30 bg-ink-900",
                  )}
                />
                <time
                  className={cx(
                    "shrink-0 text-caption font-semibold tabular-nums",
                    active ? "text-gold-300" : "text-ink-200",
                  )}
                >
                  {event.time}
                </time>
                <span
                  className={cx(
                    "min-w-0 flex-1 truncate text-caption",
                    active ? "font-semibold text-paper-0" : "text-ink-100",
                  )}
                >
                  {event.title}
                </span>
                <span className="shrink-0 text-ink-300">
                  {kindGlyph(event.kind, ICON.metadata)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-2 rounded-xs text-micro font-medium text-ink-200 transition-colors hover:text-paper-0"
        style={{ transitionDuration: "var(--motion-quick)" }}
      >
        {expanded ? "צמצם את היום ↑" : "צפה בלוח הזמנים המלא ←"}
      </button>
    </div>
  );
}

/**
 * Today Focus — the premium operational briefing and the screen's
 * single hero object. Deep layered navy, champagne edge light, one
 * mission, one countdown, one readiness, one missing requirement,
 * one דינו insight, one action. The compact timeline is the scene's
 * second column; selecting an event re-aims the briefing.
 */
export function TodayFocus({
  dateLine,
  focusedEvent,
  onSelectEvent,
  isDefault,
}: {
  dateLine: ReactNode;
  focusedEvent: TimelineEvent;
  onSelectEvent: (id: string) => void;
  isDefault: boolean;
}) {
  const mode = HERO_MODES[HERO_ACTIVE_MODE];
  const matter = matterForEvent(focusedEvent.id);
  const hearing = focusedEvent.id === "ev-3";
  const readiness = hearing ? HERO_FOCUS.readiness : (focusedEvent.prep ?? 0.5);

  return (
    <section aria-label="מוקד היום">
      {/* one quiet line above the briefing */}
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
        <p className="text-small font-medium text-foreground">בוקר טוב, דניאל</p>
        <span aria-hidden className="hidden h-3 w-px self-center bg-line-strong sm:block" />
        <p className="text-caption text-foreground-faint">{dateLine}</p>
        <span aria-hidden className="hidden h-3 w-px self-center bg-line-strong sm:block" />
        <p className="text-caption font-medium text-gold-700">{mode.signature}</p>
      </div>

      <div className="context-halo">
        <article
          className="surface-hero-dark relative overflow-hidden rounded-xl"
          data-live="true"
        >
          {/* the gold meridian enters the briefing */}
          <span
            aria-hidden
            className="absolute inset-y-8 start-0 z-1 w-0.5 rounded-pill bg-gold-500/80"
          />

          <div className="grid grid-cols-1 gap-x-10 gap-y-7 p-6 md:p-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
            {/* ── the mission ── */}
            <div className="min-w-0">
              <p className="text-micro font-semibold tracking-wide text-gold-300">
                {mode.missionLabel}
              </p>
              <h1 className="mt-2 text-title font-semibold tracking-tight text-balance text-paper-0">
                {hearing ? HERO_FOCUS.title : focusedEvent.title}
              </h1>

              {/* the countdown */}
              <p className="mt-3 flex items-center gap-2.5">
                <span className="text-gold-400">
                  {kindGlyph(focusedEvent.kind, ICON.section)}
                </span>
                <span className="text-heading leading-none font-bold tracking-tight text-gold-300">
                  {hearing ? HERO_FOCUS.countdown : `ב־${focusedEvent.time}`}
                </span>
              </p>

              <p className="mt-3 text-small text-ink-200">
                {hearing ? (
                  <>
                    <time className="font-medium tabular-nums text-paper-0">
                      {HERO_FOCUS.time}
                    </time>
                    {" · "}
                    {HERO_FOCUS.location}
                  </>
                ) : (
                  focusedEvent.location
                )}
              </p>

              {/* the one missing requirement */}
              {hearing || (matter && matter.missingDocs > 0) ? (
                <p className="mt-4 flex items-center gap-2 text-small text-ink-100">
                  <AlertGlyph
                    size={ICON.inline}
                    className="shrink-0 text-status-today-onnavy"
                  />
                  נדרש: {hearing ? "2 נספחים לכתב התשובה" : `${matter?.missingDocs} מסמכים חסרים`}
                  <button
                    type="button"
                    className="shrink-0 rounded-xs text-caption font-medium text-gold-300 transition-colors hover:text-gold-200"
                    style={{ transitionDuration: "var(--motion-quick)" }}
                  >
                    בקש מהלקוח ←
                  </button>
                </p>
              ) : null}

              {/* one action + one contextual door */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link
                  href="/matters"
                  className="inline-flex h-11 items-center rounded-md border border-gold-400/70 px-7 text-small font-semibold text-gold-200 shadow-gold-glow transition-all hover:-translate-y-px hover:border-gold-300 hover:bg-gold-500/10"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  {hearing ? mode.cta : "פתח הכנה"}
                </Link>
                <button
                  type="button"
                  className="rounded-xs text-small font-medium text-ink-100 transition-colors hover:text-paper-0"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  פתח את כל ההכנה ›
                </button>
                {!isDefault ? (
                  <span className="text-micro text-ink-300">
                    Esc — חזרה למיקוד היום
                  </span>
                ) : null}
              </div>
            </div>

            {/* ── readiness + the day's spine ── */}
            <div className="flex min-w-0 flex-col gap-5 lg:border-s lg:border-paper-0/10 lg:ps-8">
              <div className="flex items-center gap-4">
                <HealthRing
                  value={readiness}
                  status={readiness >= 0.8 ? "completed" : "progress"}
                  surface="navy"
                />
                <div>
                  <p className="text-small font-semibold text-paper-0">מוכנות</p>
                  <p className="text-micro text-ink-200">
                    {hearing
                      ? `${HERO_FOCUS.documents.length} מסמכים מוכנים · צוות ${HERO_FOCUS.team.join(" · ")}`
                      : (matter?.stage ?? "")}
                  </p>
                </div>
              </div>
              <CompactTimeline focusedId={focusedEvent.id} onSelect={onSelectEvent} />
            </div>
          </div>

          {/* ── the דינו band — one insight, one door ── */}
          <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-paper-0/10 bg-ink-950/45 px-6 py-3.5 md:px-8">
            <p className="flex min-w-0 flex-1 items-center gap-2 text-caption text-ink-100">
              <AIMark surface="navy" className="shrink-0" />
              <span className="min-w-0 truncate">
                <span className="font-semibold text-paper-0">דינו: </span>
                {hearing
                  ? "פסיקה חדשה — ע״א 4881/25 — עשויה לחזק את טענת ההתיישנות בדיון היום."
                  : (matter?.aiNote ?? mode.aiLine)}
              </span>
            </p>
            <button
              type="button"
              className="shrink-0 rounded-xs text-caption font-semibold text-gold-300 transition-colors hover:text-gold-200"
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              ראה פרטים ←
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
